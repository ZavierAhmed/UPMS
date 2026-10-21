param([ValidateSet('Backup','Migrate','GrantRuntime','ProvisionTest','ProvisionIdentity','Test','TestIdentity','Inspect')][string]$Action,[switch]$ApprovePlan)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$private=Join-Path $root 'server/.local/p22'
if(-not(Test-Path -LiteralPath $private)){
  New-Item -ItemType Directory -Path $private | Out-Null
  $acl=Get-Acl -LiteralPath $private;$acl.SetAccessRuleProtection($true,$false)
  foreach($sid in @([Security.Principal.WindowsIdentity]::GetCurrent().User,[Security.Principal.SecurityIdentifier]::new('S-1-5-18'))){$acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow'))}
  Set-Acl -LiteralPath $private -AclObject $acl
}
if((Get-Item -LiteralPath $private).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Private directory cannot be a link.'}
$profile=if($Action -eq 'Migrate'){'migrator'}elseif($Action -in @('Inspect','Test','TestIdentity')){'runtime'}else{'owner'}
$profileRoot=Join-Path $root 'server/.local/p21a'
$connection=Get-Content -LiteralPath (Join-Path $profileRoot "$profile.connection.json") -Raw | ConvertFrom-Json
$credential=Import-Clixml -LiteralPath (Join-Path $profileRoot "$profile.credential.clixml")
$names=@('DB_HOST','DB_PORT','DB_NAME','DB_CONFIRM_NAME','DB_USER','DB_PASSWORD','DB_ALLOW_MARIADB_COMPATIBILITY','NODE_ENV','IDENTITY_DB_PURPOSE','UPMS_P22_APPROVED','UPMS_P22_TEST_PASSWORD','UPMS_P22_OWNER_USER','UPMS_P22_OWNER_PASSWORD','UPMS_P22_PREMIGRATED','UPMS_TEST_OWNER_USER','UPMS_TEST_OWNER_PASSWORD')
$saved=@{};foreach($name in $names){$saved[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
$buffers=[Collections.Generic.List[IntPtr]]::new()
function PrivateValue($secure){$buffer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure);$buffers.Add($buffer);return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($buffer)}
Push-Location -LiteralPath $root
try{
  $env:DB_HOST=$connection.host;$env:DB_PORT=[string]$connection.port;$env:DB_NAME='upms';$env:DB_CONFIRM_NAME='upms';$env:DB_USER=$credential.UserName;$env:DB_PASSWORD=PrivateValue $credential.Password
  $env:NODE_ENV='development';$env:DB_ALLOW_MARIADB_COMPATIBILITY='true';$env:IDENTITY_DB_PURPOSE=if($profile -eq 'runtime'){'runtime'}else{'operator'}
  $env:UPMS_P22_APPROVED=if($ApprovePlan){'P2.2-additive-reviewed'}else{''}
  if($Action -in @('ProvisionTest','ProvisionIdentity')){
    $path=Join-Path $private $(if($Action -eq 'ProvisionIdentity'){'identity-runtime.credential.clixml'}else{'test-runtime.credential.clixml'})
    if(Test-Path -LiteralPath $path){throw 'Dedicated test profile exists; preserve state and inspect before any repeat.'}
    $bytes=[byte[]]::new(36);[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    $secret=ConvertTo-SecureString ([Convert]::ToBase64String($bytes)) -AsPlainText -Force;[Array]::Clear($bytes,0,$bytes.Length)
    [PSCredential]::new($(if($Action -eq 'ProvisionIdentity'){'upms_runtime_test_p22_identity'}else{'upms_runtime_test_p22'}),$secret) | Export-Clixml -LiteralPath $path -NoClobber
    $env:UPMS_P22_TEST_PASSWORD=PrivateValue $secret
  }
  if($Action -in @('Test','TestIdentity')){
    $test=Import-Clixml -LiteralPath (Join-Path $private $(if($Action -eq 'TestIdentity'){'identity-runtime.credential.clixml'}else{'test-runtime.credential.clixml'}))
    $owner=Import-Clixml -LiteralPath (Join-Path $profileRoot 'owner.credential.clixml')
    $env:DB_NAME=if($Action -eq 'TestIdentity'){'upms_test_p22_identity_20261021'}else{'upms_test_p22_20261021'};$env:DB_CONFIRM_NAME=$env:DB_NAME;$env:DB_USER=$test.UserName;$env:DB_PASSWORD=PrivateValue $test.Password
    $env:UPMS_P22_OWNER_USER=$owner.UserName;$env:UPMS_P22_OWNER_PASSWORD=PrivateValue $owner.Password
  }
  $node=Join-Path $root 'tmp/w05/runtime/node_modules/node/bin/node.exe'
  if($Action -eq 'Test'){& $node --test server/tests/mysql/business.integration.js}
  elseif($Action -eq 'TestIdentity'){
    $env:UPMS_P22_PREMIGRATED='true';$env:UPMS_TEST_OWNER_USER=$env:UPMS_P22_OWNER_USER;$env:UPMS_TEST_OWNER_PASSWORD=$env:UPMS_P22_OWNER_PASSWORD
    $output=& $node --test server/tests/mysql/identity.integration.js 2>&1
    $exitCode=$LASTEXITCODE;$text=$output -join "`n"
    $log='tmp/w06/p22/identity-top-level-'+[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfff')+'.log';$text | Set-Content -LiteralPath $log
    if($exitCode -ne 0 -or $text -notmatch 'tests 17' -or $text -notmatch 'pass 17'){throw 'Actual seventeen-check identity execution did not pass; inspect private synthetic log.'}
    @{passed=$true;checks=17;database=$env:DB_NAME;log=$log;topLevel=$true} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $private 'identity-regression.json')
    Write-Output 'Top-level MariaDB identity regression: 17 checks passed.'
  }
  else{& $node server/tools/business-operations.mjs $Action.ToLowerInvariant()}
  if($LASTEXITCODE -ne 0){throw 'P2.2 operation stopped. Private state is preserved; no reset or secret diagnostics.'}
}finally{
  Pop-Location
  foreach($buffer in $buffers){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($buffer)}
  foreach($name in $names){[Environment]::SetEnvironmentVariable($name,$saved[$name],'Process')}
}
