# PHP-8 test results — local preparation, production NO-GO

Baseline: 0a2060df79f1bfde576e814c3df61c30364aba50. Branch: feature/upms-php-8-production-deployment. No production access, business-record change, account creation or deployment occurred in this continuation.

| Local verification | Result |
| --- | --- |
| Legacy PHP2–6 financial parity on PHP8.3/8.4 | 10 runs passed; 2,670 HTTP comparisons |
| Complete financial suite with explicit dual-admin policy | admin and haris each passed on PHP8.3/8.4; 1,708 HTTP comparisons / 56 SQL snapshots |
| Dedicated provisioning/dual-admin HTTP suite | 41 checks each on PHP8.3/8.4 passed |
| PHPUnit including profile validation guards | 79 tests / 1,377 assertions on each PHP version passed |
| Express reference plus designated-policy tests | 293 passed |
| React | 210 tests / 30 files passed; build and lint passed |
| Inquiry parity/TLS fixtures | 68 comparisons / 80 checks on each PHP version passed (PHP8.3 rerun) |
| Manual metadata/process/scratch and SMTP argument guards | 24 checks each on PHP8.3/8.4 passed; no actual SMTP contacted |
| Mocked hosting-observer safety contracts | 3 passed; no live observer rerun |
| Composer strict/platform/locked audit | Passed; dependencies unchanged |
| Full PHP Pint | Final check passed |
| Synthetic backup/restore rehearsal | 19 tables / 93 rows restored to fresh synthetic schema; source preserved |
| Source-only artifact | 175 files, SHA256/size manifest and exclusion checks; NOT DEPLOYABLE |

All database tests used the guarded, separately identified loopback MariaDB10.11.19 engine on port3330 and fresh synthetic names. No historical owner/UAT schema was cleared or overwritten. Dedicated provisioning preserves existing hashes, IDs and control, verifies receipt idempotence/conflicts, and exercises forced rotation, both writers, concurrency, actual actor IDs, cross-actor replay, revocation and READY. Complete financial runs cover stock, parties/openings, production/purchases, challans/discounts/returns, payments/reversals/corrections, expenses, reports, reconciliation, failures, races and rollback through both implementations. They are synthetic acceptance, not actual-host acceptance.

The first collector found PHP8.3 inquiry concurrency returning the service's bounded busy response while parallel suites ran; its unchanged rerun passed all68/80. Pint found one formatting issue, corrected before the final successful check. The Express audit-query mock was updated to support latest-event ordering and both rotation actions; the full293 suite then passed. An initial standalone PHPUnit invocation omitted the engine port setting and failed its configuration guard; correctly configured reruns passed79/1377 each. No certificate or test expectation was weakened to obtain these results.

The manual SMTP probe's positive handshake against the actual account is NOT VERIFIED. Existing inquiry tests independently exercise trusted/untrusted TLS and bounded SMTP outcomes locally. Default manual capability checks are read-only; scratch writes and fixed child execution are opt-in. PowerShell syntax was parsed locally; the origin/SSH checks have not been executed against production during this continuation.

Actual hosting/private roots/web runtime/process/locking/SMTP capability, trusted management HTTPS, protected production DB transport and grants, real-data classification, owner backup/recovery, Linux final package and matching staging remain BLOCKED. The production profile is disabled/unpopulated; only negative configuration tests are locally accepted. No real credentials or cPanel token is committed. No go-live claim follows from local green results.

See [manual hosting instructions](../../deployment/manual/README.md), [local preparation](PHP-8-LOCAL-PREPARATION.md), [data preservation](PHP-8-PRODUCTION-DATA-AUDIT.md) and [recovery plan](PHP-8-BACKUP-ROLLBACK.md). LOCAL-EVIDENCE records sanitized summaries and hashes of ignored private test logs. Historical PHP7.9 browser/owner acceptance is not relabeled as a fresh PHP8 production test.
