# Remote MariaDB local development

Current status: **schema initialized and administrator created after explicit owner
approval; persistent operational application access remains blocked**. The owner also
explicitly allowed plaintext for the approved setup. TLS is still unavailable, and
the default preflight/runtime security gates remain unchanged. See the follow-up in
[REMOTE-MARIADB-RESULTS.md](REMOTE-MARIADB-RESULTS.md).

The original TLS assessment below predates that approval.
The 2026-10-26 check of the owner-approved endpoint did not advertise TLS. A successful
Workbench plaintext connection is not evidence of authenticated TLS. No remote schema,
account, table count, migration history, InnoDB state or grants have been verified.

## Private Windows settings

Use Node 22.23.4 or newer in Node 22, or Node 24.22.0 or newer in Node 24.
Run commands from the repository root. `node --version` must show a supported version;
an npm shim can select a different Node installation, so also check the Node used by npm.
Install existing dependencies using `npm ci` and `npm ci --prefix upms.client` if needed.

Create `.env.remote-development.local` at the repository root. It is Git-ignored.
A settings file without a database password has been created locally for this checkout.
Do not paste secrets into chat, command arguments, reports or source files.

```dotenv
NODE_ENV=development
UPMS_DATABASE_PROFILE=remote-cpanel-development
UPMS_SIMPLE_V1=remote-development-v1
DB_HOST=184.168.100.110
DB_PORT=3306
DB_NAME=upms
DB_USER=upms_user
MANAGEMENT_ENABLED=true
MANAGEMENT_LOCAL_HTTP=true
MANAGEMENT_ORIGIN=http://127.0.0.1:3000
```

Privately set `DB_PASSWORD` and a random `SESSION_SECRET` of at least 32 bytes in this
ignored file or the process environment. The local starter file already contains a
random session secret. Process environment values take precedence over the file.
Protect the file with your Windows account permissions. Confirm exclusion with
`git check-ignore .env.remote-development.local`. Never put secrets or certificates
under the frontend, `public/`, `assets/`, or any downloadable directory.

## TLS and safe preflight

```powershell
npm run database:remote:preflight
```

The preflight pins TCP to the exact approved IP and port. It reads the initial MariaDB
greeting without sending credentials. If the server does not advertise TLS, it exits
with `TLS_NOT_ADVERTISED`. There is no plaintext retry or local database fallback.
The greeting is unauthenticated and cannot prove the server's identity or engine.

Ask the database provider to enable TLS at this endpoint and supply its proper
certificate DNS hostname and CA requirements. Configure `REMOTE_DB_TLS_HOSTNAME`
only from independently verified provider information; do not guess it from an IP,
reverse DNS result, certificate subject or unrelated website hostname. If needed,
set `REMOTE_DB_CA_FILE` to an absolute private PEM CA-file path. Without a custom CA,
Node's default trust roots apply. Installing a CA does not enable TLS on the server.
If the provider supplies only an IP certificate, this implementation deliberately
requires further review rather than bypassing mysql2 hostname verification.

