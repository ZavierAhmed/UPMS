# Reconciliation and recovery

New `EmployeeHaftaReconciliation` evaluates a detached snapshot: exact quantity/rate arithmetic, employee/item/document snapshots, posted source lines, unique earning relationships, opening coverage, settlement amounts, canonical money source/batch links, native entry hashes, master audit evidence and nonnegative verified payable. Orphan reserved money claims fail. Labor opening/payment command receipts must match the complete immutable entry hash and actor; production receipts remain tied to the original posted document. Legacy command checks are preserved.

Recovery has a distinct format, **UPMS_EMPLOYEE_HAFTA_SNAPSHOT_V1**. Merely accepting JSON is not compatibility. `EmployeeHaftaRecovery` requires the exact 34-table manifest, versioned DDL and 88 guard definitions plus full base financial, labor and command evidence before restoration. The old financial consumer rejects the new format without writing tables. Only a verified base projection is passed to the original base restorer, followed by additive labor schema/rows/guards, exact row comparisons and foreign-key checks.

The test archive is authenticated public-key encryption (libsodium sealed box), with wrong-recipient and corrupted-ciphertext rejection. Altered earning amount/employee/quantity, duplicate earnings and missing settlement are rejected. Keys, ciphertext and decrypted rows stay in the protected ignored synthetic fixture directory; committed evidence contains counts and checks, not credentials or archive contents.

Two genuine isolated restorations passed. The final one follows the actual browser payment: **34 tables, 88 guards, 674 rows**, matching financial/labor/command evidence. See `evidence/final-recovery.json`. The earlier pre-browser archive independently restored 656 rows. These are separate point-in-time fixtures, not competing totals.

Commands from repository root on the verified local engine:

```powershell
node scripts/uath1-integration.mjs
node scripts/uath1-browser.mjs
node scripts/uath1-final-recovery.mjs
```

The first creates fresh synthetic databases and a protected moving test pointer; it does not select the original owner UAT database. The next two require that pointer and operate only on that synthetic fixture. They are developer acceptance commands, not production backup jobs.

The existing operational 20-table/45-guard backup automation is unchanged and is **not declared compatible with 34/88**. Hosted migration, protected recurring export, off-host retention and an independent hosted recovery rehearsal require a separately reviewed future release. No production connection, backup job, activation setting or SMTP setting was changed.
