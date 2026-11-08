[CmdletBinding()]
param([Parameter(Mandatory=$true)][string]$Destination,[switch]$Export,[switch]$OwnerConfirmedOfflineEncryptedUsb,[string]$ApplicationKeyFile,[string]$ApplicationKeyDpapiFile)
$ErrorActionPreference='Stop'
if($ApplicationKeyFile -and $ApplicationKeyDpapiFile){throw 'EXCLUSIVE_APPLICATION_KEY_SOURCE_REQUIRED'}
$repo=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$parent=(Resolve-Path -LiteralPath (Split-Path -Parent $Destination)).Path
$profile=[Environment]::GetFolderPath('UserProfile')
if($parent.StartsWith($repo,[StringComparison]::OrdinalIgnoreCase) -or $parent.StartsWith($profile,[StringComparison]::OrdinalIgnoreCase) -or (Test-Path -LiteralPath $Destination)){throw 'SEPARATE_NEW_OFFLINE_CUSTODY_PATH_REQUIRED'}
if(!$Export){@{prepared=$true;exported=$false;destinationOutsideRepositoryAndProfile=$true;requiresOwnerConfirmedEncryptedUsb=$true;requiresPrivatePassphraseEntry=$true;independentRecoveryGate='BLOCKED until separate computer/operator test'}|ConvertTo-Json;return}
if(!$OwnerConfirmedOfflineEncryptedUsb){throw 'OWNER_ENCRYPTED_USB_CONFIRMATION_REQUIRED'}
$first=Read-Host 'Recovery capsule passphrase (at least 20 characters; store separately in owner vault)' -AsSecureString
$second=Read-Host 'Repeat recovery capsule passphrase' -AsSecureString
$a=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($first);$b=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($second)
$key=$null;$applicationKey=''
try{
 $passphrase=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($a);$repeat=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($b)
 if($passphrase.Length -lt 20 -or $passphrase -cne $repeat){throw 'PASSPHRASE_CONFIRMATION_FAILED'}
 Add-Type -AssemblyName System.Security.Cryptography.ProtectedData
 $store=Get-Content -Raw -LiteralPath (Join-Path $repo 'tmp/protected-offhost-backups/recipient.dpapi.json')|ConvertFrom-Json
 $key=[Security.Cryptography.ProtectedData]::Unprotect([Convert]::FromBase64String($store.protectedKeyPair),[Text.Encoding]::UTF8.GetBytes('Unique Plastic Industry UPMS backups v1'),[Security.Cryptography.DataProtectionScope]::CurrentUser)
 if($ApplicationKeyFile){$applicationKey=[IO.File]::ReadAllText((Resolve-Path -LiteralPath $ApplicationKeyFile).Path).Trim()}
 if($ApplicationKeyDpapiFile){
  $appBytes=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $ApplicationKeyDpapiFile).Path),[Text.Encoding]::UTF8.GetBytes('UPMS P4.3 application key v1'),[Security.Cryptography.DataProtectionScope]::CurrentUser)
  try{$applicationKey=[Text.Encoding]::UTF8.GetString($appBytes).Trim();if($applicationKey -cnotmatch '^base64:[A-Za-z0-9+/]{43}=$'){throw 'APPLICATION_KEY_ENCODING_REJECTED'}}finally{[Array]::Clear($appBytes,0,$appBytes.Length)}
 }
 $start=[Diagnostics.ProcessStartInfo]::new();$start.FileName=Join-Path $repo 'tmp/php-runtime/bin/php.exe';$start.ArgumentList.Add((Join-Path $PSScriptRoot 'recovery-key-capsule.php'));$start.UseShellExecute=$false;$start.CreateNoWindow=$true
 $start.RedirectStandardInput=$true;$start.RedirectStandardOutput=$true;$start.RedirectStandardError=$true
 $utf8=[Text.UTF8Encoding]::new($false);$start.StandardInputEncoding=$utf8;$start.StandardOutputEncoding=$utf8;$start.StandardErrorEncoding=$utf8
 $process=[Diagnostics.Process]::new();$process.StartInfo=$start
 try{$null=$process.Start();$out=$process.StandardOutput.ReadToEndAsync();$err=$process.StandardError.ReadToEndAsync();$request=@{action='wrap';keyPair=[Convert]::ToBase64String($key);passphrase=$passphrase;applicationKey=$applicationKey;destination=$Destination;ownerConfirmedOfflineEncryptedUsb=$true};$process.StandardInput.Write(($request|ConvertTo-Json -Compress));$process.StandardInput.Close();if(!$process.WaitForExit(60000)){$process.Kill($true);throw 'CAPSULE_EXPORT_TIMEOUT'};$result=$out.GetAwaiter().GetResult();$null=$err.GetAwaiter().GetResult();if($process.ExitCode -ne 0){throw 'CAPSULE_EXPORT_FAILED'};$result}finally{$process.Dispose()}
}finally{if($key){[Array]::Clear($key,0,$key.Length)};[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($a);[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b);$passphrase=$null;$repeat=$null;$applicationKey=$null;$request=$null}
