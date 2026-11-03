param([switch]$NoBrowser)
$ErrorActionPreference='Stop'
$repo=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repo
$url='http://127.0.0.1:5180/management'
function Get-WorkspaceStatus {
    try {
        $response=Invoke-WebRequest -Uri 'http://127.0.0.1:5180/setup/status' -TimeoutSec 3
        $state=$response.Content | ConvertFrom-Json
        if($state.state -notin @('WAITING','STARTING','RUNNING','FAILED','READY')){return $null}
        return $state
    }catch{return $null}
}
$state=Get-WorkspaceStatus
if(-not $state){
    # Never terminate an unidentified listener or launch provisioning over it.
    $occupied=Get-NetTCPConnection -LocalPort 5180 -State Listen -ErrorAction SilentlyContinue
    if($occupied){throw 'Port 5180 belongs to another server. Preserve it and identify its process before replacement; no setup was run.'}
    $node=(Get-Command node -ErrorAction SilentlyContinue).Source
    if(-not $node){$node=Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'}
    if(-not(Test-Path -LiteralPath $node)){throw 'Node runtime unavailable; no database setup was run.'}
    Start-Process -FilePath $node -ArgumentList 'scripts/uath1-launcher.mjs' -WorkingDirectory $repo -WindowStyle Hidden
    for($attempt=0;$attempt -lt 30;$attempt++){
        Start-Sleep -Milliseconds 500
        $state=Get-WorkspaceStatus
        if($state){break}
    }
}
if(-not $state){throw 'Startup listener did not become ready. Inspect tmp/php-runtime/uath1-owner-setup diagnostics; existing database binding was not reset.'}
$fixedBinding=Test-Path -LiteralPath (Join-Path $repo 'tmp/php-runtime/uath1-owner-binding.json')
if($fixedBinding -and $state.state -in @('STARTING','RUNNING')){
    for($attempt=0;$attempt -lt 30;$attempt++){
        Start-Sleep -Milliseconds 500
        $state=Get-WorkspaceStatus
        if($state -and $state.state -notin @('STARTING','RUNNING')){break}
    }
}
if($fixedBinding -and (!$state -or $state.state -notin @('READY','FAILED'))){throw 'Existing fixed owner workspace is not ready. Preserve its binding and credentials; do not create another administrator or initialize a database.'}
if($state.state -eq 'READY'){
    $response=Invoke-WebRequest -Uri $url -TimeoutSec 10
    if($response.StatusCode -ne 200 -or $response.Headers['X-UPMS-Workspace'] -ne 'employee-hafta'){throw 'Dashboard HTTP readiness failed; not reporting success.'}
    Write-Host "Employee Hafta dashboard verified HTTP 200: $url"
}elseif($state.state -eq 'FAILED'){
    Write-Warning "Startup failed at $($state.stage): $($state.error). Evidence and fixed binding are preserved. Open the setup page to inspect/retry safely."
}else{
    Write-Host "Setup page available: $url — dashboard is not ready yet. Choose the NEW synthetic password in your browser; wait for verified startup."
}
if(-not $NoBrowser){Start-Process $url}
