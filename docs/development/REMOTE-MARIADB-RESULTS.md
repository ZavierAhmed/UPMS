# Remote MariaDB results — 2026-10-26

Starting commit: `8757fd6984f399037caf18dc56721b75e2d51c61`.
Working/delivery branch: `feature/upms-remote-cpanel-dev`.
The final commit is the branch's pushed HEAD; use `git rev-parse HEAD` to retrieve it.

Changed source/documentation files:

- `package.json`
- `server/src/godaddy/policy.js`
- `server/src/identity/config.js`
- `server/src/index.js`
- `server/src/development/remote.js`
- `server/src/development/initialize.js`
- `server/tests/remote-development.test.js`
- `server/tools/remote-development.mjs`
- `server/tools/remote-initialization-rehearsal.mjs`
- `docs/development/REMOTE-MARIADB-SETUP.md`
- `docs/development/REMOTE-MARIADB-RESULTS.md`
- `docs/development/GODADDY-ARTIFACT-CLEANUP.md`

## Actual owner endpoint observations

Target approved by the owner: `184.168.100.110:3306`, intended schema `upms`,
intended user `upms_user`. The diagnostic connected from this Windows environment.
It read only the initial server greeting and then closed the socket. No authentication
response, username, password or SQL was sent.

| Observation | Actual result |
| --- | --- |
| TCP endpoint | Reachable |
| Unauthenticated advertised version | `5.5.5-10.11.19-MariaDB-cll-lve` |
| MySQL protocol CLIENT_SSL capability | Absent |
| Authenticated TLS | Not established; `TLS_NOT_ADVERTISED` |
| Certificate DNS name / CA | Not verified or invented |
| Engine identity | Advertised MariaDB 10.11.19 only; not authenticated evidence |
| Account/schema/server ID/UUID/read-only/recovery | Not queried |
| InnoDB/tables/empty-schema claim/migration history/grants | Not queried |
| Remote application/initialization/business writes | None |
| `dev:remote` execution | Stopped with `TLS_NOT_ADVERTISED`, `operationalWrites:false` |

Verdict: **this endpoint is currently unsuitable for authenticated remote UPMS access
under the required TLS policy**. The greeting does not distinguish whether TLS is
disabled, unavailable in this build, or removed by an intermediary. The provider must
resolve the missing TLS capability and supply an independently verified certificate
hostname/CA before credentialed diagnostics are possible. A client CA file alone cannot
fix missing server TLS support. The owner's reported empty schema remains unverified.

No password was needed for these real endpoint checks. No plaintext fallback, public
execution endpoint, publishing or hosting package was introduced.

## Local evidence, separate from the remote result

All database writes below were on newly initialized standalone test data directories
under ignored `tmp/production-readiness/remote-mariadb/`. Original local database
directories and the owner's remote database were not used. The dev startup workflow
starts no database. Test instances were bound only to `127.0.0.1`.

Official vendor test runtime: MariaDB **10.11.19**, Windows x64. Downloaded from
`https://archive.mariadb.org/mariadb-10.11.19/winx64-packages/` and verified against its
published SHA256 list:
`398ea30e5036010bbebe01d2b1804280424dcc2626e36d8e95155c04d25a0490`.
This vendor dependency download was not a newly generated deployment ZIP.

| Verification | Result |
| --- | --- |
| Backend suite, Node 22.23.4 | 280 passed, zero failed/skipped |
| Focused remote profile tests (included above) | 22 passed |
| Frontend suite | 185 passed across 24 files |
| Frontend build / ESLint | Passed; existing bundle-size advisory |
| Existing Simple V1 SQL regression suites | 16 + 20 tests passed on fresh MariaDB 10.11.19, loopback 3309/server ID 331627 |
| Challan-return SQL/browser acceptance | 15 checks passed on fresh MariaDB 10.11.19, loopback 3316/server ID 331626 |
| Initialization rehearsal | Eight checks passed, loopback 3317/server ID 331726 |
| Public build | All 111 non-management files identical by SHA256 before/after build |
| Generated GoDaddy cleanup | 35 files absent; 230 preserved artifact hashes unchanged |

The focused suite covers independent profile selection, wrong host/port/schema/user,
production/synthetic spoof rejection, no fallback, local origin, missing credentials,
engine mismatch, certificate/hostname/protocol failure before identity SQL, timeout,
disconnect, safe grant redaction, sanitized errors and remote initialization refusal.
TLS success/account diagnostics in that suite are **local simulations**, not evidence
that the owner endpoint supports TLS. The raw greeting parser is exercised using real
fragmented loopback TCP packets and a stalled connection. Existing TLS tests also run
in the backend suite. Real pooling, discarded-connection recovery and transaction
rollback were exercised during initialization rehearsal. Existing business suites
exercise auth/sessions, inventory/openings/stock-in, parties, challans and returns,
payments/ledgers, expenses/register, validation, idempotency and reporting behavior.

Initialization rehearsal verified: fresh three-step setup, repeat without duplicate
seeds, 19 application tables, no user/business bootstrap, rollback, pool reconnection,
concurrent pool reads and partial-schema refusal. A completed synthetic schema with an
intentionally unexpected table was preserved to test refusal; it was not reset.

Private test logs, credentials and browser evidence are under
`server/.local/remote-cpanel-dev/`, excluded from Git and public assets. Known local
secret values and raw connection/authentication patterns were checked against the
diagnostic/test logs before commit. No detected credential output was retained in
committed results. User-supplied untracked assets were neither modified nor staged.

## Proposed changes requiring owner review before remote writes

The exact migration set and 19 tables plus tracking table are listed in
[REMOTE-MARIADB-SETUP.md](REMOTE-MARIADB-SETUP.md). It is the identity foundation,
Simple V1 base, then entry fixes. Returns add no separate migration. No legacy ERP or
production-release tables are proposed. Initialization remains disabled for real `upms`.

After TLS is resolved, outstanding work is to collect authenticated read-only identity,
schema and grant evidence; approve the initialization/backup/account plan; then implement
and review runtime privilege acceptance and local backend activation. `upms_user` has
not been accepted as an operational account and the existing loopback-only runtime
grant validator remains unchanged. The new profile selects Simple V1 independently,
but this milestone deliberately does **not** make the remote application operational.
`npm run dev:remote` is the supported guarded startup/checkpoint command.

No deployment/publish, company data write, account creation on the remote server,
remote migration or new hosting ZIP occurred. Stop for review remains in force.
