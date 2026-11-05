$ErrorActionPreference='Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
Push-Location upms.client
try {npm run build;if($LASTEXITCODE -ne 0){throw 'Public build failed'};node node_modules/vite/bin/vite.js build --config vite.management.config.js --outDir C:/Users/zasah/source/repos/UPMS/tmp/php-runtime/uat3-assets;if($LASTEXITCODE -ne 0){throw 'Management preview build failed'}} finally {Pop-Location}
node scripts/uat3-start.mjs
