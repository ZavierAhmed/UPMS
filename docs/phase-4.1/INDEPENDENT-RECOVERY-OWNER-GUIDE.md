# Independent recovery owner guide

Gate BLOCKED until the actual designated operator completes and signs the restore from a separate computer and account. Use the production archive whose SHA-256 is add202f15bd136aeba4c27b0d3a4abf8cc656f0c4b014e79fe758ebc523803eb and the matching P4.0 production restore receipt.

1. Attach and unlock the owner-controlled encrypted USB on the original backup computer. Choose a new destination outside the repo and profile. Run the preflight and review the destination.
2. Run the export with both confirmation switches. Enter the passphrase at the private prompt. Compare the returned capsule digest with Get-FileHash on the USB and store the passphrase separately in the owner vault. Store the encrypted USB offsite.
3. Provide the operator a copy of the actual encrypted archive via a channel separate from the key capsule. Verify the archive digest before restore.
4. On the separate computer, prepare the reviewed repository, PHP sodium runtime and disposable loopback MariaDB engine. Use a private engine config accepted by the pinned restore tool, with a separate data directory and restore administrator. Validate the engine binding before entering any passphrase.
5. Execute the capsule restore with the archive digest pinned. Verify 20 tables, 45 guards, 140 rows, every canonical row-set digest and protected mutation denial against the P4.0 receipt. Stop on mismatch and preserve the evidence.
6. Record operator identity, separate device/account confirmation, date, archive and capsule fingerprints, target isolation, result and operator signature. Keep the signed receipt in protected custody. Publish only redacted result metadata.

```powershell
./deployment/phase-4/export-recovery-key.ps1 -Destination 'E:/UPMS/recovery.json'
./deployment/phase-4/export-recovery-key.ps1 -Destination 'E:/UPMS/recovery.json' -Export -OwnerConfirmedOfflineEncryptedUsb
Get-FileHash -Algorithm SHA256 -LiteralPath 'E:/UPMS/recovery.json'
./scripts/p4-restore-production-local.ps1 -Capsule 'E:/UPMS/recovery.json' -Archive 'D:/Recovery/approved.upms' -ExpectedArchiveSha256 'add202f15bd136aeba4c27b0d3a4abf8cc656f0c4b014e79fe758ebc523803eb' -EngineConfig 'D:/Recovery/private-engine.json'
```

Use actual private paths. The current 20/45 collector remains in service. A future version must pin 47/133, include encrypted attachment rows and their authenticated metadata, and verify the separately escrowed application key on the independent environment. Prove wrong key, truncation, tampering, missing attachment and recovery version rejection. Keep old archives recoverable with the versioned decoder. Never store recovery secrets in Git, production files or backup payloads.

Before running the restore, create the repository's tmp/protected-offhost-backups directory with access limited to the designated operator and SYSTEM. Use a fresh recovery checkout and empty protected directory. The worker writes the binding and a separate independent-restore receipt there, preserving the P4.0 historical receipt. The tool records capsule use, while the signed independent operator/device result remains a separate gate.

The recovery engine config uses integer port 3330, the exact private MariaDB data-directory path in data, a local recovery administrator in adminUser, and its secret password. Store the config with operator-only access. The tool checks MariaDB 10.11.19 and the loopback binding before creating a fresh schema.

Compare the signed receipt with the original evidence before accepting recovery:

```powershell
$approved = Get-Content -Raw docs/phase-4/evidence/production-restore-local.json | ConvertFrom-Json
$recovered = Get-Content -Raw -LiteralPath '<protected independent restore receipt>' | ConvertFrom-Json
if (!$recovered.passed -or $recovered.originalWindowsOperatorRequired -or
    $recovered.sourceCipherSha256 -ne $approved.sourceCipherSha256 -or
    $recovered.tables -ne 20 -or $recovered.guards -ne 45 -or $recovered.rows -ne 140) {
  throw 'Independent recovery receipt mismatch'
}
foreach ($table in $approved.tableEvidence.PSObject.Properties) {
  $actual = $recovered.tableEvidence.PSObject.Properties[$table.Name].Value
  if (!$actual.definitionMatched -or $actual.rows -ne $table.Value.rows -or
      $actual.canonicalRowSetSha256 -ne $table.Value.canonicalRowSetSha256) {
    throw "Independent recovery table mismatch $($table.Name)"
  }
}
```

The independent operator should sign a dated record with the archive digest, capsule digest, evidence digest, device/account separation, isolation and guard-check outcome. The owner reviews that record and confirms offsite USB and separate passphrase custody. The automated result cannot establish the human custody and device facts.
