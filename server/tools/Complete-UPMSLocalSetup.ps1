param([switch]$ShowCredentials)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$privateRoot=Join-Path $root 'server/.local/p21a'
# Reuses successful provisioning and existing DPAPI profiles. No DDL or grant operations.
& (Join-Path $PSScriptRoot 'Invoke-UPMSIdentity.ps1') -Profile Runtime -Action AutoSetup
if($LASTEXITCODE -ne 0){throw 'Local setup did not complete; no reset will be attempted.'}
$receipt=Join-Path $privateRoot 'local-server.json'
$running=$false
if(Test-Path -LiteralPath $receipt){
  $previous=Get-Content -LiteralPath $receipt -Raw | ConvertFrom-Json
  $process=if($previous.serverPid){Get-Process -Id $previous.serverPid -ErrorAction SilentlyContinue}else{$null}
  if($process -and [string]$process.StartTime.ToUniversalTime().Ticks -eq [string]$previous.startTicks){$running=$true}
}
if(-not $running){
  if(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue){throw 'Port 3000 is occupied by an unverified process; nothing will be stopped.'}
  $stamp=[DateTime]::UtcNow.ToString('yyyyMMddTHHmmssfff')
  $arguments=@('-NoProfile','-File',('"'+(Join-Path $PSScriptRoot 'Invoke-UPMSIdentity.ps1')+'"'),'-Profile','Runtime','-Action','Serve')
  $launcher=Start-Process pwsh.exe -ArgumentList $arguments -WorkingDirectory $root -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $privateRoot "serve-$stamp.log") -RedirectStandardError (Join-Path $privateRoot "serve-$stamp.error.log")
  $ready=$false
  for($attempt=0;$attempt -lt 20;$attempt++){
    Start-Sleep -Milliseconds 300
    $launcher.Refresh();if($launcher.HasExited){throw 'Local server could not start. Inspect the private serve error log.'}
    try{$response=Invoke-WebRequest 'http://127.0.0.1:3000/management' -UseBasicParsing -TimeoutSec 2;if($response.StatusCode -eq 200){$ready=$true;break}}catch{}
  }
  if(-not $ready){throw 'Local server readiness not confirmed; preserve state and inspect private logs.'}
  $listener=Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction Stop | Where-Object LocalAddress -eq '127.0.0.1' | Select-Object -First 1
  $node=Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)"
  if($node.ParentProcessId -ne $launcher.Id -or $node.CommandLine -notlike '*server/tools/local-management.mjs*'){throw 'Unexpected local listener identity; refusing to claim it.'}
  $process=Get-Process -Id $listener.OwningProcess
  @{serverPid=$process.Id;startTicks=[string]$process.StartTime.ToUniversalTime().Ticks;launcherPid=$launcher.Id;url='http://127.0.0.1:3000/management'} | ConvertTo-Json | Set-Content -LiteralPath $receipt
}
Write-Output 'UPMS ready: http://127.0.0.1:3000/management (loopback only).'
if($ShowCredentials -and (Test-Path -LiteralPath (Join-Path $privateRoot 'initial-administrator.credential.clixml'))){
  Start-Process pwsh.exe -WindowStyle Hidden -ArgumentList @('-NoProfile','-STA','-File',('"'+(Join-Path $PSScriptRoot 'Administrator-Handoff.ps1')+'"'),'-Action','Show')
}
