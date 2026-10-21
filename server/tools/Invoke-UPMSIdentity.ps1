param(
  [ValidateSet('Owner','Migrator','Runtime','TestOwner','TestRuntime')][string]$Profile = 'Owner',
  [ValidateSet('Inspect','ProvisionAccounts','Migrate','GrantRuntime','ProvisionTest','Bootstrap','RuntimeCheck','Verify','Serve','AutoSetup','VerifyRotation')][string]$Action = 'Inspect',
  [switch]$ApprovePlan,
  [switch]$ApproveForwardPlan,
  [string]$CheckpointFile,
  [string]$CheckpointSha
)
$ErrorActionPreference = 'Stop'
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$privateRoot = Join-Path $repositoryRoot 'server/.local/p21a'
$connection = Get-Content -LiteralPath (Join-Path $privateRoot "$($Profile.ToLowerInvariant()).connection.json") -Raw | ConvertFrom-Json
$credential = Import-Clixml -LiteralPath (Join-Path $privateRoot "$($Profile.ToLowerInvariant()).credential.clixml")
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) { $nodeCommand.Source } else { Join-Path $repositoryRoot 'tmp/w05/runtime/node_modules/node/bin/node.exe' }
if ((Test-Path -LiteralPath $nodePath) -and ((& $nodePath --version) -notmatch '^v24\.')) {
  $nodePath = Join-Path $repositoryRoot 'tmp/w05/runtime/node_modules/node/bin/node.exe'
}
if (-not (Test-Path -LiteralPath $nodePath)) { throw 'Install/use Node 24 first.' }
if ((& $nodePath --version) -notmatch '^v24\.') { throw 'Node 24 required; put it first on PATH.' }
$names = @('DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASSWORD','DB_CONFIRM_NAME','DB_ALLOW_MARIADB_COMPATIBILITY','NODE_ENV','IDENTITY_DB_PURPOSE',
  'UPMS_APPROVED_PLAN','UPMS_APPROVED_FORWARD_PLAN','UPMS_CHECKPOINT_FILE','UPMS_CHECKPOINT_SHA','UPMS_NEW_MIGRATOR_PASSWORD','UPMS_NEW_RUNTIME_PASSWORD',
  'UPMS_TEST_DATABASE','UPMS_TEST_RUNTIME_USER','UPMS_TEST_RUNTIME_PASSWORD','UPMS_TEST_OWNER_USER','UPMS_TEST_OWNER_PASSWORD','SESSION_SECRET')
