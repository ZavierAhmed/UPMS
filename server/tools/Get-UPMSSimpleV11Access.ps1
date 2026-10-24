$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'));$private=Join-Path $root 'server/.local/simple-v11';$meta=Get-Content (Join-Path $private 'v11-demo-provisioned.json') -Raw|ConvertFrom-Json
if($meta.schema -ne 'upms_test_simplev11_demo_20261024_01'){throw 'Unexpected demo target'}
$credential=Import-Clixml (Join-Path $private 'v11-demo-operator.credential.clixml');if($credential.UserName -ne 'v1_operator'){throw 'Unexpected operator'}
$buffer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($credential.Password)
try{Set-Clipboard -Value ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($buffer));Write-Output 'V1.1 demo username: v1_operator. Private password copied to clipboard; paste locally, then clear the clipboard.'}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($buffer)}
