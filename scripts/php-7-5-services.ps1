param([ValidateSet('Start','Stop')][string]$Action='Start', [string]$SetupFile='tmp/php-runtime/php7-uat-latest.json', [ValidateSet('83','84')][string]$Php='84')
$ErrorActionPreference='Stop'
$repo=Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $repo
$record=Join-Path $repo 'tmp/php-runtime/php75-services.json'
if($Action -eq 'Stop') {
 if(!(Test-Path -LiteralPath $record)){throw 'No owned process record; refusing to stop arbitrary listeners'}
 $owned=Get-Content -LiteralPath $record -Raw|ConvertFrom-Json
 foreach($entry in @($owned.apache,$owned.cgi)) {
  $process=Get-CimInstance Win32_Process -Filter "ProcessId = $($entry.id)"
  if(!$process){continue}
  if($process.ExecutablePath -ne $entry.executable -or $process.CreationDate.ToUniversalTime().Ticks -ne ([datetime]$entry.created).ToUniversalTime().Ticks){throw 'Process identity changed; stop refused'}
  if($entry.kind -eq 'apache' -and !$process.CommandLine.Contains($owned.config)){throw 'Apache configuration identity changed'}
  $children=Get-CimInstance Win32_Process -Filter "ParentProcessId = $($entry.id)"
  foreach($child in $children){if($child.ExecutablePath -eq $entry.executable){Stop-Process -Id $child.ProcessId}}
  Stop-Process -Id $entry.id
 }
 Write-Output 'Owned UAT Apache and CGI stopped; synthetic database preserved.'
 exit
}
$setup=Get-Content -LiteralPath $SetupFile -Raw|ConvertFrom-Json
if($setup.database -notmatch '^upms_test_php_6_(browser|restore)_[0-9]+$'){throw 'Synthetic schema whitelist failed'}
$configuration=Get-Content -LiteralPath $setup.env -Raw
if($configuration -notmatch '(?m)^UPMS_DB_HOST=127\.0\.0\.1\r?$' -or $configuration -notmatch '(?m)^UPMS_DB_PORT=3330\r?$' -or $configuration -notmatch ('(?m)^UPMS_DB_DATABASE='+[regex]::Escape($setup.database)+'\r?$')){throw 'Private environment does not match the approved synthetic engine/schema'}
& (Join-Path $repo 'tmp/production-readiness/node22/node_modules/node/bin/node.exe') --input-type=module -e "import {verifyUatEngine} from './scripts/php-7-5-engine-guard.mjs'; await verifyUatEngine();"
if($LASTEXITCODE -ne 0){throw 'Synthetic engine identity verification failed'}
foreach($port in @(9084,9443,9444)){if(Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue){throw "Port $port already occupied"}}
$env:UPMS_PHP2_ENV=$setup.env
$env:PHP_FCGI_MAX_REQUESTS='0'
$binary=if($Php -eq '84'){'C:/php84/php-cgi.exe'}else{Join-Path $repo 'tmp/php-runtime/bin/php-cgi.exe'}
$arguments=if($Php -eq '84'){@('-d','extension=sodium','-b','127.0.0.1:9084')}else{@('-b','127.0.0.1:9084')}
$cgi=Start-Process -FilePath $binary -ArgumentList $arguments -WindowStyle Hidden -PassThru -RedirectStandardOutput ($setup.directory+'/cgi-out.log') -RedirectStandardError ($setup.directory+'/cgi-error.log')
$apache=Start-Process -FilePath 'C:/xampp/apache/bin/httpd.exe' -ArgumentList @('-f',('"'+$setup.config+'"')) -WindowStyle Hidden -PassThru -RedirectStandardOutput ($setup.directory+'/apache-out.log') -RedirectStandardError ($setup.directory+'/apache-stderr.log')
function Identity($p,$kind){$c=Get-CimInstance Win32_Process -Filter "ProcessId = $($p.Id)";if(!$c){throw "$kind failed to start"};return @{id=$p.Id;executable=$c.ExecutablePath;created=$c.CreationDate.ToUniversalTime().ToString('o');kind=$kind}}
@{apache=(Identity $apache 'apache');cgi=(Identity $cgi 'cgi');config=$setup.config;setup=$SetupFile;php=$Php}|ConvertTo-Json -Depth 4|Set-Content -LiteralPath $record
Write-Output "Started isolated UAT PHP $Php; verify HTTPS before claiming availability."
