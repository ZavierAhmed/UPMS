$ErrorActionPreference='Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$fixture=Get-Content -LiteralPath 'tmp/php-runtime/uat2a-extras.json' -Raw | ConvertFrom-Json
$expected=[IO.Path]::GetFullPath((Join-Path $fixture.binding.directory 'test.env'))
$privateRoot=[IO.Path]::GetFullPath((Join-Path (Get-Location) 'tmp/php-runtime'))+[IO.Path]::DirectorySeparatorChar
if($expected -ne [IO.Path]::GetFullPath($fixture.envPath) -or !$expected.StartsWith($privateRoot,[StringComparison]::OrdinalIgnoreCase) -or ((Get-Item -LiteralPath $expected).Attributes -band [IO.FileAttributes]::ReparsePoint)){throw 'Fixed private synthetic environment required'}
Add-Type -AssemblyName System.Security.Cryptography.ProtectedData
$entropy=[Text.Encoding]::UTF8.GetBytes('UPMS UAT2A attachment key custody')
$bytes=[IO.File]::ReadAllBytes($expected)
try {
    $protected=[Security.Cryptography.ProtectedData]::Protect($bytes,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    $path=Join-Path $fixture.binding.directory 'attachment-environment.dpapi'
    [IO.File]::WriteAllBytes($path,$protected)
    $recovered=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($path),$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    try {if([Convert]::ToBase64String($bytes) -ne [Convert]::ToBase64String($recovered)){throw 'Protected environment roundtrip failed'}} finally {[Array]::Clear($recovered,0,$recovered.Length)}
    $rejected=$false
    try {$wrong=[Security.Cryptography.ProtectedData]::Unprotect($protected,[Text.Encoding]::UTF8.GetBytes('wrong context'),[Security.Cryptography.DataProtectionScope]::CurrentUser)} catch {$rejected=$true}
    if(!$rejected){[Array]::Clear($wrong,0,$wrong.Length);throw 'Wrong key-custody context accepted'}
    $protected[20]=$protected[20] -bxor 1
    $rejected=$false
    try {$wrong=[Security.Cryptography.ProtectedData]::Unprotect($protected,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)} catch {$rejected=$true}
    if(!$rejected){[Array]::Clear($wrong,0,$wrong.Length);throw 'Altered key-custody evidence accepted'}
    @{passed=$true;protection='Windows DPAPI CurrentUser';applicationKeyAndEnvironmentRecovered=$true;wrongContextRejected=$true;tamperingRejected=$true;plaintextRecoveryFileWritten=$false;secretsPrinted=$false;verifiedUtc=[DateTimeOffset]::UtcNow.ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath 'docs/uat-2a/evidence/key-custody.json'
    'Protected application-key recovery, wrong-context rejection and tamper rejection passed.'
} finally {[Array]::Clear($bytes,0,$bytes.Length)}
