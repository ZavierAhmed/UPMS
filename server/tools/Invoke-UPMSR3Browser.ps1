param([ValidateSet('Navigation','Visual','Stress')][string]$Action='Visual')
# Read-only browser checks against the preserved synthetic UAT02; no setup/reset.
$RunId='02'
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'));$private=Join-Path $root 'server/.local/p27c';$schema="upms_test_p27c_uat_20261023_$RunId";$node=Join-Path $root 'tmp/w05/runtime/node_modules/node/bin/node.exe'
$names=@('DB_HOST','DB_PORT','DB_NAME','DB_CONFIRM_NAME','DB_USER','DB_PASSWORD','DB_ALLOW_MARIADB_COMPATIBILITY','IDENTITY_DB_PURPOSE','NODE_ENV','UPMS_UAT_AUTHORIZED','UPMS_UAT_SCHEMA','UPMS_UAT_USERS_JSON','SESSION_SECRET');$saved=@{};foreach($name in $names){$saved[$name]=[Environment]::GetEnvironmentVariable($name,'Process')};$buffers=[Collections.Generic.List[IntPtr]]::new()
function Secret($secure){$buffer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure);$buffers.Add($buffer);return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($buffer)}
Push-Location -LiteralPath $root
try{
 $runtime=Import-Clixml -LiteralPath (Join-Path $private "uat-$RunId-runtime.credential.clixml");if($runtime.UserName -ne "upms_runtime_test_p27cu$RunId"){throw 'Unexpected UAT runtime profile'}
 $env:DB_HOST='127.0.0.1';$env:DB_PORT='3309';$env:DB_NAME=$schema;$env:DB_CONFIRM_NAME=$schema;$env:DB_USER=$runtime.UserName;$env:DB_PASSWORD=Secret $runtime.Password;$env:DB_ALLOW_MARIADB_COMPATIBILITY='true';$env:IDENTITY_DB_PURPOSE='runtime';$env:NODE_ENV='development';$env:UPMS_UAT_AUTHORIZED='p27c-isolated-demo-v1';$env:UPMS_UAT_SCHEMA=$schema
 if($Action -in @('Navigation','Visual','Stress')){$users=@();foreach($entry in @(@{label='Admin';role='administrator'},@{label='Sales';role='sales_dispatch'},@{label='Inventory';role='inventory'},@{label='Accounts';role='accounts'})){$credential=Import-Clixml -LiteralPath (Join-Path $private "uat-$RunId-$($entry.label).credential.clixml");$users+=@{role=$entry.role;username=$credential.UserName;password=(Secret $credential.Password)}};$env:UPMS_UAT_USERS_JSON=ConvertTo-Json -InputObject $users -Compress}
 $script=if($Action -eq 'Stress'){'ui-r3-route-stress.mjs'}elseif($Action -eq 'Visual'){'ui-r3-browser.mjs'}else{'ui-navigation-browser.mjs'}
 & $node "server/tools/$script";if($LASTEXITCODE -ne 0){throw 'UAT action stopped; retain schema and private diagnostics. No reset attempted.'}
}finally{Pop-Location;foreach($buffer in $buffers){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($buffer)};foreach($name in $names){[Environment]::SetEnvironmentVariable($name,$saved[$name],'Process')}}
