$ErrorActionPreference='Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)
$backupRoot=Join-Path (Get-Location) 'tmp/php-runtime/uat2a-owner-protection'
node --input-type=module -e "import {mkdir} from 'node:fs/promises';import {protectPrivateDirectory} from './scripts/php-7-5-private-directory.mjs';const p='tmp/php-runtime/uat2a-owner-protection';await mkdir(p,{recursive:true});await protectPrivateDirectory(p);"
if($LASTEXITCODE -ne 0){throw 'Private backup directory protection failed'}
Add-Type -AssemblyName System.Security.Cryptography.ProtectedData
$php=Join-Path (Get-Location) 'tmp/php-runtime/bin/php.exe'
$helper=Join-Path (Get-Location) 'upms.php/tests/Support/uat2a-owner-backup.php'
$recipient=('{"action":"keygen"}' | & $php $helper) | ConvertFrom-Json
if($LASTEXITCODE -ne 0){throw 'Recipient generation failed'}
$keyBytes=[Convert]::FromBase64String($recipient.keyPair)
try {
    $entropy=[Text.Encoding]::UTF8.GetBytes('UPMS UAT2A owner preupgrade backup')
    $sealed=[Security.Cryptography.ProtectedData]::Protect($keyBytes,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    $keyPath=Join-Path $backupRoot ('recipient-'+[Guid]::NewGuid().ToString('N')+'.dpapi')
    [IO.File]::WriteAllBytes($keyPath,$sealed)
    $ownerBinding=Get-Content -LiteralPath 'tmp/php-runtime/uat2-owner-binding.json' -Raw | ConvertFrom-Json
    $environmentBytes=[IO.File]::ReadAllBytes((Join-Path $ownerBinding.directory 'test.env'))
    try {
        $protectedEnvironment=[Security.Cryptography.ProtectedData]::Protect($environmentBytes,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
        [IO.File]::WriteAllBytes((Join-Path $backupRoot 'environment-before.dpapi'),$protectedEnvironment)
        $environmentRoundtrip=[Security.Cryptography.ProtectedData]::Unprotect($protectedEnvironment,$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
        try {if([Convert]::ToBase64String($environmentRoundtrip) -ne [Convert]::ToBase64String($environmentBytes)){throw 'Protected environment validation failed'}} finally {[Array]::Clear($environmentRoundtrip,0,$environmentRoundtrip.Length)}
    } finally {[Array]::Clear($environmentBytes,0,$environmentBytes.Length)}
    $roundtrip=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($keyPath),$entropy,[Security.Cryptography.DataProtectionScope]::CurrentUser)
    try {if([Convert]::ToBase64String($roundtrip) -ne $recipient.keyPair){throw 'DPAPI validation failed'}} finally {[Array]::Clear($roundtrip,0,$roundtrip.Length)}
    $engine=Get-Content -LiteralPath 'tmp/php-runtime/php2-engine.json' -Raw | ConvertFrom-Json
    $result=(@{action='backup';keyPair=$recipient.keyPair;password=$engine.password;rehearse=$true} | ConvertTo-Json -Compress | & $php $helper) | ConvertFrom-Json
    if($LASTEXITCODE -ne 0 -or !$result.passed){throw 'Owner backup or independent restore failed'}
    $result | Add-Member -NotePropertyName recipientProtection -NotePropertyValue 'Windows DPAPI CurrentUser'
    $result | Add-Member -NotePropertyName protectedRecipientFile -NotePropertyValue ([IO.Path]::GetFileName($keyPath))
    $result | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $backupRoot 'preflight.json')
    $result | Select-Object passed,tables,guards,authenticatedDecryptionVerified,independentRestorePassed,restoredRows,sourceRowsUnchanged,rehearsal,ownerDatabaseMigrated,productionContacted | ConvertTo-Json -Compress -Depth 8
} finally {
    [Array]::Clear($keyBytes,0,$keyBytes.Length)
    $recipient=$null
    $engine=$null
}
