param([ValidateSet('Preflight','RestoreReview','Checkpoint')][string]$Mode='Preflight')
$ErrorActionPreference='Stop'
$repo=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repo
$root=Join-Path $repo 'tmp/php-runtime/uath1d-owner-protection'
$node=(Get-Command node -ErrorAction SilentlyContinue).Source
if(!$node){$node=Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'}
function Invoke-H1DWorker($payload) {
    $start=[Diagnostics.ProcessStartInfo]::new()
    $start.FileName=$node;$start.ArgumentList.Add('scripts/uath1d-preflight.mjs');$start.WorkingDirectory=$repo
    $start.UseShellExecute=$false;$start.CreateNoWindow=$true;$start.RedirectStandardInput=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
    $process=[Diagnostics.Process]::Start($start)
    $out=$process.StandardOutput.ReadToEndAsync();$err=$process.StandardError.ReadToEndAsync()
    $process.StandardInput.Write(($payload | ConvertTo-Json -Depth 10 -Compress));$process.StandardInput.Close();$process.WaitForExit()
    if($process.ExitCode -ne 0){$codes=[regex]::Matches($err.Result,'\b(?:H1D|H1C|LABOR|MONEY|UPMS)_[A-Z_]+\b').Value | Select-Object -Unique;throw ('H1D_PREFLIGHT_FAILED '+($codes -join ','))}
    return ($out.Result | ConvertFrom-Json)
}
Add-Type -AssemblyName System.Security.Cryptography.ProtectedData
$prepared=Invoke-H1DWorker @{action='prepare'}
$lockStream=[IO.File]::Open((Join-Path $root '.preflight.lock'),[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)
try {
$entropy=[Text.Encoding]::UTF8.GetBytes('Unique Plastic Industry UPMS UAT-H1D local recovery v1')
$keyPath=Join-Path $root 'recipient.dpapi.json'
if(!(Test-Path -LiteralPath $keyPath)) {
    if($Mode -ne 'Preflight'){throw 'H1D_EXISTING_DPAPI_RECOVERY_KEY_REQUIRED'}
    $generated=Invoke-H1DWorker @{action='keygen'}
    $keyBytes=[Convert]::FromBase64String($generated.keyPair)
    try {$protected=[Security.Cryptography.ProtectedData]::Protect($keyBytes,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)} finally {[Array]::Clear($keyBytes,0,$keyBytes.Length)}
    $store=@{version=1;publicKey=$generated.publicKey;protectedKeyPair=[Convert]::ToBase64String($protected);protection='Windows DPAPI CurrentUser';createdUtc=[DateTimeOffset]::UtcNow.ToString('o')}
    [IO.File]::WriteAllText($keyPath,($store | ConvertTo-Json),[Text.UTF8Encoding]::new($false));$generated=$null
}
$store=Get-Content -LiteralPath $keyPath -Raw | ConvertFrom-Json
$fixed=Get-Content -LiteralPath (Join-Path $repo 'tmp/php-runtime/uath1-owner-binding.json') -Raw | ConvertFrom-Json
$browser=Get-Content -LiteralPath (Join-Path $fixed.directory 'browser.json') -Raw | ConvertFrom-Json
$configurationBackup=Join-Path $root 'environment-before.dpapi'
if(!(Test-Path -LiteralPath $configurationBackup)) {
    if($Mode -ne 'Preflight'){throw 'H1D_ORIGINAL_PROTECTED_CONFIGURATION_REQUIRED'}
    $configurationBytes=[IO.File]::ReadAllBytes($browser.envPath)
    try {$protectedConfiguration=[Security.Cryptography.ProtectedData]::Protect($configurationBytes,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser);[IO.File]::WriteAllBytes($configurationBackup,$protectedConfiguration)} finally {[Array]::Clear($configurationBytes,0,$configurationBytes.Length)}
}
$keyBytes=[Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($store.protectedKeyPair),$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
try {$result=Invoke-H1DWorker @{action=$(if($Mode -eq 'RestoreReview'){'restore-review'}elseif($Mode -eq 'Checkpoint'){'checkpoint'}else{'preflight'});publicKey=$store.publicKey;keyPair=[Convert]::ToBase64String($keyBytes)}} finally {[Array]::Clear($keyBytes,0,$keyBytes.Length)}
$result | ConvertTo-Json -Depth 10
} finally {$lockStream.Dispose()}
