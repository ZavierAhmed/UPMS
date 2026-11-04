param()
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
Push-Location -LiteralPath upms.client
try {
    node node_modules/vite/bin/vite.js build --config vite.management.config.js
    if ($LASTEXITCODE -ne 0) { throw 'Management build failed; preview not started.' }
} finally { Pop-Location }
node (Join-Path $PSScriptRoot 'uat2-preview.mjs')
