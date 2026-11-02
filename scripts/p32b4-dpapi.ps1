[CmdletBinding()]
param([Parameter(Mandatory)][ValidateSet('Protect','Unprotect','Test')][string]$Mode,[Parameter(Mandatory)][string]$Directory)
$ErrorActionPreference='Stop'
if (!$IsWindows) {throw 'REAL_WINDOWS_REQUIRED'}
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$root=[IO.Path]::GetFullPath($Directory)
if (!$root.StartsWith((Join-Path $repo 'tmp/php-runtime/money-'),[StringComparison]::OrdinalIgnoreCase) -or (Get-Item -LiteralPath $root).Attributes -band [IO.FileAttributes]::ReparsePoint) {throw 'ISOLATED_FIXTURE_DIRECTORY_REQUIRED'}
Add-Type -AssemblyName System.Security.Cryptography.ProtectedData
$entropy=[Text.Encoding]::UTF8.GetBytes('UPMS P3.2B4 synthetic isolated archive only')
$keyFile=Join-Path $root 'isolated-recipient.dpapi'
if($Mode -eq 'Protect') {
    $snapshot=Get-Content -LiteralPath (Join-Path $root 'synthetic-snapshot.json') -Raw | ConvertFrom-Json
    $key=[Convert]::FromBase64String($snapshot.keyPair)
    try {$sealed=[Security.Cryptography.ProtectedData]::Protect($key,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser);[IO.File]::WriteAllBytes($keyFile,$sealed)}finally{[Array]::Clear($key,0,$key.Length);$snapshot=$null}
} elseif($Mode -eq 'Unprotect') {
    $key=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($keyFile),$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    try {[IO.File]::WriteAllText((Join-Path $root 'synthetic-recipient.json'),(@{keyPair=[Convert]::ToBase64String($key)} | ConvertTo-Json -Compress))}finally{[Array]::Clear($key,0,$key.Length)}
} else {
    $sealed=[IO.File]::ReadAllBytes($keyFile)
    $key=[Security.Cryptography.ProtectedData]::Unprotect($sealed,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    [Array]::Clear($key,0,$key.Length)
    $sealed[20]=$sealed[20] -bxor 1
    $rejected=$false;try {$bad=[Security.Cryptography.ProtectedData]::Unprotect($sealed,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)}catch{$rejected=$true}
    if(!$rejected){throw 'DPAPI_TAMPERING_ACCEPTED'}
    $wrongEntropy=[Text.Encoding]::UTF8.GetBytes('wrong context');$rejected=$false
    try {$bad=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($keyFile),$wrongEntropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)}catch{$rejected=$true}
    if(!$rejected){throw 'DPAPI_WRONG_CONTEXT_ACCEPTED'}
}
@{passed=$true;mode=$Mode;platform='Windows';protection='DPAPI CurrentUser';productionPathsAccessed=$false;secretsPrinted=$false} | ConvertTo-Json -Compress
