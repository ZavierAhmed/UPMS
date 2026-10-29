# PHP-8.2 — executed tests and evidence

Only isolated local fixtures were used. No GoDaddy authentication, record access, import, provisioning, file deployment, mail delivery or activation occurred. Prior PHP-8.1 evidence is preserved and is not counted as a fresh run.

| Executed suite | Final result |
| --- | --- |
| SQL import/finalize/two-admin HTTP acceptance, PHP8.3.36 /128M |149 checks PASS |
| Same changed import path, PHP8.4.27 /128M |149 checks PASS |
| Existing initializer targeted regression, PHP8.3.36 |76 checks PASS |
| PHP unit/feature regressions, both versions /128M |89 tests /1,468 assertions each PASS |
| Financial/authentication parity, PHP8.3, Haris primary, SQL-imported schemas |427 HTTP comparisons /14 database snapshots PASS |
| React |210 tests /30 files PASS |
| React lint and public SSR/prerender + management builds |PASS; existing chunk-size advisory |
| Pint complete upms.php |PASS |
| Deterministic package/bundle, file manifest/lint, safe missing-profile diagnostic |29 checks PASS |
| Native Linux socket/SELECT-only, DELIMITER import, pin/auth/socket/permissions/encoding negatives |23 checks PASS |
| Linux no-dev runtime with database disabled |4 host/startup gate checks PASS |
| Linux Composer strict validation/no-dev install/platform/audit |PASS, no advisories returned |
| Current Linux release source/hash verification |6,041 manifest files PASS |
| Release tampering/unmanifested file rejection, restoration recheck |PASS |
| SQL package incomplete-manifest/SQL tampering and diagnostic redaction |PHP unit tests PASS; final package targeted4 tests/43 assertions also PASS |

Import acceptance checks the exact twenty-table set and SHOW CREATE TABLE definitions, utf8mb4 despite latin1 initial default, zero initial users/business/auth rows, catalogs/control/numbering, unbound intermediate receipt, genuine target-bound finalization and one audit, matching-intent retry, wrong digest, blocked pre-finalization provisioning/activation, two distinct Argon2id accounts/forced rotations, cross-user replay rejection, both actors' management reads and stock/challan/payment/expense writes with independent attribution, repeated/nonempty/reserved-target refusal, altered schema/seed rejection and interrupted-import review. Reserved-target testing substitutes the selected-name expression only within a synthetic fixture; it never opens or creates an actual old upms database.

The Windows engine is positively identified loopback-only MariaDB10.11.19/port3330 with pinned synthetic datadir. Native Linux uses a separate private MariaDB10.11.14/PHP8.3.6 distro-security fixture with networking disabled, not an asserted exact GoDaddy runtime. It tests the actual MariaDB client DELIMITER path and a real SELECT-only PDO connection. Full ProductionProfile correctly rejects synthetic schemas; private profile loading/permissions/encoding are tested separately without connecting any nonsynthetic target. Actual GoDaddy standalone diagnostic success remains unverified.

Issues found and corrected: initial PHPUnit run lacked its generated contract environment; required synthetic fixtures were generated and both complete runs passed. Native client needed privately extracted signed Ubuntu ncurses/tinfo libraries; no system packages/services were changed. Expanded HTTP acceptance found the old single-operator management-read restriction; the shared OperatorPolicy fix now passes both actors' reads and writes. Artifact formatting changes were followed by regeneration and a byte-identical repeat check. Windows and native Linux generator outputs were round-tripped with LF-only artifact verification.

Not rerun: full2670-comparison legacy matrix, all four427-case primary/PHP combinations, unchanged293-test Express suite, unchanged SMTP/inquiry/journal matrix, native Apache13-case suite and browser visual UAT. Their PHP-8.1 evidence remains historical. Targeted legacy initialization was rerun because receipt DDL loading changed; financial parity and both-actor acceptance cover the new path. No actual hosting checks or backup/restore were executed.

## Artifact identities

SQL SHA-256: `cba317ebaf5571112e1f19c3d4aff5b2aa8af14764e4355eecbe850fe110aa29`

Package manifest SHA-256: `0de16efa7c653ad1fb8ba83b97419a03767514eec2ed71312ec983539aaa2312`

Standalone diagnostic SHA-256: `ab3f165f5976d80480c6e8cc36e62b2e080fbe99265f56cb74021134a8951045`

Linux local release manifest SHA-256: `34342d6019bef464bfed052dadf4eaa77a342248b5a1a6a27b41716d9b74ea26`

SQL is locally import-ready **only for an explicitly verified, approved new empty target**. This does not authorize actual import or satisfy production gates. The SQL contains canonical catalogs only: no credentials/hashes, old rows, dummy business data or old initialization marker. Detailed safe evidence and log hashes are in PHP-8-2-LOCAL-EVIDENCE.json. Production remains BLOCKED; see PHP-8-2-REMAINING-BLOCKERS.md.
