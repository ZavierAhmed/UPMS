param([ValidateSet('Test22','Resume22','Test24','Browser','Browser24','Backup','Verify','GrantMetadata','VerifyRestore')][string]$Action='Verify',[string]$ReleaseRoot='')
$ErrorActionPreference='Stop';$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'));$private=Join-Path $root 'server/.local/production-readiness'
$saved=@{};Get-ChildItem Env:|ForEach-Object{$saved[$_.Name]=$_.Value};$buffers=[Collections.Generic.List[IntPtr]]::new()
Push-Location $root
try{
 foreach($name in @('ROOT','MIGRATOR','RUNTIME','OPERATOR','SESSION')){$credential=Import-Clixml (Join-Path $private "$name.credential.clixml");$buffer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($credential.Password);$buffers.Add($buffer);[Environment]::SetEnvironmentVariable(('STAGE_'+$name+'_PASSWORD'),[Runtime.InteropServices.Marshal]::PtrToStringBSTR($buffer),'Process')}
 if(Test-Path -LiteralPath (Join-Path $private 'rotated.marker')){$env:STAGE_OPERATOR_PASSWORD+='!'}
 $meta=Get-Content (Join-Path $private 'stage.json') -Raw|ConvertFrom-Json
 $env:NODE_ENV='production';$env:DB_HOST='127.0.0.1';$env:DB_PORT='3311';$env:DB_NAME=$meta.schema;$env:DB_CONFIRM_NAME=$meta.schema;$env:DB_USER='upms_runtime_test_production_01';$env:DB_PASSWORD=$env:STAGE_RUNTIME_PASSWORD;$env:IDENTITY_DB_PURPOSE='runtime';$env:UPMS_SIMPLE_V1='production-v1';$env:UPMS_PRODUCTION_PURPOSE='synthetic-staging';$env:UPMS_EXPECTED_SERVER_ID='331124';$env:UPMS_PRODUCTION_INSTANCE=$meta.instance;$env:MANAGEMENT_ENABLED='true';$env:MANAGEMENT_ORIGIN='https://localhost:7448';$env:MANAGEMENT_LOCAL_HTTP='false';$env:SESSION_SECRET=$env:STAGE_SESSION_PASSWORD;$env:UPMS_PRODUCTION_POSTING='synthetic-reviewed';Remove-Item Env:DB_ALLOW_MARIADB_COMPATIBILITY -ErrorAction SilentlyContinue
 if($ReleaseRoot){$env:UPMS_STAGE_RELEASE_ROOT=[IO.Path]::GetFullPath((Join-Path $root $ReleaseRoot))}
 $node=if($Action -in @('Test24','Browser24')){Join-Path $root 'tmp/w05/runtime/node_modules/node/bin/node.exe'}else{Join-Path $root 'tmp/production-readiness/node22/node_modules/node/bin/node.exe'}
 if($Action -in @('Test22','Resume22','Test24')){if($Action -eq 'Resume22'){$env:PRODUCTION_STAGE_RESUME='verified-opening'};& $node --test server/tests/mysql/production-readiness.integration.js}
 elseif($Action -in @('Browser','Browser24')){& $node server/tools/production-browser.mjs}
 elseif($Action -eq 'GrantMetadata'){& $node server/tools/production-staging.mjs grant-metadata}
 elseif($Action -eq 'VerifyRestore'){& $node server/tools/production-staging.mjs verify-restore}
 else{& $node server/tools/production-staging.mjs $Action.ToLower()}
 if($LASTEXITCODE -ne 0){throw 'Staging check stopped; preserve populated data and evidence'}
}finally{Pop-Location;foreach($buffer in $buffers){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($buffer)};Get-ChildItem Env:|ForEach-Object{if(-not $saved.ContainsKey($_.Name)){[Environment]::SetEnvironmentVariable($_.Name,$null,'Process')}};foreach($name in $saved.Keys){[Environment]::SetEnvironmentVariable($name,$saved[$name],'Process')}}
