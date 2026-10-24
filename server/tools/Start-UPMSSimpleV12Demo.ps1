$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'));$private=Join-Path $root 'server/.local/simple-v12'
if(-not(Test-Path (Join-Path $private 'demo-seeded.json'))){throw 'Demo must be initialized once before serving'}
if(Test-Path (Join-Path $private 'demo-server.json')){throw 'Existing server evidence: inspect the exact process before starting another instance'}
if(Get-NetTCPConnection -LocalPort 3112 -State Listen -ErrorAction SilentlyContinue){throw 'Port3112 occupied; preserve existing service'}
$shell=(Get-Process -Id $PID).Path;$script=Join-Path $PSScriptRoot 'Invoke-UPMSSimpleV12.ps1'
$process=Start-Process -FilePath $shell -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-File',('"'+$script+'"'),'-Action','Serve','-Target','demo') -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput (Join-Path $private 'demo-server.stdout.log') -RedirectStandardError (Join-Path $private 'demo-server.stderr.log') -PassThru
Write-Output "V1.2 synthetic demo startup requested; helper PID $($process.Id). Verify http://127.0.0.1:3112/management. Existing services were not stopped."
