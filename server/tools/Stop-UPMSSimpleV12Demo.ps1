$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'));$private=Join-Path $root 'server/.local/simple-v12';$record=Join-Path $private 'demo-server.json';$meta=Get-Content $record -Raw|ConvertFrom-Json
if($meta.schema -ne 'upms_test_simplev12_demo_20261024_01' -or $meta.port -ne 3112 -or -not $meta.synthetic){throw 'Unexpected demo identity'}
$appProcess=Get-CimInstance Win32_Process -Filter "ProcessId=$($meta.pid)"
if(-not $appProcess -or $appProcess.Name -ne 'node.exe' -or $appProcess.CommandLine -notmatch 'server[/\\]tools[/\\]simple-v12-demo\.mjs'){throw 'Process does not match this demo; preserve evidence for review'}
$listener=Get-NetTCPConnection -LocalPort 3112 -State Listen -ErrorAction Stop;if($listener.OwningProcess -ne $meta.pid){throw 'Listener owner mismatch'}
# Stop only this disposable Node demo. Never stop/restart MariaDB or any other app.
Stop-Process -Id $meta.pid -ErrorAction Stop
Wait-Process -Id $meta.pid -Timeout 10 -ErrorAction SilentlyContinue
$suffix=[DateTime]::UtcNow.Ticks
foreach($name in @('demo-server.json','demo-server.stdout.log','demo-server.stderr.log')){$source=Join-Path $private $name;if(Test-Path $source){for($attempt=0;$attempt -lt 30;$attempt++){try{Move-Item -LiteralPath $source -Destination (Join-Path $private ($name+'.stopped-'+$suffix)) -ErrorAction Stop;break}catch [IO.IOException]{if($attempt -eq 29){throw};Start-Sleep -Milliseconds 100}}}}
Write-Output 'Stopped only the verified V1.2 Node demo; schema and all credentials preserved.'
