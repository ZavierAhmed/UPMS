[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
$repo=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$root=Join-Path $repo 'tmp/protected-offhost-backups'
$php=Join-Path $repo 'tmp/php-runtime/bin/php.exe'
$worker=Join-Path $PSScriptRoot 'backup-client.php'
function Crypto-Call([hashtable]$RequestData){
 $si=[Diagnostics.ProcessStartInfo]::new();$si.FileName=$php;$si.ArgumentList.Add($worker);$si.UseShellExecute=$false;$si.CreateNoWindow=$true;$si.RedirectStandardInput=$true;$si.RedirectStandardOutput=$true;$si.RedirectStandardError=$true
 $p=[Diagnostics.Process]::new();$p.StartInfo=$si
 try{[void]$p.Start();$p.StandardInput.Write(($RequestData|ConvertTo-Json -Compress));$p.StandardInput.Close();$out=$p.StandardOutput.ReadToEnd();$discard=$p.StandardError.ReadToEnd();$p.WaitForExit();return @{ExitCode=$p.ExitCode;Data=($out|ConvertFrom-Json)}}finally{$p.Dispose()}
}
Add-Type -AssemblyName System.Security.Cryptography.ProtectedData
$store=Get-Content -Raw -LiteralPath (Join-Path $root 'recipient.dpapi.json')|ConvertFrom-Json
$key=[Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($store.protectedKeyPair),[Text.Encoding]::UTF8.GetBytes('Unique Plastic Industry UPMS backups v1'),[Security.Cryptography.DataProtectionScope]::CurrentUser)
$created=@();$checks=@()
try{
 $last=Get-Content -Raw -LiteralPath (Join-Path $root 'last-success.json')|ConvertFrom-Json
 $request=@{action='validate';keyPair=[Convert]::ToBase64String($key);file=$last.archive}
 $good=Crypto-Call $request;if($good.ExitCode-ne 0 -or !$good.Data.passed){throw 'VALID_ARCHIVE_REJECTED'};$checks+='valid-archive-authenticated'
 $bytes=[IO.File]::ReadAllBytes($last.archive)
 foreach($test in @('modified-ciphertext','truncated-final-tag','trailing-bytes')){
  $file=Join-Path $root ('crypto-test-'+[Guid]::NewGuid().ToString('N')+'.upmsbk');$created+=$file
  switch($test){
   'modified-ciphertext'{$copy=[byte[]]$bytes.Clone();$index=[int]($copy.Length/2);$copy[$index]=$copy[$index]-bxor 1;[IO.File]::WriteAllBytes($file,$copy)}
   'truncated-final-tag'{[IO.File]::WriteAllBytes($file,[byte[]]$bytes[0..($bytes.Length-9)])}
   'trailing-bytes'{$copy=[byte[]]::new($bytes.Length+1);[Array]::Copy($bytes,$copy,$bytes.Length);$copy[$bytes.Length]=1;[IO.File]::WriteAllBytes($file,$copy)}
  }
  $request.file=$file;$result=Crypto-Call $request;if($result.ExitCode-eq 0 -or $result.Data.passed){throw 'CORRUPT_ARCHIVE_ACCEPTED'};$checks+=($test+'-rejected')
 }
 $r=@{passed=$true;checks=$checks;originalArchiveUnchanged=((Get-FileHash -LiteralPath $last.archive -Algorithm SHA256).Hash.ToLowerInvariant()-ceq $last.sha256);plaintextWrittenToDisk=$false;privateKeyUploaded=$false;verifiedUtc=[DateTimeOffset]::UtcNow.ToString('o')}
 [IO.File]::WriteAllText((Join-Path $root 'crypto-test.json'),($r|ConvertTo-Json),[Text.UTF8Encoding]::new($false));$r|ConvertTo-Json
}finally{
 [Array]::Clear($key,0,$key.Length)
 foreach($file in $created){$absolute=[IO.Path]::GetFullPath($file);if(!$absolute.StartsWith([IO.Path]::GetFullPath($root)+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'TEST_CLEANUP_BOUNDARY_REJECTED'};Remove-Item -LiteralPath $absolute}
}