When TLS is advertised, mysql2 uses the supplied DNS name for certificate identity
verification while a custom TCP stream still connects to the fixed approved IP.
TLS 1.2 or 1.3, CA verification and hostname verification are required. The driver
verifies before authentication; the diagnostic independently checks the resulting
session before the first identity query. No unverified-certificate option is provided.
See [MariaDB's TLS overview](https://mariadb.com/docs/server/security/encryption/data-in-transit-encryption/secure-connections-overview).

After authenticated TLS, only SELECT and SHOW diagnostics run: engine/version,
schema, CURRENT_USER, server ID/UUID availability/port, read-only/recovery state,
TLS cipher/version, InnoDB, table names/count, known migration history and redacted
grant summaries. Authentication hashes, raw grants, passwords, connection options
and driver errors are never logged. Known history reads are bounded to 512 names.
An `ok:true` preflight describes successful collection, not authorization to write.

## Backend and frontend

```powershell
npm run dev:remote
```

This command loads the private file, validates the isolated development profile,
the fixed remote target, session secret and exact local management origin, then runs
the safe preflight. **At this milestone it exits before creating a listener, session
store or writable pool**, even if preflight later succeeds. Expected current error:

```json
{"ok":false,"code":"TLS_NOT_ADVERTISED","operationalWrites":false}
```

After successful future diagnostics it instead stops at
`REMOTE_WRITES_AWAIT_OWNER_REVIEW`. There is no environment flag that activates writes.
The profile selects the existing Simple V1 interface independently of synthetic and
production modes; legacy local-host, production identity and GoDaddy blocked gates remain.
The existing pool, transaction guard, UTF-8 settings, bounded queue and recovery code
are unchanged. A reviewed operational integration will still be needed after TLS,
schema and runtime privileges are accepted. Do not use generic `npm run dev` to bypass
this checkpoint or substitute a synthetic/production profile for the remote database.

Frontend-only development remains available through
`npm run dev --prefix upms.client -- --host 127.0.0.1`, and management assets through
`npm exec --prefix upms.client -- vite --config vite.management.config.js --host 127.0.0.1`.
These commands do not start a database or provide a remote backend. Existing management
API interactions require the later approved backend activation. Public website source
and published content are unchanged.

## Proposed initialization, requiring separate owner review

Do not run legacy ERP migrations on remote `upms`. The proposed ordered set is:

1. `server/migrations/202610210001_identity.js`: nine identity tables and static role,
   permission, role-permission and serialization-guard rows; no user is created.
2. `server/simple-v1-migrations/202610240001_simple_v1.js`: ten `v1_*` tables, with
   `v1_control` in `PENDING`; no operator, stock or business documents are seeded.
3. `server/simple-v1-migrations/202610240002_entry_fixes.js`: selling price, entry version,
   next-item counter and sale discount fields; no existing business rows are rewritten.

The proposed tracking table is `upms_remote_initialization` (step/name). Application
tables: `identity_guard`, `users`, `roles`, `permissions`, `user_roles`, `role_permissions`,
`sessions`, `identity_audit_events`, `login_attempts`, `v1_control`, `v1_items`,
`v1_parties`, `v1_stock`, `v1_documents`, `v1_lines`, `v1_stock_journal`,
`v1_party_journal`, `v1_audit`, `v1_commands`. Storage is InnoDB/utf8mb4. Delivery Challan
Returns use existing document/line/journal structures and require no separate migration.
Production-control/release and legacy ERP migrations are excluded.

`server/src/development/initialize.js` and
`server/tools/remote-initialization-rehearsal.mjs` prepare/test this sequence. They
accept **only** the exact explicitly confirmed synthetic schema
`upms_test_remote_rehearsal_20261026`, loopback port 3317, server ID 331726 and development
mode. The real remote target is rejected before SQL. Rehearsal provisioning refuses
an existing schema. Initialization serializes with an advisory lock, records completed
steps, treats an exact completed repeat as a no-op, and refuses partial/unknown tables
or history. DDL is not transactionally reversible; preserve partial state for review.
No reset, drop, repair, user creation or automatic startup migration is provided.

Run the rehearsal only after manually provisioning a **new, separate** MariaDB 10.11.19
test instance with these loopback identities, never XAMPP's original data directory:

```powershell
node server/tools/remote-initialization-rehearsal.mjs
```

The initial milestone had no remote initialization command. After explicit owner
approval, a separate one-shot command was added and executed for the three migrations
and initial administrator only:

```powershell
node server/tools/remote-initialize-reviewed.mjs --confirm-target=184.168.100.110:3306/upms --confirm-server-id=1 --confirm-account=upms_user@103.244.178.33 --allow-plaintext
```

This command loads private credentials, verifies the exact endpoint/account/engine,
checks InnoDB and recovery state, refuses an unknown or partial existing schema,
and never resets an existing administrator. It creates no listener or operational
pool. A generated application password is saved only to the Git-ignored
`server/.local/remote-cpanel-dev/administrator-login.txt`, and its hash is verified.
First login requires password rotation. Preserve that private file; do not commit it.
The completed schema has 19 application tables plus migration tracking, one administrator,
zero items/parties/documents, and `v1_control` remains `PENDING` with no operator assigned.
There has been no business activation. Further initialization repeats preserve the
existing administrator and never reset its password. Any future target/setup changes
require fresh owner review; the flags confirm the target and do not themselves supply
authorization.

For any separately approved future initialization: obtain authenticated TLS diagnostics where possible, verify
empty `upms` rather than assuming it, review the exact account/grants/server identity,
take an approved backup/checkpoint, approve this migration set and a dedicated
least-privilege runtime account, and implement a reviewed explicit endpoint/schema/
server-ID confirmation. Then apply only the approved forward initialization. Account
bootstrap, operator assignment and opening balances require separate review; `PENDING`
must not be changed merely to bypass acceptance. Existing runtime account validation
currently requires loopback accounts and has deliberately not been relaxed for
`upms_user`; remote privilege acceptance remains a review item.

## Connectivity recovery

Use the safe preflight to confirm the fixed endpoint before each review. Do not change
DB_HOST to localhost or run XAMPP when connectivity fails. Resolve network/firewall,
TLS or provider availability, then retry the diagnostic. Never delete data, recreate
tables, reset migrations or blindly replay business commands. Existing Simple V1
transaction rollback and idempotency govern future approved operation; unknown commit
outcomes must use the same idempotency key. Production and all public publishing remain
outside this workflow.

Actual endpoint observations and local test evidence are recorded separately in
[REMOTE-MARIADB-RESULTS.md](REMOTE-MARIADB-RESULTS.md). Cleanup evidence is in
[GODADDY-ARTIFACT-CLEANUP.md](GODADDY-ARTIFACT-CLEANUP.md).
