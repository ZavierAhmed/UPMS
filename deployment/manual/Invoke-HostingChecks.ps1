param([Parameter(Mandatory=$true)][string]$ReportPath,[string]$SshHost)
$ErrorActionPreference='Stop'
# No credentials, cookies, cPanel session URLs or certificate bypass flags.
$result=[ordered]@{checkedAt=(Get-Date).ToUniversalTime().ToString('o');origins=@();ssh='NOT CHECKED';productionReady=$false}
foreach($origin in @('https://unique-plastic.com','https://app.unique-plastic.com')) {
 $entry=[ordered]@{origin=$origin;verifiedHttps=$false}
 try {$response=Invoke-WebRequest -Uri $origin -Method Head -MaximumRedirection 0 -TimeoutSec 10;$entry.status=[int]$response.StatusCode;$entry.verifiedHttps=$true;$entry.headers=@{};foreach($header in @('Strict-Transport-Security','Content-Security-Policy','X-Frame-Options','X-Content-Type-Options','Cache-Control','X-Robots-Tag')){if($response.Headers[$header]){$entry.headers[$header]=[string]$response.Headers[$header]}}}catch{$entry.error='HTTPS_REQUEST_FAILED: inspect certificate/hostname/response manually; do not bypass verification'}
 $result.origins+=,$entry
}
if($SshHost){if($SshHost -notmatch '^[a-zA-Z0-9.-]+$'){throw 'Use a provider-approved SSH hostname, not a URL/session token'};$result.ssh=@{tcp22Reachable=[bool](Test-NetConnection -ComputerName $SshHost -Port 22 -InformationLevel Quiet);accountShellEnabled='UNKNOWN: verify in cPanel/with provider'}}
$target=[IO.Path]::GetFullPath($ReportPath);if(Test-Path -LiteralPath $target){throw 'Report already exists; choose a new private filename'};$result|ConvertTo-Json -Depth 8|Set-Content -LiteralPath $target;Write-Output 'Read-only report saved. Keep it private; no authentication, uploads or deployment performed.'
