$ErrorActionPreference='Stop'
$repo=Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repo
$assets=Join-Path $repo 'tmp/php-runtime/uat2a-assets'
Push-Location -LiteralPath upms.client
try {
    node node_modules/vite/bin/vite.js build --config vite.management.config.js --outDir $assets
    if($LASTEXITCODE -ne 0){throw 'Cheque UAT-2A build failed'}
} finally {Pop-Location}
node (Join-Path $PSScriptRoot 'uat2a-preview.mjs')
