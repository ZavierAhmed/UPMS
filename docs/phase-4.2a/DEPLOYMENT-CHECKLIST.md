# P4.2A deployment checklist

The baseline was verified at 2678cdb106df7339e54f265ba333a9e1bebfc1a8. Live provisioning, publication and activation remain outside this work.

| Item | Verified result |
|---|---|
| Hosted scope | Strict SSH identified cPanel account tsn6az96j3v7 on sg2plzcpnl508885.prod.sin2.secureserver.net. The account lists upms_v1, upms, upms_recovery84 and upms_security85. Proposed upms_v2 is absent. Confirm provider naming, allocation and effective grants before provisioning. |
| Existing recovery | Prior authenticated encrypted upms_v1 backup retains 20 tables, 45 triggers and 144 rows. SHA-256 5c20d7cefdcdbcdfad36d6208ff221f8262e10d338da5b71223f697090572868 rechecked. Preserve it and the existing management binding and release. |
| Public rollback | Verified P4.2 rollback archive SHA-256 cb2cd0ec0462a0bd5af3172518c3e406fd81840ccd5498f1544de3166ebd2723. |
| Static candidate | tmp/phase-4.2a/static/upms-public-static.zip, SHA-256 6f3ef919bacb29139c21bc165ec2891978912c70746e07ca5d1de7982a394525. Source a06db064063cc5c4ded9610801d90efcfbe8b12f. Catalogue-only. Public executable suffixes are denied before the static routes. |
| PHP review package | tmp/phase-4/artifacts/p42a-review/upms-p4-management-php.zip, SHA-256 b7f1ceb877032c2d1f611d5199719a3196e930bc885114f9f1fa7235bbc05a65. Source a06db064063cc5c4ded9610801d90efcfbe8b12f. Operational readiness remains false. |
| Isolated DDL | New empty MariaDB 10.11.19 schema reached 47 exact tables and indexes and 133 native triggers. Installer, definer and runtime authenticated as separate identities and matched exact scoped grants. Runtime CREATE TABLE was denied. A separate process resumed after interruption following CREATE and before its completion receipt. All 47 tables remained empty. |
| Production initialization | BLOCKED. The rehearsal verifies the DDL foundation only. No production-capable application startup, administrator enrollment or versioned production receipts were exercised. The PHP review package continues enforcing its existing contracts. |
| Recovery for 47/133 | BLOCKED for production. Prior isolated cumulative encrypted restore is reusable evidence. The production collector and authenticated decoder still pin the old schema. A versioned production collector, complete restore rehearsal and the actual independent USB operator acceptance remain required. |

Reproduce with the pinned Node 22 runtime and existing isolated engine:

```powershell
$node = './tmp/production-readiness/node22/node_modules/node/bin/node.exe'
& $node scripts/p42a-clean-schema-rehearsal.mjs
& $node scripts/p4-build.mjs
& $node scripts/p41-package-static.mjs --p42a
./scripts/p41-verify-static.ps1 -Browser -DenyExecutables -Evidence tmp/phase-4.2a -ArchiveRoot tmp/phase-4.2a/static
& $node scripts/p4-package.mjs --management-only --label=p42a-review
```

These build commands stamp the checked-out commit. Reproduce the recorded archive hashes from their source commit. Run the local DDL acceptance and Apache test harness from the final branch.

## Approval sequence

1. Check old recovery and exact public rollback bytes again. Review the proposed public file manifest for /home/tsn6az96j3v7/public_html and exclude dashboard, ACME and unrelated files. Approve the catalogue ZIP and public rewrite only after hosted validation of the candidate. Recheck public /gateway.php, /inquiry.php, PDFs, contact links and management gateway routing after any approved cutover.
2. Before requesting SQL provisioning, establish the approved empty target name and exact cPanel accounts. Proposed identities are upms_init_v2, upms_runtime_v2, upms_guard_v2 and upms_backup_v2. Verify provider availability, scoped effective grants and how trigger metadata is read without giving the runtime DDL or TRIGGER privileges. No drop or modification of upms_v1, upms, upms_recovery84 or upms_security85 is proposed.
3. Complete the private PHP production initializer, with authentic target-bound opening and activation receipts, guard-definer validation, private administrator enrollment and forced password change. Current production receipt checks and cumulative feature prerequisites stay in force. Exercise production-contract startup, two administrator logins and the business workflow suite in isolated staging. Do not seed test business rows into the final install.
4. Review proposed new private backend directory /home/tsn6az96j3v7/upms-releases/p42a/private/backend, management asset manifest, credentials handoff and private binding. Approve exact matching package and binding only once step 3 passes. Leave old binding and release available for rollback.
5. Authorize live operations separately after hosted acceptance, evidenced business openings, 47/133 backup and restore proof and signed independent recovery. Keep SMTP and operational attachments disabled.

Acceptance details: 156 loopback Apache checks passed, including public gateway.php, its path-info variant, legacy inquiry.php, ACME and the separate management gateway fixture. Chrome verified gallery and contact links with inquiry disabled. All 5,978 extracted PHP package files matched the manifest and the packaged Laravel autoloader loaded under PHP 8.3.36 CLI. These are isolated checks. The live public rewrite was not changed.
