[CmdletBinding()]
param(
 [ValidateSet('Inspect','Upload')][string]$Mode='Inspect',
 [string]$Key='C:\Users\zasah\.ssh\upms_godaddy',
 [string]$ArtifactRecord,
 [switch]$PathsAndQuotaReviewed
)
$ErrorActionPreference='Stop'
if(!(Test-Path -LiteralPath $Key -PathType Leaf)){throw 'Existing private key path not found; select your existing owner-controlled key. Never share its contents.'}
$sshArgs=@('-T','-i',$Key,'-p','22','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','tsn6az96j3v7@unique-plastic.com')
$scpArgs=@('-i',$Key,'-P','22','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes')
$inspector=Join-Path $PSScriptRoot 'inspect-host.php'
$raw=Get-Content -LiteralPath $inspector -Raw | & ssh @sshArgs php
if($LASTEXITCODE -ne 0){throw 'Read-only SSH inspection failed. Preserve output privately; verify existing key/agent/host-key setup without bypass flags.'}
$inspection=($raw -join "`n") | ConvertFrom-Json
$inspection | ConvertTo-Json -Depth 8
if($Mode -eq 'Inspect'){return}
if(!$PathsAndQuotaReviewed -or !$inspection.inspectionPassed){throw 'Upload requires successful parent/isolation inspection and explicit cPanel quota/path review.'}
if(!(Test-Path -LiteralPath $ArtifactRecord -PathType Leaf)){throw 'Explicit reviewed ARTIFACT.json required'}
$a=Get-Content -LiteralPath $ArtifactRecord -Raw | ConvertFrom-Json
if($a.proposedStagingRoot -ne '/home/tsn6az96j3v7/upms-php83-staging' -or $a.productionReady -ne $false){throw 'Artifact target/classification mismatch'}
if((Get-FileHash -LiteralPath $a.archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $a.archiveSha256){throw 'Local archive checksum mismatch'}
$stage='/home/tsn6az96j3v7/upms-php83-staging'
& ssh @sshArgs "test ! -e '$stage' && test ! -L '$stage' && umask 077 && mkdir -m 700 -- '$stage'"
if($LASTEXITCODE -ne 0){throw 'Fresh private destination creation refused; do not delete/reuse an existing directory automatically.'}
& scp @scpArgs $a.archive "tsn6az96j3v7@unique-plastic.com:$stage/upload.tar.gz"
if($LASTEXITCODE -ne 0){throw 'Private upload failed; preserve partial state for review'}
$remoteHash=(& ssh @sshArgs "sha256sum -- '$stage/upload.tar.gz'")
if($LASTEXITCODE -ne 0 -or ($remoteHash -split '\s+')[0] -ne $a.archiveSha256){throw 'Uploaded archive checksum failed; do not extract'}
& ssh @sshArgs "umask 077 && test ! -e '$stage/payload' && mkdir -m 700 -- '$stage/payload' && tar --no-same-owner --no-same-permissions -xzf '$stage/upload.tar.gz' -C '$stage/payload'"
if($LASTEXITCODE -ne 0){throw 'Extraction failed; stop and preserve private logs/state'}
$plan=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'staging-plan.NOT-REVIEWED.json') -Raw | ConvertFrom-Json
$plan.destinationReviewed=$true;$plan.accountQuotaReviewed=$true
$localPlan=Join-Path (Split-Path -Parent $ArtifactRecord) 'reviewed-staging-plan.json'
[System.IO.File]::WriteAllText($localPlan,($plan | ConvertTo-Json -Depth 8),[System.Text.UTF8Encoding]::new($false))
& scp @scpArgs $localPlan "tsn6az96j3v7@unique-plastic.com:$stage/reviewed-plan.json"
if($LASTEXITCODE -ne 0){throw 'Private plan transfer failed'}
& ssh @sshArgs "chmod 600 -- '$stage/reviewed-plan.json' && php '$stage/payload/tools/prepare-runtime.php' --plan '$stage/reviewed-plan.json'"
if($LASTEXITCODE -ne 0){throw 'Private disabled-runtime preparation failed'}
& ssh @sshArgs "php '$stage/payload/tools/verify-staging.php' --plan '$stage/reviewed-plan.json' --manifest-sha '$($a.stagingManifestSha256)'"
if($LASTEXITCODE -ne 0){throw 'Consolidated staging verification failed; preserve private runtime logs'}
Write-Output 'Private staging uploaded and checked. Database verification, backup restore, web/SMTP/trust remain separate gates. No public cutover or database operation executed.'
