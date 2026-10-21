> **2026-10-21 P2.1A decision amendment:** The owner approved existing XAMPP MariaDB for local development. Historical P2.1 results below remain evidence of the earlier milestone; Oracle MySQL installation is no longer a local acceptance prerequisite. Current provisioning, restricted-account testing and bootstrap status are recorded in [P2.1A executive summary](P2-1A-executive-summary.md). This amendment does not convert historical compatibility tests into current acceptance or production certification.
# Local SQL server setup and operator commands

## Detected environment and authorization

On 2026-10-21 the installed Workbench `mysql.exe` reported **client 8.0.46**. The actual TCP listener at `127.0.0.1:3306` and an authenticated `SELECT VERSION()` both identified **10.4.32-MariaDB**. A client version is not a server version. No MySQL Windows service name was established; do not invent one or install another service automatically.

The owner supplied the local account and database `upms`, approved MariaDB compatibility testing and disposable test-schema creation. Read-only inspection of `upms` found zero tables, InnoDB DEFAULT/transaction support YES, utf8mb4/general collation and utf8mb4_unicode_ci availability. Server session timezone initially reported SYSTEM; application connections explicitly set `+00:00`. The final inspection still found zero tables in `upms`: no owner-development schema, administrator or business data was created there.

Only disposable schemas in the approved `upms_test_p21_20261021*` family received synthetic identity fixtures. No unrelated schema/table data was inspected. Current-account grant inspection (grant text withheld) detected global/all privileges. The supplied account is unsuitable as a least-privilege runtime credential. Existing grants were not changed. Rotate the credential supplied through chat before further reuse; do not copy it into documentation, commands committed to Git or shared logs.

## Owner-reviewed provisioning

Review [`server/tools/provision-local.review.sql`](../../server/tools/provision-local.review.sql). It targets new `upms_dev` and separate localhost migration/runtime accounts. It contains angle-bracket password placeholders that intentionally prevent account creation until edited privately. Do not run it blindly. Review the endpoint, collision-free names and every grant before execution as an authorized owner. A failed CREATE must be investigated, never followed by DROP/TRUNCATE to retry.

The migration account receives only schema-scoped DDL/DML needed for reviewed migrations. After migration, grant the runtime account exact per-table rights: read roles/permissions/guards, controlled identity/session changes, and SELECT/INSERT only on audit history. Runtime cannot modify role-permission definitions, delete users/audit, create tables or change grants. The guard's UPDATE privilege supports locking reads across engine versions. No wildcard remote account or production fallback is supplied.

For integration tests, separately provision an **empty** `upms_test_<unique_suffix>` schema and a test account scoped to it. The audit-failure integration scenario temporarily creates/removes its own synthetic trigger and therefore needs test-schema TRIGGER permission, in addition to migration rights. This permission is unnecessary for runtime. Tests neither create databases themselves nor drop schemas/tables. Retain failed fixtures for investigation; use a newly approved empty schema for a new full run. Cleanup of retained test schemas is an owner task, not an automatic test action.

Historical P2.1 gate, superseded for local development by the P2.1A owner decision: an Oracle MySQL endpoint is no longer required. MySQL 8.0.16+ is the code's minimum version gate; prefer a reviewed supported MySQL release and verify the exact chosen version. MariaDB requires `DB_ALLOW_MARIADB_COMPATIBILITY=true` for migrations and never counts as MySQL acceptance.

## Private environment configuration

Use Node 24 and the existing project convention of explicit environment injection. Example PowerShell, **template values only**:

```powershell
$env:NODE_ENV = 'development'
$env:DB_HOST = '127.0.0.1'
$env:DB_PORT = '3306'             # owner-confirmed endpoint
$env:DB_NAME = 'upms_dev'         # separately provisioned dedicated schema
$env:DB_USER = 'upms_migrator'    # use runtime account for normal start
$credentialInput = Read-Host 'Database password' -AsSecureString
$credentialBuffer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($credentialInput)
try { $env:DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($credentialBuffer) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($credentialBuffer) }
$env:DB_CONFIRM_NAME = $env:DB_NAME
npm run identity:inspect
npm run identity:migrate
```

Do not put passwords in shell command arguments. Environment secrets are still available to the child process and privileged local operators; use a trusted terminal and clear them afterward. No connection URL containing credentials is logged. The shipped `.env.example` has no live values. Accepted database names are `upms`, `upms_dev` and `upms_test_<suffix>`; host must be explicit loopback. Port, user and password have no implicit fallback.

`identity:inspect` prints version/database/timezone/charset/collation/engine only. Migration refuses production, mismatched `DB_CONFIRM_NAME`, unapproved MariaDB and unsupported MySQL versions. It is never invoked at application startup. See [migration recovery](P2-1-schema-and-migrations.md).

## One-time administrator and local login

With reviewed schema, appropriate credentials and exact `DB_CONFIRM_NAME`, run:

```powershell
npm run identity:bootstrap
```

Enter username/display name and twice enter a private 12–128-character password at the masked local TTY prompt. Password input is not echoed and noninteractive bootstrap is refused. No command-line/default password, public registration or startup administrator exists. Concurrent attempts serialize; only one administrator bootstrap can succeed. It refuses if any administrator assignment exists, including a disabled administrator. Retrying cannot become recovery.

Switch `DB_USER`/`DB_PASSWORD` to the separately provisioned runtime account. Then configure:

```powershell
$env:MANAGEMENT_ENABLED = 'true'
$env:MANAGEMENT_ORIGIN = 'http://localhost:3000'
$env:MANAGEMENT_LOCAL_HTTP = 'true'   # isolated development only
$env:SESSION_SECRET = node -e "process.stdout.write(require('node:crypto').randomBytes(48).toString('base64url'))"
npm run build
npm start
```

Open `http://localhost:3000/management` and use the account you just created. Keep the session signing secret private and stable across process restarts; replacing it invalidates browser cookies. The normal public site remains available at `/`. This milestone does not proxy the management HTML through the public Vite development server: use the built management entry on Express's same origin. No real administrator password/account was created for the owner during this work; synthetic test credentials were generated at runtime and not committed.

Production requires an HTTPS `MANAGEMENT_ORIGIN`, a random signing secret, `MANAGEMENT_LOCAL_HTTP=false`, existing W06 host/proxy configuration, a reviewed MySQL endpoint and separate runtime grants. Hostinger compatibility remains unresolved. Nothing was deployed.

## Explicit verification and shutdown

```powershell
# Set DB_* to a newly approved empty upms_test_<unique_suffix> schema first.
$env:DB_CONFIRM_NAME = $env:DB_NAME
npm run test:mysql
node server/tests/verify-identity-browser.mjs # separate fresh schema; local TLS cert + Chrome
npm run verify
npm run identity:benchmark
Remove-Item Env:DB_PASSWORD, Env:SESSION_SECRET -ErrorAction SilentlyContinue
```

The integration command prints its exact dedicated schema and actual engine/version. No mock fallback or automatic destructive reset exists. See [verification](P2-1-verification.md) for the distinction between passed MariaDB compatibility checks and pending MySQL checks. SIGINT/SIGTERM close the HTTP listener, drain/close sockets and destroy the bounded database pool; operator commands also destroy their pools in `finally`.

If every administrator loses access, stop privileged use and obtain explicit owner/security approval for a separate, reviewed offline recovery procedure with backup, maintained hashing, session/version revocation and audit evidence. No recovery command, SQL shortcut or unauthenticated password-reset endpoint is implemented. A second independently controlled administrator can reduce that operational risk, subject to owner approval and audited role assignment.
