[CmdletBinding()]
param([ValidateSet('All','Account')][string]$Check='All')
$ErrorActionPreference='Stop'
$repo=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$out=Join-Path $repo 'tmp/phase-4.3'
[void][IO.Directory]::CreateDirectory($out)
function Read-HostScript([string]$Name,[string]$Code){
 $si=[Diagnostics.ProcessStartInfo]::new()
 $si.FileName=Join-Path $env:WINDIR 'System32/OpenSSH/ssh.exe'
 $si.UseShellExecute=$false
 $si.CreateNoWindow=$true
 $si.RedirectStandardInput=$true
 $si.RedirectStandardOutput=$true
 $si.RedirectStandardError=$true
 foreach($arg in @('-T','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=15','tsn6az96j3v7@unique-plastic.com','/opt/alt/php83/usr/bin/php')){[void]$si.ArgumentList.Add($arg)}
 $p=[Diagnostics.Process]::new()
 $p.StartInfo=$si
 try{
  [void]$p.Start()
  $stdout=$p.StandardOutput.ReadToEndAsync()
  $stderr=$p.StandardError.ReadToEndAsync()
  $p.StandardInput.Write($Code)
  $p.StandardInput.Close()
  if(!$p.WaitForExit(90000)){$p.Kill($true);throw 'READ_ONLY_HOST_CHECK_TIMEOUT'}
  $raw=$stdout.GetAwaiter().GetResult()
  $err=$stderr.GetAwaiter().GetResult()
  if($p.ExitCode -ne 0){[IO.File]::WriteAllText((Join-Path $out ($Name+'.error.log')),$err);throw ($Name+' read-only SSH check failed')}
  $data=$raw|ConvertFrom-Json
  [IO.File]::WriteAllText((Join-Path $out ($Name+'.json')),$raw,[Text.UTF8Encoding]::new($false))
  return $data
 }finally{$p.Dispose()}
}
if($Check -eq 'Account'){
 $metadata=Read-HostScript 'account-preflight' ([IO.File]::ReadAllText((Join-Path $repo 'scripts/p43-account-preflight.php')))
 [pscustomobject]@{account=$metadata.account;hostname=$metadata.hostname;databasesStatus=$metadata.databases.status;quotaStatus=$metadata.limits.status;namingStatus=$metadata.mysqlRestrictions.status}|ConvertTo-Json
 return
}
$inventory=Read-HostScript 'host-inventory' ([IO.File]::ReadAllText((Join-Path $repo 'scripts/p4-host-inventory.php')))
$release=Read-HostScript 'host-release' ([IO.File]::ReadAllText((Join-Path $repo 'scripts/p4-host-release.php')))
$metadata=Read-HostScript 'account-preflight' ([IO.File]::ReadAllText((Join-Path $repo 'scripts/p43-account-preflight.php')))
@{account=$metadata.account;hostname=$metadata.hostname;schema=$inventory.identity.schema_name;tables=$inventory.tableCount;guards=$inventory.guardCount;grantsPassed=$inventory.privilegeVerification.passed;releasePassed=$release.passed;readOnly=$true}|ConvertTo-Json
