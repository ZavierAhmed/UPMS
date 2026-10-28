# PHP-1 completion and review report

Starting branch: `feature/upms-remote-cpanel-dev`.
Starting SHA: `bf749544a322715348966b75ceec49ffc5923468` (fetched and verified).
Delivery branch: `feature/upms-php-migration`. Final SHA is the pushed branch HEAD,
reported in the completion message; this document is part of that commit.

## Delivered

- Separate `upms.php/` application, Laravel **13.39.0**, PHP **8.3.36** locally,
  pinned Composer dependencies/lockfile, explicit extension requirements and PSR-12
  formatting. No PHP server depends on Node. Node is local build/reference-test tooling.
- Environment/endpoint/schema guard, native PDO prepared statements, strict SQL and
  UTC sessions, shared identity_guard transactions, rollback, modular identity/schema/
  exact-number/domain adapters, private sanitized errors/logging and health/readiness.
- Existing-identity authentication: Argon2id, case-normalized login, global/per-name
  throttling, two-worker hashing limit, enabled/version/permission/rotation checks,
  protected CSRF, secure host-only cookies, session regeneration, idle/absolute expiry,
  logout/password-change revocation and security audits.
- Ten Simple V1 GET routes: state, items, parties, documents, document detail,
  ledgers, overview, movements, register and reconciliation. Existing response fields,
  scalar types, decimal strings, return evidence and report conventions are retained.
- Five auth routes: GET session/csrf, POST session/login, GET session/current,
  POST session/logout, POST profile/password. All remain under `/api/v1/management`.
- GET/HEAD healthz liveness plus a new schema-only readyz endpoint, with no bootstrap.
- [153-contract API inventory](API-PARITY-MATRIX.md) with loop-generated routes,
  exact Express handler/service bodies and validation/source hashes in the linked JSON.
- [Business migration plan](BUSINESS-MIGRATION-PLAN.md),
  [hosting compatibility report](SHARED-HOSTING-COMPATIBILITY.md),
  [deployment layout/checklist](DEPLOYMENT-CHECKLIST.md),
  [schema findings](SCHEMA-COMPATIBILITY.md) and exact [changed-file list](FILES-CHANGED.txt).

## Verification

| Check | Result |
| --- | --- |
| PHPUnit | **59 tests, 436 assertions**, 0 failures/skips; PHP 8.3.36, MariaDB 10.11.19 |
| Differential read contracts | **39 actual Express HTTP response/status fixtures**, strict JSON scalar types and object/array shapes; only correlation UUID omitted |
| Reconciliation negative contracts | **6** temporary synthetic corruption cases matched Node's mismatches; restored after each; healthy state matched again |
| Argon2id | 2 Node-generated representative hashes, ASCII and Unicode, correct password succeeds/wrong password fails; stored hash unchanged |
| Authentication | Express login user JSON matched; PHP HTTP security/rotation/revocation/expiry/throttle/permission tests passed. This is not a live administrator login. |
| Money/stock | Above-JavaScript-safe-integer precision, overflow rejection, integer percent rounding, partial-return allocation telescoping; no float arithmetic |
| SQL safety | Native bound values, injection attempt denied, transaction rollback verified, business write denied by runtime grants |
| Read-only application behavior | All business tables/counters/commands unchanged by read endpoints |
| Existing Node regression | **290/290 passed**, Node 22.23.4, sequential full run |
| React regression | **188/188 passed**, 25 files; build and ESLint pass |
| Public assets | **111/111 SHA256-identical** before/after local build; public/management React sources unchanged |
| Schema comparison | **19 application tables / 107 columns** match recorded owner column types/nullability exactly; existing migration history preserved |
| Composer / style / CLI preflight | Valid manifest/lock and platform checks pass, no dependency advisories reported, Pint passes, required local extensions/Argon2id/writable directories pass |

The first concurrent Express run had two subprocess/network timing failures; both
passed in a 31-test focused sequential run and the complete 290-test sequential run.
Composer warns about exact-version constraints under strict validation; these pins
are intentional. The existing management build still emits its >500 kB chunk advisory.
Windows CLI preflight is not evidence of Linux web-SAPI or hosting performance.

## Preservation and differences

The existing Node backend, all source brochures, owner assets and backup evidence are
preserved. Only three remaining root-level generated Node publishing ZIPs were removed:
`artifacts/upms-management-node22.zip`, `artifacts/upms-management-node22 (2).zip`, and
`artifacts/upms-management-node24.zip`. The rollback/production-readiness archive tree
was left intact. No new hosting ZIP was generated.

Node's m,p,t Argon2id PHC header is reordered to m,t,p in memory for PHP verification;
no stored hash rewrite or administrator reset occurs. PHP uses a distinct cookie, so
switching to PHP requires sign-in with existing credentials rather than importing Node
cookie signatures. The test profile's state metadata retains `legacy-synthetic` like
the Express fixture profile; a future production profile must select its own purpose.

Unknown Simple V1 routes return 404; known financial/master-data writes return explicit
501 pending-review after authentication/CSRF. Legacy management modules remain 403
profile-disabled. Public inquiry and template weatherforecast compatibility are
inventoried but not converted. No success stub or frontend adapter was introduced.

## Review boundary and remaining blockers

No deployment, DNS change, live website edit, real database mutation, migration,
bootstrap, administrator credential reset or journal/counter rewrite occurred.
The owner database was inspected separately using its documented development
connection inside READ ONLY; automated tests/provisioning never connect to it.

The cPanel account's selected PHP/extensions, memory/time budget, private-directory
permissions, rewrite behavior and independent root must still be measured/verified.
Both available computer-use entry points failed to initialize with `failed to write
kernel assets`; no authenticated cPanel UI verification was possible in this session.
Official provider documentation confirms the local DB hostname default, but an actual
hosting-side connection remains untested. Laravel suitability is therefore conditional.

Remaining work is PHP-2 through PHP-8 in the migration plan: all financial/master-data
writes, public inquiries, complete browser/export acceptance, production profile,
Linux production vendor/package validation and reviewed hosted cutover. **Stop here
for review before implementing those write modules.**
