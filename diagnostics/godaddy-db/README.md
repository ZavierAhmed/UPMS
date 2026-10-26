# UPMS private read-only database diagnostic

This directory is an independent Node 22 CLI, not a website or an operational UPMS deployment. It reads provider-injected `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` and `DB_PASSWORD` directly from the process environment. It never starts HTTP, initializes UPMS, runs migrations, creates users, changes privileges, reads company rows or issues SQL writes. `npm start` deliberately refuses to start a server and never connects to a database.

## Execution prerequisite

Use **only a GoDaddy-supported private terminal or private one-off job attached to the actual Node application and inheriting its attached database variables**. The owner confirmed that Preview and Publish share their attached database. This diagnostic is read-only precisely because that database may contain live company data.

Private execution availability is currently unknown. Do not assume cPanel/VPS SSH instructions apply to Managed Node Hosting. Ask GoDaddy support to confirm a supported private terminal/job and how it inherits database variables. If none is available, stop and report `PRIVATE_EXECUTION_UNAVAILABLE`. Do not create an HTTP route, browser trigger, startup hook, build-hook diagnostic or public execution service. Do not replace the running application's start command with this CLI. No deployment is required to run it from an existing supported private shell.

## Private commands

Use supported Node 22.23.4 or later on the 22 line. Place the verified diagnostic-only ZIP in private, non-web-served working storage or use this directory from the reviewed checkout. Do not upload it to public/assets, static downloads or the operational website. Do not include `.env`, database exports, reports or credentials.

```sh
node --version
npm ci --omit=dev --ignore-scripts
npm run build
```

The five `DB_*` values must already be injected by GoDaddy. Do not run `env`, `printenv`, `set`, `echo "$DB_PASSWORD"`, enable shell tracing, copy a database URL, or put credentials on a command line. To verify presence without displaying values:

```sh
node -e "const keys=['DB_HOST','DB_PORT','DB_NAME','DB_USER','DB_PASSWORD']; const missing=keys.filter(k=>!process.env[k]); console.log(JSON.stringify({requiredVariablesPresent:missing.length===0,missingVariableNames:missing})); process.exitCode=missing.length?2:0;"
```

Independently confirm the exact assigned hostname and port from the provider's private control plane/support. Set these two **non-password** expectations; replace the placeholders. Do not derive them programmatically from `DB_HOST`/`DB_PORT`, because that defeats the wrong-endpoint check.

```sh
export UPMS_DIAGNOSTIC_EXPECTED_HOST='EXACT_PROVIDER_ASSIGNED_DNS_HOSTNAME'
export UPMS_DIAGNOSTIC_EXPECTED_PORT='EXACT_PROVIDER_ASSIGNED_PORT'
node cli.mjs --run-read-only
```

From the repository, the equivalent invocation is `node diagnostics/godaddy-db/cli.mjs --run-read-only`. The separate lockfile also supports `npm ci --omit=dev --ignore-scripts --prefix diagnostics/godaddy-db` followed by `npm run diagnose --prefix diagnostics/godaddy-db -- --run-read-only`.

No hostname or port is guessed. An unexpected injected endpoint is rejected before connecting. DNS names must be exact, lowercase and free of URI/path/credential syntax. Raw IP endpoints stop with `DNS_TLS_HOST_REQUIRED`: this standalone tool does not claim that mysql2's IP endpoint handling verifies an IP SAN before sending authentication. Ask the provider for the assigned certificate-matching DNS endpoint; do not substitute an arbitrary hostname, override DNS or disable checks. A mismatch is a diagnostic blocker, not authorization to alter the operational app's host restrictions.

## TLS trust

The first attempt uses Node's configured CA trust with `rejectUnauthorized: true`, `verifyIdentity: true` and a minimum TLS version of 1.2. If GoDaddy supplies an independently verified CA bundle, place it in private non-web storage and set `UPMS_DIAGNOSTIC_CA_FILE` to that file's absolute path before rerunning. The bundle is never printed or embedded in the ZIP. It must parse as PEM certificates and be at most 256 KiB. Do not download a presented peer certificate and automatically trust it as a CA.

