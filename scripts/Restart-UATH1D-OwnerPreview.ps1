param([switch]$OwnerAuthorized,[Parameter(Mandatory=$true)][int]$ExpectedProcessId,[Parameter(Mandatory=$true)][string]$PreflightSha256)
$ErrorActionPreference='Stop'
if(!$OwnerAuthorized){throw 'H1D_SEPARATE_EXPLICIT_OWNER_AUTHORIZATION_REQUIRED'}
$repo=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repo
$proofPath=Join-Path $repo 'tmp/php-runtime/uath1d-owner-protection/preflight.json'
if((Get-FileHash -LiteralPath $proofPath -Algorithm SHA256).Hash.ToLowerInvariant() -cne $PreflightSha256){throw 'H1D_PREFLIGHT_CHECKSUM_REQUIRED'}
$proof=Get-Content -LiteralPath $proofPath -Raw | ConvertFrom-Json
$bindingPath=Join-Path $repo 'tmp/php-runtime/uath1-owner-binding.json'
if((Get-FileHash -LiteralPath $bindingPath -Algorithm SHA256).Hash.ToLowerInvariant() -cne $proof.bindingFileSha256){throw 'H1D_FIXED_BINDING_CHANGED'}
$listener=Get-NetTCPConnection -LocalPort 5180 -State Listen -ErrorAction Stop
if(@($listener).Count -ne 1 -or $listener.OwningProcess -ne $ExpectedProcessId){throw 'H1D_LISTENER_IDENTITY_CHANGED'}
$process=Get-CimInstance Win32_Process -Filter ('ProcessId='+$ExpectedProcessId)
if($process.Name -ne 'node.exe' -or $process.CommandLine -notmatch 'scripts[\\/]uath1-launcher\.mjs(?:\s|$)'){throw 'H1D_UNIDENTIFIED_LISTENER_PRESERVED'}
# The owner must pause manual use for this authorized maintenance window.
for($attempt=0;$attempt -lt 30;$attempt++){
    $children=@(Get-CimInstance Win32_Process -Filter ('ParentProcessId='+$ExpectedProcessId) | Where-Object {$_.Name -eq 'php.exe'})
    if($children.Count -eq 0){break}
    Start-Sleep -Milliseconds 500
}
if($children.Count -ne 0){throw 'H1D_ACTIVE_PHP_REQUESTS_LISTENER_PRESERVED'}
Stop-Process -Id $ExpectedProcessId -ErrorAction Stop
& (Join-Path $PSScriptRoot 'start-uath1-preview.ps1') -NoBrowser
$status=Invoke-RestMethod -Uri 'http://127.0.0.1:5180/setup/status' -TimeoutSec 15
if($status.state -ne 'READY' -or $status.readinessVerified -ne $true -or $null -eq $status.inFlightWrites){throw 'H1D_UPDATED_LAUNCHER_READINESS_REQUIRED'}
@{passed=$true;port=5180;existingBindingReused=$true;administratorRecreated=$false;databaseMigrated=$false;separateMigrationCommandRequired=$true} | ConvertTo-Json
