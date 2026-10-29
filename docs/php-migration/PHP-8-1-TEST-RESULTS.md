# PHP-8.1 test results

Status: **PARTIAL; production activation BLOCKED**. All results below are local synthetic tests. Owner-supplied hosting evidence is separately labeled; no GoDaddy authentication, business-record access, initialization, live provisioning, file deployment or DNS change occurred.

| Verification executed | Result |
| --- | --- |
| PHP2–6 legacy regression matrix, PHP8.3/8.4 | 10 passed;2,670 HTTP comparisons |
| Complete financial suite on canonical application schema, each admin/haris on each PHP version | 4 passed;1,708 HTTP comparisons;56 SQL snapshots |
| Fresh clean schema/system-only seed/two users/rotation/READY/Unicode/locking/idempotence/recovery | 76 checks passed on each PHP version |
| PHPUnit/security/transport mode/host boundary/inspection-vs-write profile tests,128MB | 83 tests/1,411 assertions passed on each PHP version |
| Express reference/designated policy suite | 293 passed |
| React | 210 tests/30 files passed;production build and lint passed |
| Inquiry validation, TLS, journal and bounded delivery parity | 68 comparisons/80 checks per PHP version passed |
| Additional PHP8.3 inquiry test at128MB | 68 comparisons/80 checks passed |
| Composer strict/platform/locked audit | Passed;dependency locks unchanged |
| Final PHP Pint | Passed;initial formatting failure corrected |
| Legacy-like synthetic full backup/restore | 20 tables/44 rows matched;source preserved;old admin/audit/initialization history included |
| Actual Linux Unix socket with TCP disabled | 9 checks passed;identity/path/UID/symlink/plain-TCP rejection;fresh20 tables/two users;posting remained disabled |
| Linux no-dev Laravel runtime at128MB | 4 checks passed;wrong-host boundaries and disabled DB response;peak20 MiB |
| Linux durable journal at128MB | 8 independent workers;one handoff;conflicting replay rejected;Unknown outcome not resent;peak6 MiB |
| Linux Apache nested-root and private-file/header checks | 13 passed |
| Linux staging artifact | 6,038 files;locked no-dev install/platform/audit;all manifest hashes and current backend source matched |
| Read-only artifact verifier | Accepted known manifest;rejected tampered payload and extra environment file;restored artifact passed |

Fresh tests verify all19 canonical application SHOW CREATE TABLE definitions, keys/indexes/FKs/decimal types, all text charsets and table engines; the new receipt makes20 tables. Initial business tables/users are empty before provisioning. Exactly two genuine administrator identities are then created and forced to rotate passwords; no test business data is seeded by initialization. Wrong Administrator membership cannot bind. READY alone cannot satisfy the production activation-receipt gate.

DDL tests inject interruption after committed DDL, reject ordinary retry, resume only reviewed matching empty tables, reject altered definitions/unowned nonempty targets/wrong target fingerprints, serialize initialization and reconcile a simulated post-commit private-receipt interruption without duplicating seed rows. They simulate interruption, not physical power loss. Receipts bind schema/server identity and plan version; private file writes require successful full write/flush/fsync. Actual provider durability/configuration still needs verification.

The four financial runs exercised the canonical19 application tables with both designated actors, including stock/production/purchases/challans/discounts/returns/payments/reversals/corrections/expenses, numbering, journals, reports, reconciliation and failure/race paths. Subsequent changes tightened private receipt identity/durability and were revalidated by final76-check fresh runs and the real Linux socket test; financial schema/calculation code did not change. Negative financial fixtures may include a non-designated user; that is separate from the fresh exactly-two-user production initializer acceptance.

Linux integration used privately extracted signature-verified tools: PHP8.3.6 with distribution security updates and MariaDB10.11.14. Financial engine tests used the guarded loopback MariaDB10.11.19 and Windows PHP8.3.36/8.4.27. This is not identical GoDaddy acceptance. Early isolated server fixtures lacked required helpers/MIME setup; final Linux socket/Apache tests passed after fixture corrections, without removing assertions or weakening security. The Windows Apache experiment did not pass and is not counted as acceptance. Composer's build memory allowance is separate from the128MB application tests.

Packaging fixes include the required private inquiry-mail worker, explicit SimpleV1 HTML mode, its /management/assets mapping, sibling private/public source layout, exact-host nested-root rules and independent read-only checksum verification. No Node server, Windows vendor, environment/secrets files, business dumps/fixtures, private keys, journals or generated runtime state are shipped. Canonical production DDL/catalog metadata is required code, not a UAT dump. The final manifest SHA256 is recorded in LOCAL-EVIDENCE; current staging paths are not approved GoDaddy destination paths.

## Not executed / remaining blocked

Actual GoDaddy protected DB transport/pins/grants, fresh schema creation, real administrators/password handoff, complete old backup/off-device restore, web/FPM worker execution/memory/aggregate limits, actual rewrite/PHP handler behavior, provider SMTP handshake/auth/inbox acceptance, trusted public management endpoint and final deployment/activation have not been performed. No real account credentials were entered through the self-signed public endpoint. Linux full financial HTTP parity was not separately rerun natively; it ran on both tested Windows PHP versions, while native Linux transport/initialization/no-dev runtime/journal were independently tested.

Reproduction: use the guarded local engine with scripts/php-7-management-regressions.mjs, PHP81_CANONICAL=true plus PHP8_DUAL_ADMIN=true/PHP8_DUAL_PRIMARY for php-6-differential.mjs, scripts/php-8-1-clean.mjs, php-7-5-automated.mjs and php-8-1-backup-rehearsal.mjs. The Linux release flow is php-8-1-release-source.mjs followed by linux-release-finalize.sh on supported Linux PHP/Composer. Use the trusted check-release.php with an independently approved manifest digest for subsequent read-only verification. Native Linux fixtures are in scripts/php-8-1-linux-*.php/.py; the local extracted-tool setup and logs are preserved privately under tmp and the Ubuntu user cache.

See [local evidence](PHP-8-1-LOCAL-EVIDENCE.json), [remaining operator checks](../../deployment/manual/PHP-8-1-README.md) and [readiness](PHP-8-1-DEPLOYMENT-READINESS.md). No local pass is a cutover approval.
