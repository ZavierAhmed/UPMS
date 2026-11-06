[CmdletBinding()]
param([string]$Capsule,[string]$Archive,[string]$ExpectedArchiveSha256,[string]$EngineConfig)
$ErrorActionPreference='Stop'
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$root=Join-Path $repo 'tmp/protected-offhost-backups'
$php=Join-Path $repo 'tmp/php-runtime/bin/php.exe'
if(Test-Path -LiteralPath (Join-Path $root 'p4-restore-binding.json')){throw 'EXISTING_RESTORE_TARGET_REQUIRES_REVIEW_NO_REINITIALIZATION'}
function Invoke-PrivatePhp([string]$Script,[object]$Request){
 $start=[Diagnostics.ProcessStartInfo]::new();$start.FileName=$php;$start.UseShellExecute=$false;$start.CreateNoWindow=$true
 $utf8=[Text.UTF8Encoding]::new($false);$start.StandardInputEncoding=$utf8;$start.StandardOutputEncoding=$utf8;$start.StandardErrorEncoding=$utf8
 $start.RedirectStandardInput=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true;$start.ArgumentList.Add($Script)
 $process=[Diagnostics.Process]::new();$process.StartInfo=$start
 try{
  $null=$process.Start();$out=$process.StandardOutput.ReadToEndAsync();$err=$process.StandardError.ReadToEndAsync();$process.StandardInput.Write(($Request|ConvertTo-Json -Depth 100 -Compress));$process.StandardInput.Close()
  if(!$process.WaitForExit(180000)){$process.Kill($true);throw 'LOCAL_RESTORE_TIMEOUT'}
  $result=$out.GetAwaiter().GetResult();$discarded=$err.GetAwaiter().GetResult()
  if($process.ExitCode -ne 0){
   try{$safe=$result|ConvertFrom-Json}catch{$safe=$null}
   $failure=@{passed=$false;worker=[IO.Path]::GetFileName($Script);phase=$safe.phase;code=$safe.code;exceptionClass=$safe.exceptionClass;sqlState=$safe.sqlState;isolatedTarget=$safe.isolatedTarget;exitCode=$process.ExitCode}
   if(!$safe){$failure.code='WORKER_RESPONSE_NOT_JSON';$failure.diagnosticCodes=@([regex]::Matches($discarded,'\b[A-Z][A-Z_]{8,}\b')|ForEach-Object Value|Select-Object -Unique -First 8)}
   $failure|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $repo ('docs/phase-4/evidence/restore-failure-'+[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()+'.json'))
   throw ('PRIVATE_RESTORE_WORKER_FAILED_'+$failure.worker+'_'+$failure.phase+'_'+$failure.code)
  }
  return $result
 }finally{$process.Dispose()}
}
if($Capsule){
 if(!$Archive -or $ExpectedArchiveSha256 -notmatch '^[a-fA-F0-9]{64}$' -or !$EngineConfig){throw 'INDEPENDENT_ARCHIVE_CHECKSUM_AND_ENGINE_REQUIRED'}
 $last=@{archive=(Resolve-Path -LiteralPath $Archive).Path;sha256=$ExpectedArchiveSha256.ToLowerInvariant();passed=$true;offHost=$true;authenticatedDecryptionVerified=$true;tables=20;triggers=45}
}else{$last=Get-Content -LiteralPath (Join-Path $root 'last-success.json') -Raw|ConvertFrom-Json}
if(!$last.passed -or !$last.offHost -or !$last.authenticatedDecryptionVerified -or $last.tables -ne 20 -or $last.triggers -ne 45 -or (Get-FileHash -LiteralPath $last.archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $last.sha256){throw 'VERIFIED_PRODUCTION_BACKUP_REQUIRED'}
if($Capsule){
 $secure=Read-Host 'Offline recovery capsule passphrase' -AsSecureString;$pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
 try{$passphrase=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer);$stream=Invoke-PrivatePhp (Join-Path $repo 'deployment/phase-4/capsule-restore-lines.php') @{capsule=(Resolve-Path -LiteralPath $Capsule).Path;passphrase=$passphrase;archive=$last.archive}}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer);$passphrase=$null}
}else{
 $store=Get-Content -LiteralPath (Join-Path $root 'recipient.dpapi.json') -Raw|ConvertFrom-Json
 Add-Type -AssemblyName System.Security.Cryptography.ProtectedData
 $entropy=[Text.Encoding]::UTF8.GetBytes('Unique Plastic Industry UPMS backups v1')
 $key=[Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($store.protectedKeyPair),$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
 try{$stream=Invoke-PrivatePhp (Join-Path $repo 'deployment/operations/backup-client.php') @{action='restore-lines';keyPair=[Convert]::ToBase64String($key);file=$last.archive}}finally{[Array]::Clear($key,0,$key.Length)}
}
try{
 $engine=Get-Content -LiteralPath $(if($EngineConfig){$EngineConfig}else{Join-Path $repo 'tmp/php-runtime/php2-engine.json'}) -Raw|ConvertFrom-Json
 $report=Invoke-PrivatePhp (Join-Path $repo 'scripts/p4-restore-production-local.php') @{engine=$engine;stream=$stream;archiveSha256=$last.sha256}
 $safe=$report|ConvertFrom-Json
 if(!$safe.passed){throw 'LOCAL_RESTORE_REJECTED'}
 [IO.File]::WriteAllText((Join-Path $repo 'docs/phase-4/evidence/production-restore-local.json'),$report,[Text.UTF8Encoding]::new($false))
 $safe|Select-Object passed,isolatedTarget,tables,guards,rows,sourceAndTargetRowsAndDefinitionsMatched,productionDatabaseWrites,independentOperatorGate|ConvertTo-Json
}finally{$stream=$null;$engine=$null}
