param([ValidateSet('Backup','VerifyRestore','Migrate','GrantRuntime','Inspect','Provision','Test','Regression')][string]$Action,[ValidateSet('Inventory','Regression')][string]$Scope='Inventory',[ValidateSet('01','02','03','04','05','06')][string]$RunId='01',[switch]$ApprovePlan,[switch]$RecoveredEndpoint,[switch]$SupplementalRegressionApproval)
$ErrorActionPreference='Stop'
if($Scope -eq 'Regression' -and $RunId -notin @('01','02') -and -not ($RunId -eq '03' -and $RecoveredEndpoint -and $SupplementalRegressionApproval)){throw 'Fresh regression run 03 requires the explicit supplemental plan approval.'}
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'));$private=Join-Path $root $(if($RecoveredEndpoint){'server/.local/p23b/resumption'}else{'server/.local/p23'});$profiles=Join-Path $root 'server/.local/p21a'
if(-not(Test-Path -LiteralPath $private)){
  New-Item -ItemType Directory -Path $private | Out-Null;$acl=Get-Acl -LiteralPath $private;$acl.SetAccessRuleProtection($true,$false)
  foreach($sid in @([Security.Principal.WindowsIdentity]::GetCurrent().User,[Security.Principal.SecurityIdentifier]::new('S-1-5-18'))){$acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow'))};Set-Acl -LiteralPath $private -AclObject $acl
}
if((Get-Item -LiteralPath $private).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Private directory cannot be a link.'}
$profile=if($Action -eq 'Migrate'){'migrator'}elseif($Action -in @('Test','Regression','Inspect')){'runtime'}else{'owner'}
$connection=Get-Content -LiteralPath (Join-Path $profiles "$profile.connection.json") -Raw | ConvertFrom-Json;$credential=Import-Clixml -LiteralPath (Join-Path $profiles "$profile.credential.clixml")
$testName=if($Scope -eq 'Regression'){"upms_test_p23_regression_20261022_$RunId"}else{"upms_test_p23_20261022_$RunId"}
$testUser=if($Scope -eq 'Regression'){"upms_runtime_test_p23r$RunId"}else{"upms_runtime_test_p23_$RunId"}
$testPath=Join-Path $private "$($Scope.ToLowerInvariant())-$RunId.credential.clixml"
$names=@('DB_HOST','DB_PORT','DB_NAME','DB_CONFIRM_NAME','DB_USER','DB_PASSWORD','DB_ALLOW_MARIADB_COMPATIBILITY','NODE_ENV','IDENTITY_DB_PURPOSE','UPMS_P23_APPROVED','UPMS_P23_SCHEMA','UPMS_P23_USER','UPMS_P23_PASSWORD','UPMS_P23_SCOPE','UPMS_P23_RUN','UPMS_P23_OWNER_USER','UPMS_P23_OWNER_PASSWORD','UPMS_P23_STAGE','UPMS_P22_PREMIGRATED','UPMS_TEST_OWNER_USER','UPMS_TEST_OWNER_PASSWORD','UPMS_P22_OWNER_USER','UPMS_P22_OWNER_PASSWORD','UPMS_P23_RECOVERED','UPMS_P23_SUPPLEMENTAL')
$saved=@{};foreach($name in $names){$saved[$name]=[Environment]::GetEnvironmentVariable($name,'Process')};$buffers=[Collections.Generic.List[IntPtr]]::new()
function Secret($secure){$buffer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure);$buffers.Add($buffer);return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($buffer)}
Push-Location -LiteralPath $root
try{
  $env:DB_HOST=$connection.host;$env:DB_PORT=[string]$connection.port;$env:DB_NAME='upms';$env:DB_CONFIRM_NAME='upms';$env:DB_USER=$credential.UserName;$env:DB_PASSWORD=Secret $credential.Password;$env:DB_ALLOW_MARIADB_COMPATIBILITY='true';$env:NODE_ENV='development';$env:IDENTITY_DB_PURPOSE=if($profile -eq 'runtime'){'runtime'}else{'operator'}
  $env:UPMS_P23_APPROVED=if($ApprovePlan){'P2.3-reviewed-additive'}else{''};$env:UPMS_P23_SCHEMA=$testName;$env:UPMS_P23_USER=$testUser;$env:UPMS_P23_SCOPE=$Scope;$env:UPMS_P23_RUN=$RunId
  $env:UPMS_P23_SUPPLEMENTAL=if($SupplementalRegressionApproval){'reviewed-fresh-regression-03'}else{''}
  $env:UPMS_P23_RECOVERED=if($RecoveredEndpoint){'true'}else{''};if($RecoveredEndpoint -and $connection.port -ne 3309){throw 'Recovered endpoint must be port 3309.'}
  if($Action -eq 'Provision'){
    if(-not $ApprovePlan){throw 'Explicit provisioning approval required.'};if(Test-Path -LiteralPath $testPath){throw 'Existing profile/run will not be reused.'}
    $bytes=[byte[]]::new(36);[Security.Cryptography.RandomNumberGenerator]::Fill($bytes);$secret=ConvertTo-SecureString ([Convert]::ToBase64String($bytes)) -AsPlainText -Force;[Array]::Clear($bytes,0,$bytes.Length)
    [PSCredential]::new($testUser,$secret)|Export-Clixml -LiteralPath $testPath -NoClobber;$env:UPMS_P23_PASSWORD=Secret $secret
  }
  $node=Join-Path $root 'tmp/w05/runtime/node_modules/node/bin/node.exe'
  if($Action -in @('Test','Regression')){
    if(($Action -eq 'Regression') -ne ($Scope -eq 'Regression')){throw 'Test action/scope mismatch.'}
    $started=Join-Path $private "$($Scope.ToLowerInvariant())-$RunId.started.json";if(Test-Path -LiteralPath $started){throw 'This acceptance pipeline was already started; populated schemas are never reused.'}
    $testCredential=Import-Clixml -LiteralPath $testPath;$owner=Import-Clixml -LiteralPath (Join-Path $profiles 'owner.credential.clixml')
    $env:DB_NAME=$testName;$env:DB_CONFIRM_NAME=$testName;$env:DB_USER=$testCredential.UserName;$env:DB_PASSWORD=Secret $testCredential.Password;$env:UPMS_P23_OWNER_USER=$owner.UserName;$env:UPMS_P23_OWNER_PASSWORD=Secret $owner.Password;$env:UPMS_P23_STAGE='true'
    & $node server/tools/database-preflight.mjs
    if($LASTEXITCODE -ne 0){throw 'Database preflight failed before pipeline start; no acceptance fixtures or migration attempted.'}
    @{database=$testName;startedUtc=[DateTime]::UtcNow.ToString('o')}|ConvertTo-Json|Set-Content -LiteralPath $started
    New-Item -ItemType Directory -Path tmp/w06/p23 -Force|Out-Null
    if($Action -eq 'Regression'){
      $env:UPMS_P22_PREMIGRATED='true';$env:UPMS_TEST_OWNER_USER=$env:UPMS_P23_OWNER_USER;$env:UPMS_TEST_OWNER_PASSWORD=$env:UPMS_P23_OWNER_PASSWORD
      $output=& $node --test server/tests/mysql/identity.integration.js 2>&1;$status=$LASTEXITCODE;$text=$output -join "`n";$text|Set-Content "tmp/w06/p23/identity-$RunId.log"
      if($status -ne 0 -or $text -notmatch 'tests 17' -or $text -notmatch 'pass 17'){throw 'Identity regression failed; pipeline stopped without reset.'}
      @{passed=$true;checks=17;topLevel=$true;database=$testName}|ConvertTo-Json|Set-Content (Join-Path $private "identity-$RunId.json")
      $env:UPMS_P22_OWNER_USER=$env:UPMS_P23_OWNER_USER;$env:UPMS_P22_OWNER_PASSWORD=$env:UPMS_P23_OWNER_PASSWORD
      $output=& $node --test server/tests/mysql/business.integration.js 2>&1;$status=$LASTEXITCODE;$text=$output -join "`n";$text|Set-Content "tmp/w06/p23/business-$RunId.log"
      if($status -ne 0 -or $text -notmatch 'tests 16' -or $text -notmatch 'pass 16'){throw 'Business regression failed; pipeline stopped without reset.'}
      Write-Output 'P2.3 regression pipeline: 17 identity and 16 business tests passed.'
    }else{& $node --test server/tests/mysql/inventory.integration.js;if($LASTEXITCODE -ne 0){throw 'Inventory acceptance failed; retain schema and use a fresh approved run.'}}
  }else{& $node server/tools/inventory-operations.mjs $Action.ToLowerInvariant();if($LASTEXITCODE -ne 0){throw 'Inventory operator stopped; no reset or secret diagnostics.'}}
}finally{Pop-Location;foreach($buffer in $buffers){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($buffer)};foreach($name in $names){[Environment]::SetEnvironmentVariable($name,$saved[$name],'Process')}}
