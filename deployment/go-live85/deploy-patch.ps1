[CmdletBinding()]
param([ValidateSet('Validate','Deploy')][string]$Mode='Validate')
$ErrorActionPreference='Stop'
$repo=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$manifest=Get-Content -Raw -LiteralPath (Join-Path $PSScriptRoot 'PATCH85.json') | ConvertFrom-Json
$server='tsn6az96j3v7@unique-plastic.com'
foreach($row in $manifest.files){
    $file=Join-Path $repo $row.source
    $bytes=[Text.Encoding]::UTF8.GetBytes([IO.File]::ReadAllText($file).Replace("`r`n","`n"))
    $sha=[Security.Cryptography.SHA256]::Create()
    try{$actual=([BitConverter]::ToString($sha.ComputeHash($bytes))).Replace('-','').ToLowerInvariant()}finally{$sha.Dispose()}
    if($actual -cne $row.sha256Lf){throw "Patch source mismatch: $($row.source)"}
    if(!$row.destination.StartsWith('/home/tsn6az96j3v7/upms-php83-staging/') -or $row.destination.Contains('/../')){throw 'Destination rejected'}
}
if($Mode -eq 'Validate'){Write-Output 'Patch source validation PASS; no hosting changes.';return}
& ssh -T -o BatchMode=yes -o StrictHostKeyChecking=yes $server 'test -d /home/tsn6az96j3v7/upms-php83-staging/php85-tools'
if($LASTEXITCODE -ne 0){throw 'Expected private PHP-8.5 deployment directory missing; stop for review'}
foreach($row in $manifest.files){
    if(!$row.deploy){continue}
    & scp -q -o BatchMode=yes -o StrictHostKeyChecking=yes (Join-Path $repo $row.source) ($server+':'+$row.destination)
    if($LASTEXITCODE -ne 0){throw "Patch transfer failed: $($row.source)"}
}
& scp -q -o BatchMode=yes -o StrictHostKeyChecking=yes (Join-Path $PSScriptRoot 'PATCH85.json') ($server+':/home/tsn6az96j3v7/upms-php83-staging/php85-tools/PATCH85.json')
if($LASTEXITCODE -ne 0){throw 'Patch manifest transfer failed'}
Write-Output 'Minimal private patch transferred. No SQL import, guard reinstallation, account creation, public frontend upload or activation executed.'
