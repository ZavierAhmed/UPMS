$ErrorActionPreference = 'Stop'
$listener = @(Get-NetTCPConnection -LocalPort 5197 -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalAddress -eq '127.0.0.1' })
if ($listener.Count -eq 0) { Write-Output 'Cheque UAT-2A is not listening on 127.0.0.1:5197.'; exit 0 }
if ($listener.Count -ne 1) { throw 'Ambiguous listener; no process was stopped.' }
$serverProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener[0].OwningProcess)"
$expectedScript = Join-Path $PSScriptRoot 'uat2a-preview.mjs'
$expectedArgument = [regex]::Escape($expectedScript) + '(?:"|\s|$)'
if ($serverProcess.Name -ne 'node.exe' -or $serverProcess.CommandLine -notmatch $expectedArgument) {
    throw 'Port 5197 belongs to a different process. It was preserved; no process was stopped.'
}
Stop-Process -Id $serverProcess.ProcessId -ErrorAction Stop
Write-Output 'Stopped only the identified cheque UAT-2A launcher. Database, accounts and records are preserved.'