$saved = @{}
foreach ($name in $names) { $saved[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
$buffer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($credential.Password)
$extraBuffers = [Collections.Generic.List[IntPtr]]::new()
function Set-PrivatePassword([string]$profileName, [string]$variableName) {
  $savedCredential = Import-Clixml -LiteralPath (Join-Path $privateRoot "$profileName.credential.clixml")
  $savedConnection = Get-Content -LiteralPath (Join-Path $privateRoot "$profileName.connection.json") -Raw | ConvertFrom-Json
  if ($savedConnection.host -ne $connection.host -or $savedConnection.port -ne $connection.port) { throw 'Private profile endpoints differ.' }
  $privateBuffer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($savedCredential.Password)
  $extraBuffers.Add($privateBuffer)
  [Environment]::SetEnvironmentVariable($variableName,[Runtime.InteropServices.Marshal]::PtrToStringBSTR($privateBuffer),'Process')
  return @{ credential = $savedCredential; connection = $savedConnection }
}
Push-Location -LiteralPath $repositoryRoot
try {
  $env:DB_HOST = $connection.host; $env:DB_PORT = [string]$connection.port; $env:DB_NAME = $connection.database
  $env:DB_USER = $credential.UserName; $env:DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($buffer)
  $env:DB_CONFIRM_NAME = $env:DB_NAME; $env:DB_ALLOW_MARIADB_COMPATIBILITY = 'true'; $env:NODE_ENV = 'development'
  $env:UPMS_APPROVED_PLAN = if ($ApprovePlan) { 'P2.1A-local-identity' } else { '' }
  $env:UPMS_APPROVED_FORWARD_PLAN = if ($ApproveForwardPlan) { 'P2.1A-preserve-reviewed-wildcards' } else { '' }
  $env:UPMS_CHECKPOINT_FILE = $CheckpointFile; $env:UPMS_CHECKPOINT_SHA = $CheckpointSha
  $env:IDENTITY_DB_PURPOSE = if ($Profile -in @('Runtime','TestRuntime')) { 'runtime' } else { 'operator' }
  if ($Action -in @('ProvisionAccounts','GrantRuntime','ProvisionTest') -and $Profile -ne 'Owner') { throw 'Provisioning requires the authorized owner operator profile.' }
  if ($Action -eq 'Migrate' -and $Profile -ne 'Migrator') { throw 'Use the dedicated Migrator profile.' }
  if ($Action -in @('Bootstrap','Serve','RuntimeCheck','AutoSetup') -and $Profile -ne 'Runtime') { throw 'Use the verified dedicated Runtime profile.' }
  if ($Profile -eq 'Runtime') {
    foreach ($name in @('UPMS_TEST_OWNER_PASSWORD','UPMS_TEST_OWNER_USER','UPMS_NEW_MIGRATOR_PASSWORD','UPMS_NEW_RUNTIME_PASSWORD')) { [Environment]::SetEnvironmentVariable($name,$null,'Process') }
  }
  if ($Action -eq 'ProvisionAccounts') {
    $migratorProfile = Set-PrivatePassword 'migrator' 'UPMS_NEW_MIGRATOR_PASSWORD'
    $runtimeProfile = Set-PrivatePassword 'runtime' 'UPMS_NEW_RUNTIME_PASSWORD'
    if ($migratorProfile.credential.UserName -ne 'upms_migrator' -or $runtimeProfile.credential.UserName -ne 'upms_runtime') { throw 'Dedicated profile usernames differ from the reviewed plan.' }
  }
  if ($Action -eq 'ProvisionTest') {
    $testProfile = Set-PrivatePassword 'testruntime' 'UPMS_TEST_RUNTIME_PASSWORD'
    $env:UPMS_TEST_DATABASE = $testProfile.connection.database; $env:UPMS_TEST_RUNTIME_USER = $testProfile.credential.UserName
  }
  if ($Action -eq 'Verify') {
    if ($Profile -ne 'TestRuntime') { throw 'Acceptance tests require the dedicated TestRuntime profile.' }
    $ownerProfile = Set-PrivatePassword 'owner' 'UPMS_TEST_OWNER_PASSWORD'
    $env:UPMS_TEST_OWNER_USER = $ownerProfile.credential.UserName
    $env:UPMS_TEST_RUNTIME_USER = $env:DB_USER; $env:UPMS_TEST_RUNTIME_PASSWORD = $env:DB_PASSWORD
  }
  if ($Action -eq 'Serve') {
    $sessionPath = Join-Path $privateRoot 'session-secret.clixml'
    if (-not (Test-Path -LiteralPath $sessionPath)) {
      $bytes = New-Object byte[] 48
      $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
      try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
      ConvertTo-SecureString ([Convert]::ToBase64String($bytes)) -AsPlainText -Force | Export-Clixml -LiteralPath $sessionPath
      [Array]::Clear($bytes,0,$bytes.Length)
    }
    $sessionValue = Import-Clixml -LiteralPath $sessionPath
    $sessionBuffer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sessionValue)
    $extraBuffers.Add($sessionBuffer)
    $env:SESSION_SECRET = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($sessionBuffer)
  }
  if ($Action -eq 'Bootstrap') { & $nodePath server/tools/identity.mjs bootstrap }
  elseif ($Action -eq 'VerifyRotation') {
    if ($Profile -ne 'TestRuntime') { throw 'Rotation checks require the dedicated synthetic runtime.' }
    & $nodePath server/tests/verify-first-login-rotation.mjs
  }
  elseif ($Action -eq 'AutoSetup') { & $nodePath server/tools/automated-local-setup.mjs }
  elseif ($Action -eq 'Verify') { & $nodePath server/tests/verify-mariadb-acceptance.mjs }
  elseif ($Action -eq 'Serve') { & $nodePath server/tools/local-management.mjs }
  else { & $nodePath server/tools/mariadb-acceptance.mjs $Action.ToLowerInvariant() }
  if ($LASTEXITCODE -ne 0) { throw 'Operator command failed; no secret or SQL diagnostics are printed.' }
} finally {
  Pop-Location
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($buffer)
  foreach ($privateBuffer in $extraBuffers) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($privateBuffer) }
  foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $saved[$name], 'Process') }
}
