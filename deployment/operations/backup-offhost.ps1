[CmdletBinding()]
param([ValidateSet('Initialize','Run','RestoreTest')][string]$Mode='Run')
$ErrorActionPreference='Stop'
$repo=(Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$root=[IO.Path]::GetFullPath((Join-Path $repo 'tmp/protected-offhost-backups'))
$php=Join-Path $repo 'tmp/php-runtime/bin/php.exe'
$worker=Join-Path $PSScriptRoot 'backup-client.php'
$collector=Join-Path $PSScriptRoot 'export-protected-backup.php'
$ssh=Join-Path $env:WINDIR 'System32/OpenSSH/ssh.exe'
$scp=Join-Path $env:WINDIR 'System32/OpenSSH/scp.exe'
$server='tsn6az96j3v7@unique-plastic.com'
$stage='/home/tsn6az96j3v7/upms-php83-staging'
$remoteScript=$stage+'/php85-tools/export-protected-backup.php'
$phase='private-directory'
$lockStream=$null
function Invoke-Captured([string]$Exe,[string[]]$CommandArguments,[string]$InputText='') {
    $si=[Diagnostics.ProcessStartInfo]::new();$si.FileName=$Exe;$si.UseShellExecute=$false;$si.CreateNoWindow=$true
    $si.RedirectStandardInput=$true;$si.RedirectStandardOutput=$true;$si.RedirectStandardError=$true
    foreach($argument in $CommandArguments){$si.ArgumentList.Add($argument)}
    $proc=[Diagnostics.Process]::new();$proc.StartInfo=$si
    try {
        if(!$proc.Start()){throw 'PROCESS_START_FAILED'}
        if($InputText){$proc.StandardInput.Write($InputText)};$proc.StandardInput.Close()
        $outTask=$proc.StandardOutput.ReadToEndAsync();$errTask=$proc.StandardError.ReadToEndAsync()
        if(!$proc.WaitForExit(180000)){$proc.Kill($true);throw 'PROCESS_TIMEOUT'}
        $out=$outTask.GetAwaiter().GetResult();$discardedError=$errTask.GetAwaiter().GetResult()
        if($proc.ExitCode -ne 0){throw 'CHILD_PROCESS_FAILED'}
        return $out
    } finally {$proc.Dispose()}
}
function Invoke-Worker([hashtable]$RequestData) {
    $result=Invoke-Captured $php @($worker) ($RequestData | ConvertTo-Json -Depth 20 -Compress)
    return ($result | ConvertFrom-Json)
}
function Invoke-Ssh([string]$Command) {
    return Invoke-Captured $ssh @('-T','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=15',$server,$Command)
}
function Copy-Remote([string]$Source,[string]$Target) {
    $null=Invoke-Captured $scp @('-q','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=15',$Source,$Target)
}
function Ensure-PrivateDirectory {
    if(!$root.StartsWith($repo+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'LOCAL_BACKUP_BOUNDARY_REJECTED'}
    if(!(Test-Path -LiteralPath $root)){[void][IO.Directory]::CreateDirectory($root)}
    if((Get-Item -LiteralPath $root).Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'LOCAL_BACKUP_SYMLINK_REJECTED'}
    $script:phase='directory-acl'
    $identity=[Security.Principal.WindowsIdentity]::GetCurrent()
    $allowed=@($identity.User.Value,'S-1-5-18')
    $acl=Get-Acl -LiteralPath $root
    $rules=@($acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]))
    $private=$acl.AreAccessRulesProtected -and $rules.Count -eq 2 -and @($rules | Where-Object {$_.IdentityReference.Value -notin $allowed -or $_.AccessControlType -ne 'Allow' -or $_.FileSystemRights -ne 'FullControl'}).Count -eq 0
    if(!$private){
        $null=Invoke-Captured (Join-Path $env:WINDIR 'System32/icacls.exe') @($root,'/inheritance:r','/grant:r',('*'+$identity.User.Value+':(OI)(CI)F'),'*S-1-5-18:(OI)(CI)F')
        $acl=Get-Acl -LiteralPath $root;$rules=@($acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier]))
        if(!$acl.AreAccessRulesProtected -or $rules.Count -ne 2 -or @($rules | Where-Object {$_.IdentityReference.Value -notin $allowed -or $_.AccessControlType -ne 'Allow' -or $_.FileSystemRights -ne 'FullControl'}).Count -ne 0){throw 'PRIVATE_ACL_REQUIRED'}
    }
    $script:phase='git-exclusion'
    $ignored=Invoke-Captured (Get-Command git).Source @('-C',$repo,'check-ignore','tmp/protected-offhost-backups/private-check')
    if(!$ignored.Trim()){throw 'GIT_IGNORE_REQUIRED'}
}
try {
    Ensure-PrivateDirectory
    $lockStream=[IO.File]::Open((Join-Path $root '.backup.lock'),[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)
    Add-Type -AssemblyName System.Security.Cryptography.ProtectedData
    $entropy=[Text.Encoding]::UTF8.GetBytes('Unique Plastic Industry UPMS backups v1')
    $keyPath=Join-Path $root 'recipient.dpapi.json'
    $phase='recipient-key'
    if(!(Test-Path -LiteralPath $keyPath)) {
        $generated=Invoke-Worker @{action='keygen'}
        $keyBytes=[Convert]::FromBase64String($generated.keyPair)
        $protected=[Security.Cryptography.ProtectedData]::Protect($keyBytes,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
        [Array]::Clear($keyBytes,0,$keyBytes.Length)
        $store=@{version=1;publicKey=$generated.publicKey;protectedKeyPair=[Convert]::ToBase64String($protected);createdUtc=[DateTimeOffset]::UtcNow.ToString('o');protection='Windows DPAPI CurrentUser'}
        [IO.File]::WriteAllText($keyPath,($store | ConvertTo-Json),[Text.UTF8Encoding]::new($false))
        $generated=$null
    }
    $store=Get-Content -Raw -LiteralPath $keyPath | ConvertFrom-Json
    $publicBytes=[Convert]::FromBase64String($store.publicKey)
    $sha=[Security.Cryptography.SHA256]::Create();try{$keyId=([BitConverter]::ToString($sha.ComputeHash($publicBytes))).Replace('-','').ToLowerInvariant()}finally{$sha.Dispose()}
    $publicFile=Join-Path $root 'recipient.pub';[IO.File]::WriteAllText($publicFile,$store.publicKey+"`n",[Text.UTF8Encoding]::new($false))
    $sourceHash=(Get-FileHash -LiteralPath $collector -Algorithm SHA256).Hash.ToLowerInvariant()
    if($Mode -eq 'Initialize') {
        $phase='publish-public-recipient'
        $existing=Invoke-Ssh "if test -f '$stage/runtime/offhost-recipient.pub'; then cat '$stage/runtime/offhost-recipient.pub'; fi"
        if($existing.Trim() -and $existing.Trim() -cne $store.publicKey){throw 'EXISTING_REMOTE_RECIPIENT_MISMATCH'}
        if(!$existing.Trim()){Copy-Remote $publicFile ($server+':'+$stage+'/runtime/offhost-recipient.pub')}
        $remoteHash=Invoke-Ssh "if test -f '$remoteScript'; then sha256sum '$remoteScript'; fi"
        if($remoteHash.Trim() -and ($remoteHash.Trim() -split '\s+')[0] -cne $sourceHash){throw 'EXISTING_COLLECTOR_REVIEW_REQUIRED'}
        if(!$remoteHash.Trim()){Copy-Remote $collector ($server+':'+$remoteScript)}
        $null=Invoke-Ssh "chmod 600 '$stage/runtime/offhost-recipient.pub' '$remoteScript'"
        @{prepared=$true;recipientSha256=$keyId;collectorSha256=$sourceHash;destination=$root;privateKeyUploaded=$false} | ConvertTo-Json
        return
    }
    if($Mode -eq 'RestoreTest') {
        $phase='isolated-recovery-prepare'
        $last=Get-Content -Raw -LiteralPath (Join-Path $root 'last-success.json') | ConvertFrom-Json
        if(!(Test-Path -LiteralPath $last.archive) -or (Get-FileHash -LiteralPath $last.archive -Algorithm SHA256).Hash.ToLowerInvariant() -cne $last.sha256){throw 'RESTORE_SOURCE_CHECKSUM_REJECTED'}
        $prepared=Invoke-Ssh "/opt/alt/php83/usr/bin/php '$stage/php85-tools/verify-offhost-restore.php' --prepare" | ConvertFrom-Json
        if(!$prepared.prepared){throw 'ISOLATED_RESTORE_PREPARATION_FAILED'}
        $keyBytes=[Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($store.protectedKeyPair),$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
        try {$plainStream=Invoke-Captured $php @($worker) (@{action='restore-lines';keyPair=[Convert]::ToBase64String($keyBytes);file=$last.archive} | ConvertTo-Json -Compress)}finally{[Array]::Clear($keyBytes,0,$keyBytes.Length)}
        $phase='isolated-recovery-restore'
        try {$result=Invoke-Captured $ssh @('-T','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes',$server,"/opt/alt/php83/usr/bin/php '$stage/php85-tools/verify-offhost-restore.php' --restore") $plainStream | ConvertFrom-Json} finally {$plainStream=$null}
        if(!$result.passed){throw 'OFFHOST_RESTORE_TEST_FAILED'}
        [IO.File]::WriteAllText((Join-Path $root 'restore-test.json'),($result | ConvertTo-Json -Depth 10),[Text.UTF8Encoding]::new($false))
        $result | ConvertTo-Json -Depth 10
        return
    }
    $phase='collector-integrity'
    $remoteHash=Invoke-Ssh "sha256sum '$remoteScript'"
    if(($remoteHash.Trim() -split '\s+')[0] -cne $sourceHash){throw 'REMOTE_COLLECTOR_PIN_REJECTED'}
    $phase='encrypted-consistent-snapshot'
    $snapshot=Invoke-Ssh "/opt/alt/php83/usr/bin/php '$remoteScript' --recipient-sha256=$keyId" | ConvertFrom-Json
    if(!$snapshot.passed -or $snapshot.sha256 -cnotmatch '^[a-f0-9]{64}$' -or $snapshot.recipientSha256 -cne $keyId){throw 'REMOTE_SNAPSHOT_REJECTED'}
    $leaf=[IO.Path]::GetFileName($snapshot.file)
    if($leaf -cnotmatch '^upms-[0-9]{8}T[0-9]{6}Z-[a-f0-9]{12}\.upmsbk$' -or $snapshot.file -cne ($stage+'/protected-backups/'+$leaf)){throw 'REMOTE_BACKUP_PATH_REJECTED'}
    $temp=Join-Path $root ($leaf+'.download');$complete=Join-Path $root $leaf
    if((Test-Path -LiteralPath $temp) -or (Test-Path -LiteralPath $complete)){throw 'EXISTING_BACKUP_REVIEW_REQUIRED'}
    $phase='off-host-transfer';Copy-Remote ($server+':'+$snapshot.file) $temp
    if((Get-FileHash -LiteralPath $temp -Algorithm SHA256).Hash.ToLowerInvariant() -cne $snapshot.sha256){throw 'OFFHOST_CHECKSUM_MISMATCH'}
    $phase='authenticated-decryption-validation'
    $keyBytes=[Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($store.protectedKeyPair),$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    try {$validation=Invoke-Worker @{action='validate';keyPair=[Convert]::ToBase64String($keyBytes);file=$temp}} finally {[Array]::Clear($keyBytes,0,$keyBytes.Length)}
    if(!$validation.passed -or $validation.tables -ne 20 -or $validation.triggers -ne 45 -or !$validation.finalTagVerified){throw 'OFFHOST_DECRYPTION_VALIDATION_FAILED'}
    Move-Item -LiteralPath $temp -Destination $complete
    $receipt=@{passed=$true;archive=$complete;sha256=$snapshot.sha256;bytes=$snapshot.bytes;createdUtc=$validation.createdUtc;verifiedUtc=[DateTimeOffset]::UtcNow.ToString('o');tables=$validation.tables;triggers=$validation.triggers;rowCounts=$validation.rowCounts;authenticatedDecryptionVerified=$true;plaintextWrittenToDisk=$false;privateKeyProtection='Windows DPAPI CurrentUser';privateKeyUploaded=$false;databaseWrites=0;offHost=$true;collectorSha256=$sourceHash}
    [IO.File]::WriteAllText(($complete+'.receipt.json'),($receipt | ConvertTo-Json -Depth 10),[Text.UTF8Encoding]::new($false))
    [IO.File]::WriteAllText((Join-Path $root 'last-success.json'),($receipt | ConvertTo-Json -Depth 10),[Text.UTF8Encoding]::new($false))
    $receipt | ConvertTo-Json -Depth 10
} catch {
    $failure=@{passed=$false;stage=$phase;code='PROTECTED_OFFHOST_BACKUP_FAILED';exceptionType=$_.Exception.GetType().FullName;secretsPrinted=$false;failedUtc=[DateTimeOffset]::UtcNow.ToString('o')}
    if(Test-Path -LiteralPath $root){[IO.File]::WriteAllText((Join-Path $root 'last-failure.json'),($failure | ConvertTo-Json),[Text.UTF8Encoding]::new($false))}
    $failure | ConvertTo-Json
    throw "Protected off-host backup failed at stage: $phase. No database changes or plaintext disclosure."
} finally {if($null -ne $lockStream){$lockStream.Dispose()}}
