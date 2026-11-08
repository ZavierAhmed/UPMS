[CmdletBinding()]
param()
$ErrorActionPreference='Stop'
$repo=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$root=Join-Path $repo 'tmp/protected-offhost-backups'
$receipt=Get-Content -LiteralPath (Join-Path $repo 'tmp/phase-4.3/actual-production-backup.json') -Raw|ConvertFrom-Json
if(!$receipt.passed -or $receipt.archive -cnotmatch '^upms-v2-[0-9]{14}\.upmsbk$'){throw 'PRODUCTION_BACKUP_RECEIPT_REJECTED'}
$destination=Join-Path $root 'production-v2'
if(!(Test-Path -LiteralPath $destination)){New-Item -ItemType Directory -Path $destination|Out-Null}
$archive=Join-Path $destination $receipt.archive
if(Test-Path -LiteralPath $archive){throw 'PROTECTED_ARCHIVE_ALREADY_EXISTS'}
& (Join-Path $env:WINDIR 'System32/OpenSSH/scp.exe') -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15 ('tsn6az96j3v7@unique-plastic.com:/home/tsn6az96j3v7/upms-private/p43/production-v2/'+$receipt.archive) $archive
if($LASTEXITCODE -ne 0){throw 'ENCRYPTED_ARCHIVE_DOWNLOAD_FAILED'}
if((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -cne $receipt.sha256){throw 'ENCRYPTED_ARCHIVE_CHECKSUM_FAILED'}
$store=Get-Content -LiteralPath (Join-Path $root 'recipient.dpapi.json') -Raw|ConvertFrom-Json
$entropy=[Text.Encoding]::UTF8.GetBytes('Unique Plastic Industry UPMS backups v1')
$key=[Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($store.protectedKeyPair),$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
try{
 $si=[Diagnostics.ProcessStartInfo]::new();$si.FileName=Join-Path $repo 'tmp/php-runtime/bin/php.exe'
 $si.ArgumentList.Add((Join-Path $repo 'scripts/p43-validate-production-backup.php'));$si.UseShellExecute=$false;$si.CreateNoWindow=$true
 $si.RedirectStandardInput=$true;$si.RedirectStandardOutput=$true;$si.RedirectStandardError=$true
 $p=[Diagnostics.Process]::new();$p.StartInfo=$si
 try{
  [void]$p.Start();$stdout=$p.StandardOutput.ReadToEndAsync();$stderr=$p.StandardError.ReadToEndAsync()
  $request=@{archive=$archive;sha256=$receipt.sha256;recipientSha256=$receipt.recipientSha256;targetHash=$receipt.targetHash;keyPair=[Convert]::ToBase64String($key)}
  $p.StandardInput.Write(($request|ConvertTo-Json -Compress));$p.StandardInput.Close()
  if(!$p.WaitForExit(60000)){$p.Kill($true);throw 'PRIVATE_VALIDATION_TIMEOUT'}
  $raw=$stdout.GetAwaiter().GetResult();$null=$stderr.GetAwaiter().GetResult()
  if($p.ExitCode -ne 0){throw 'PRIVATE_VALIDATION_FAILED'}
  $result=$raw|ConvertFrom-Json;if(!$result.passed){throw 'PRODUCTION_BACKUP_VALIDATION_FAILED'}
  [IO.File]::WriteAllText(($archive+'.receipt.json'),$raw,[Text.UTF8Encoding]::new($false))
  [IO.File]::WriteAllText((Join-Path $repo 'tmp/phase-4.3/production-backup-validation.json'),$raw,[Text.UTF8Encoding]::new($false))
  $result|ConvertTo-Json
 }finally{$p.Dispose();$request=$null}
}finally{[Array]::Clear($key,0,$key.Length)}
