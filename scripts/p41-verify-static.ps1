param([string]$ApacheRoot='C:/xampp/apache',[switch]$Browser)
$ErrorActionPreference='Stop'
$base=(Resolve-Path 'tmp/phase-4.1/static').Path.Replace('\','/')
$root="$base/apache-site-$([Guid]::NewGuid().ToString('N'))"
$zipHash=(Get-FileHash "$base/upms-public-static.zip").Hash
$expected=(Get-Content "$base/upms-public-static.zip.sha256").Split(' ')[0]
if($zipHash -ne $expected){throw 'Static archive checksum mismatch'}
Expand-Archive "$base/upms-public-static.zip" $root
$manifest=Get-Content "$root/release-manifest.json" -Raw|ConvertFrom-Json
foreach($file in $manifest.files.PSObject.Properties){if((Get-FileHash -LiteralPath "$root/$($file.Name)").Hash -ne $file.Value){throw "Manifest mismatch $($file.Name)"}}
$conf="$base/httpd.conf"
$management="$root/dashboard"
New-Item -ItemType Directory -Path $management | Out-Null
Copy-Item 'deployment/phase-4/management.htaccess' "$management/.htaccess"
Set-Content "$management/index.html" 'MANAGEMENT_ROUTE_FIXTURE'
Set-Content "$management/gateway.php" 'GATEWAY_ROUTE_FIXTURE'
@"
ServerRoot "$ApacheRoot"
Listen 127.0.0.1:5227
Listen 127.0.0.1:5228
ServerName unique-plastic.com
PidFile "$base/httpd.pid"
ErrorLog "$base/apache-error.log"
LoadModule authz_core_module modules/mod_authz_core.so
LoadModule rewrite_module modules/mod_rewrite.so
LoadModule headers_module modules/mod_headers.so
LoadModule dir_module modules/mod_dir.so
LoadModule mime_module modules/mod_mime.so
LoadModule ssl_module modules/mod_ssl.so
TypesConfig conf/mime.types
DocumentRoot "$root"
<Directory "$root">
 Options FollowSymLinks
 AllowOverride All
 Require all granted
</Directory>
<VirtualHost 127.0.0.1:5228>
 ServerName unique-plastic.com
 SSLEngine on
 SSLCertificateFile "$ApacheRoot/conf/ssl.crt/server.crt"
 SSLCertificateKeyFile "$ApacheRoot/conf/ssl.key/server.key"
</VirtualHost>
<VirtualHost 127.0.0.1:5228>
 ServerName app.unique-plastic.com
 DocumentRoot "$management"
 <Directory "$management">
  Options FollowSymLinks
  AllowOverride All
  Require all granted
 </Directory>
 SSLEngine on
 SSLCertificateFile "$ApacheRoot/conf/ssl.crt/server.crt"
 SSLCertificateKeyFile "$ApacheRoot/conf/ssl.key/server.key"
</VirtualHost>
"@ | Set-Content -Encoding ascii $conf
& "$ApacheRoot/bin/httpd.exe" -t -f $conf
if($LASTEXITCODE){throw 'Apache configuration rejected'}
$worker=Start-Process "$ApacheRoot/bin/httpd.exe" -ArgumentList '-f',"`"$conf`"" -WindowStyle Hidden -PassThru
try {
 Start-Sleep -Seconds 2
 function Probe([string]$Path,[int]$Expected,[string]$Scheme='https',[int]$Port=5228,[string]$Hostname='unique-plastic.com'){
  $output="$base/response.tmp"
  $meta=& curl.exe --silent --show-error --insecure --max-time 15 -H "Host: $Hostname" -D "$base/headers.tmp" -o $output -w '%{http_code} %{content_type} %{redirect_url}' "${Scheme}://127.0.0.1:${Port}$Path"
  if($LASTEXITCODE -or ($meta -split ' ')[0] -ne "$Expected"){throw "$Path expected $Expected, got $meta"}
  return @{host=$Hostname;path=$Path;status=$Expected;metadata=$meta;sha256=(Get-FileHash $output).Hash.ToLowerInvariant()}
 }
 $checks=@()
 foreach($path in $manifest.routes){
  $checks+=Probe $path 200
  $html=Get-Content "$base/response.tmp" -Raw
  if(!(Select-String -LiteralPath "$base/headers.tmp" -Pattern '^Cache-Control: no-cache')){throw "Missing HTML cache policy for $path"}
  if(!$html.Contains("href=`"https://unique-plastic.com$path`"") -or !$html.Contains('public-static-release') -or !$html.Contains('<title>') -or !$html.Contains('name="description"')){throw "Missing SEO or static mode for $path"}
 }
 foreach($file in $manifest.files.PSObject.Properties|Where-Object Name -match '^(assets/|downloads/|favicon\.svg$)'){
  $probe=Probe ('/'+$file.Name) 200
  if($probe.sha256 -ne $file.Value){throw "Served bytes mismatch $($file.Name)"}
  if($file.Name -match '\.pdf$' -and $probe.metadata -notmatch 'application/pdf'){throw "Incorrect PDF MIME $($file.Name)"}
  if($file.Name -match '-[A-Za-z0-9_-]{8}\.(js|css|svg|png|webp|avif|jpe?g|woff2)$' -and !(Select-String -LiteralPath "$base/headers.tmp" -Pattern '^Cache-Control: public, max-age=31536000, immutable')){throw "Missing asset cache policy $($file.Name)"}
  $checks+=$probe
 }
 foreach($path in '/vendor/autoload.php','/storage/logs/laravel.log','/.env','/api/v1/public/inquiries','/api/v1/management','/management','/dashboard','/dashboard/gateway.php','/_site/about.html','/missing'){$checks+=Probe $path 404}
 $checks+=Probe '/' 307 'http' 5227
 foreach($path in '/.env','/management/.env','/vendor/autoload.php','/storage/logs/laravel.log','/api/v1/public/inquiries','/gateway.php'){$checks+=Probe $path 404 'https' 5228 'app.unique-plastic.com'}
 $checks+=Probe '/management/challans' 200 'https' 5228 'app.unique-plastic.com'
 $checks+=Probe '/api/v1/management/probe' 200 'https' 5228 'app.unique-plastic.com'
 if((Get-Content "$base/response.tmp" -Raw).Trim() -ne 'GATEWAY_ROUTE_FIXTURE'){throw 'Management API did not reach fixture gateway'}
 @{passed=$true;localTestCertificate=$true;gatewayRoutingFixtureOnly=$true;archiveSha256=$zipHash.ToLowerInvariant();onlineInquiry=$false;checks=$checks}|ConvertTo-Json -Depth 5|Set-Content docs/phase-4.1/evidence/static-apache.json
 if($Browser){
  & './tmp/production-readiness/node22/node_modules/node/bin/node.exe' scripts/p41-static-browser.mjs
  if($LASTEXITCODE){throw 'Static Chrome checks failed'}
 }
}finally{
 if(!$worker.HasExited){Stop-Process -Id $worker.Id}
}
