param([ValidateSet('Owner','Migrator','Runtime','TestOwner','TestRuntime')][string]$Profile = 'Owner')
$ErrorActionPreference = 'Stop'
if ($env:OS -ne 'Windows_NT') { throw 'Windows DPAPI is required.' }
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$privateRoot = Join-Path $repositoryRoot 'server/.local/p21a'
if (-not (Test-Path -LiteralPath $privateRoot)) {
  New-Item -ItemType Directory -Path $privateRoot | Out-Null
  $acl = Get-Acl -LiteralPath $privateRoot
  $acl.SetAccessRuleProtection($true, $false)
  foreach ($sid in @([Security.Principal.WindowsIdentity]::GetCurrent().User, [Security.Principal.SecurityIdentifier]::new('S-1-5-18'))) {
    $rule = [Security.AccessControl.FileSystemAccessRule]::new($sid, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
    $acl.AddAccessRule($rule)
  }
  Set-Acl -LiteralPath $privateRoot -AclObject $acl
}
if ((Get-Item -LiteralPath $privateRoot).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Private folder cannot be a link.' }
$credentialPath = Join-Path $privateRoot "$($Profile.ToLowerInvariant()).credential.clixml"
$connectionPath = Join-Path $privateRoot "$($Profile.ToLowerInvariant()).connection.json"
if ((Test-Path -LiteralPath $credentialPath) -or (Test-Path -LiteralPath $connectionPath)) { throw 'Profile exists; refusing to overwrite it.' }
$ownerConnection = Join-Path $privateRoot 'owner.connection.json'
$knownConnection = if ($Profile -ne 'Owner' -and (Test-Path -LiteralPath $ownerConnection)) { Get-Content -LiteralPath $ownerConnection -Raw | ConvertFrom-Json } else { $null }
$hostName = if ($knownConnection) { $knownConnection.host } else { Read-Host 'Confirmed local database host (127.0.0.1, localhost or ::1)' }
if ($hostName -notin @('127.0.0.1','localhost','::1')) { throw 'Only explicit loopback hosts are allowed.' }
$portText = if ($knownConnection) { [string]$knownConnection.port } else { Read-Host 'Confirmed database TCP port' }
$portNumber = 0
if (-not [int]::TryParse($portText, [ref]$portNumber) -or $portNumber -lt 1 -or $portNumber -gt 65535) { throw 'Invalid explicit port.' }
$databaseName = 'upms'
if ($Profile -in @('TestOwner','TestRuntime')) {
  $databaseName = Read-Host 'Newly approved dedicated test schema (upms_test_<suffix>)'
  if ($databaseName -notmatch '^upms_test_[a-z0-9_]+$') { throw 'Invalid test schema name.' }
}
$userName = Read-Host 'Database account username (existing Owner account; owner-chosen dedicated account otherwise)'
if (-not $userName) { throw 'Explicit username required.' }
if (($Profile -eq 'Migrator' -and $userName -cne 'upms_migrator') -or ($Profile -eq 'Runtime' -and $userName -cne 'upms_runtime')) { throw 'Use the reviewed dedicated account name with exact case.' }
$password = Read-Host 'Database password (hidden; never send through chat)' -AsSecureString
if ($Profile -in @('Migrator','Runtime','TestRuntime')) {
  if ($password.Length -lt 16) { throw 'Choose a private dedicated-account password of at least 16 characters.' }
  $confirmation = Read-Host 'Repeat database password (hidden)' -AsSecureString
  $firstBuffer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
  $secondBuffer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirmation)
  try {
    if ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($firstBuffer) -cne [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secondBuffer)) { throw 'Passwords do not match.' }
  } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($firstBuffer); [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secondBuffer) }
}
if ($password.Length -eq 0) { throw 'This helper does not permit a blank credential.' }
[Management.Automation.PSCredential]::new($userName, $password) | Export-Clixml -LiteralPath $credentialPath
@{ host = $hostName; port = $portNumber; database = $databaseName } | ConvertTo-Json | Set-Content -LiteralPath $connectionPath -Encoding utf8
Write-Output "Saved $Profile as a current-Windows-user DPAPI profile in the ignored private folder. No database mutation performed."
