param()
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'));$private=Join-Path $root 'server/.local/production-readiness'
if(Test-Path -LiteralPath $private){throw 'Existing staging directory: preserve and inspect; never reinitialize'}
New-Item -ItemType Directory -Path $private|Out-Null
$acl=Get-Acl $private;$acl.SetAccessRuleProtection($true,$false)
foreach($sid in @([Security.Principal.WindowsIdentity]::GetCurrent().User,[Security.Principal.SecurityIdentifier]::new('S-1-5-18'))){$acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow'))};Set-Acl -LiteralPath $private -AclObject $acl
$saved=@{};Get-ChildItem Env:|ForEach-Object{$saved[$_.Name]=$_.Value};$buffers=[Collections.Generic.List[IntPtr]]::new()
try{
 foreach($name in @('ROOT','MIGRATOR','RUNTIME','OPERATOR','SESSION')){
  $bytes=[byte[]]::new(40);[Security.Cryptography.RandomNumberGenerator]::Fill($bytes);$secret=[Convert]::ToBase64String($bytes);[Array]::Clear($bytes,0,$bytes.Length)
  $secure=ConvertTo-SecureString $secret -AsPlainText -Force;$credential=[PSCredential]::new(('production-stage-'+$name),$secure);$credential|Export-Clixml -LiteralPath (Join-Path $private "$name.credential.clixml") -NoClobber
  [Environment]::SetEnvironmentVariable(('STAGE_'+$name+'_PASSWORD'),$secret,'Process')
 }
 $mysql=Join-Path $root 'tmp/production-readiness/mysql-runtime/mysql-8.4.13-winx64/bin/mysqld.exe';if(-not(Test-Path -LiteralPath $mysql)){throw 'Verified staging runtime missing'}
 if(Get-NetTCPConnection -State Listen -LocalPort 3311 -ErrorAction SilentlyContinue){throw 'Staging port already occupied'}
 $data=Join-Path $private 'mysql-data';$export=Join-Path $private 'mysql-export';New-Item -ItemType Directory -Path $data,$export|Out-Null
 $base=(Split-Path (Split-Path $mysql)).Replace('\','/');$priv=$private.Replace('\','/');$configuration=Join-Path $private 'mysql.ini'
 @("[mysqld]","basedir=$base","datadir=$priv/mysql-data","bind-address=127.0.0.1","port=3311","mysqlx=0","server-id=331124","log-error=$priv/mysql-error.log","secure-file-priv=$priv/mysql-export")|Set-Content -LiteralPath $configuration -Encoding utf8
 & $mysql "--defaults-file=$configuration" --initialize-insecure *> (Join-Path $private 'initialize.log');if($LASTEXITCODE -ne 0){throw 'Initialization stopped; preserve private logs'}
 $init=Join-Path $private 'first-start.sql';"ALTER USER 'root'@'localhost' IDENTIFIED BY '$env:STAGE_ROOT_PASSWORD';"|Set-Content -LiteralPath $init -Encoding utf8
 $process=Start-Process -FilePath $mysql -ArgumentList @("--defaults-file=$configuration","--init-file=$init") -WindowStyle Hidden -PassThru
 @{pid=$process.Id;port=3311;data=$data;purpose='new isolated synthetic production staging'}|ConvertTo-Json|Set-Content (Join-Path $private 'mysql-process.json')
 Push-Location $root
 try{& (Join-Path $root 'tmp/production-readiness/node22/node_modules/node/bin/node.exe') server/tools/production-staging.mjs provision;if($LASTEXITCODE -ne 0){throw 'Staging provisioning stopped; preserve partial state'}}finally{Pop-Location}
 Remove-Item -LiteralPath $init
}finally{
 foreach($buffer in $buffers){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($buffer)}
 Get-ChildItem Env:|ForEach-Object{if(-not $saved.ContainsKey($_.Name)){[Environment]::SetEnvironmentVariable($_.Name,$null,'Process')}};foreach($name in $saved.Keys){[Environment]::SetEnvironmentVariable($name,$saved[$name],'Process')}
}