There is no plaintext or encrypted-but-unverified fallback, no `rejectUnauthorized: false`, no TLS hostname override and no acceptance of `NODE_TLS_REJECT_UNAUTHORIZED=0`. After mysql2 authentication completes, the tool independently checks the actual TLS socket: encryption, authorized chain, hostname match, negotiated TLS 1.2/1.3 and cipher. Until those checks pass, **no SQL is issued**, including VERSION or database identity queries.

The mysql2 TLS behavior was checked against the installed 3.24.6 implementation and [official SSL documentation](https://sidorares.github.io/node-mysql2/docs/documentation/ssl). An encrypted session alone is not evidence of authentication.

## Output and interpretation

The CLI writes one bounded JSON record to stdout and no files. Exit 0 means permitted observations were collected; exit 2 means a check stopped the diagnostic. Even exit 0 never approves operational management, migration or production initialization. Connect timeout is 3 seconds, each read query is bounded to 2 seconds, and the overall diagnostic is bounded to 15 seconds with a 16-second hard process watchdog. All connections are destroyed on completion/failure, and the CLI exits after flushing its record to bound late DNS/handshake resources.

After verified TLS, the fixed SQL allowlist collects engine/version/comment; schema and CURRENT_USER; server ID, server port and read-only flag; server UUID if supported; BASE TABLE count and presence of the production/identity migration tables; and current account grants. It never reads migration rows, company tables or row counts. Unknown UUID support is explicitly marked; a permissions error is not mislabeled as absence. Unsupported/old engines stop before further identity queries. A schema or account mismatch stops before metadata/grants.

Grant output includes only recognized privilege names, scope categories, known UPMS table names and broad/destructive-right flags. Other identifiers, raw account/host strings in grants, authentication clauses, password hashes, role names and unrecognized syntax are redacted. No raw SQL errors, stack traces, passwords, connection strings, endpoint values or CA paths are logged. Engine/schema/account observations also pass through secret/URI redaction. Full table-specific runtime allowlist compliance is **not** certified by this first diagnostic.

Keep stdout in the private terminal/job log or owner-controlled private storage outside the deployed application. Do not redirect it into this project, public/assets, runtime downloads, screenshots containing secrets or Git. Share the redacted JSON through a private review channel. Schema/current account/server identity are intentionally collected metadata, so review access before sharing them. Do not attach provider secret settings or environment dumps.

Common stops:

| Code | Meaning / next step |
| --- | --- |
| `MISSING_CREDENTIALS` | The private execution environment did not inherit all required variables; do not print them to investigate. |
| `EXPECTED_ENDPOINT_REQUIRED`, `WRONG_HOST`, `WRONG_PORT`, `INVALID_ENDPOINT` | Independently verify the assigned endpoint; no connection attempted. |
| `CONNECT_TIMEOUT`, `CONNECT_FAILED` | No authenticated connection was established. This does not prove whether TLS is supported. |
| `TLS_UNAVAILABLE` | The connected server advertised no MySQL TLS support. No authentication or SQL fallback. |
| `TLS_VERIFICATION_FAILED`, `TLS_UNVERIFIED` | Authenticated TLS was not established. Encryption alone is not sufficient; no identity SQL was issued. |
| `PRIVATE_CA_UNAVAILABLE`, `TLS_CA_INVALID` | Private CA file could not be used. No fallback to an untrusted certificate. |
| `ENGINE_MISMATCH` | The observed engine/version is outside the reviewed Oracle MySQL production policy; no migration. |
| `SCHEMA_MISMATCH`, `ACCOUNT_MISMATCH` | Stop and review the attached identity. |
| `QUERY_TIMEOUT`, `TOTAL_TIMEOUT`, `IDENTITY_UNAVAILABLE`, `METADATA_UNAVAILABLE`, `GRANTS_UNAVAILABLE` | Observations are incomplete; do not treat missing observations as a pass. |

## Current verdict

Actual GoDaddy execution has **not occurred**. Private CLI availability, TLS, engine/version, identity and grants remain unverified. Independently, owner-confirmed shared Preview/Publish storage fails the required synthetic staging isolation. A successful read-only diagnostic cannot remove that blocker. Do not test operational Preview writes against this attached database, initialize it, create accounts, migrate it, enable posting or deploy the operational app without a separate reviewed decision and an isolated staging solution.
