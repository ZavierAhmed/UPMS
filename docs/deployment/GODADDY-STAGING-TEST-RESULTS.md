# GoDaddy staging verification

Status: **PARTIAL — provider acceptance and business SQL workflow pending**.

Local tests exercise exact host/origin checks, blocked database selection, unknown profile rejection, independent isolation assessment, TLS option requirements, real TLS trusted-certificate handshake and wrong-host/untrusted-CA rejection, exact server identity and table rights, disabled login, no cookies, API unavailability, private/public route denial and trusted-proxy handling. Assessment fixtures are invented local test values, not approved GoDaddy endpoints.

The new TLS fixture uses an ephemeral local server and test certificate, not mysql2 against GoDaddy. It proves the native TLS rejection boundary and the selected verification options. It does not establish database networking, MySQL protocol/TLS compatibility, Linux Argon2 or provider certificate validity. No GoDaddy SQL ran. MySQL initialization, migrations, workflow, backup and restore checks are **pending** as required by the provider-compatibility gate.

Local results: **198 backend tests passed** on Node 22.23.4 and Node 24.22.0, including **11 new policy/routing/native TLS tests**. All **182 frontend tests passed**, Node 22 build and lint passed, and both dependency audits reported **zero vulnerabilities**. The production operator CLI returned `GODADDY_COMPATIBILITY_BLOCKED` before creating a database connection.

The dedicated ZIP passed a clean production-only install, file manifest and corruption checks, actual package startup, five blocked API-method probes, five private/public-path denials and unknown-host rejection. Six actual local HTTPS Chrome checks passed: exact-host root redirect, visibly disabled login, no session cookie, blocked API/private routes, mobile layout and no JavaScript errors. Desktop/mobile screenshots were visually reviewed. The local browser used a test certificate exception and local hostname mapping; neither is included in application TLS policy or evidence of provider HTTPS acceptance.

An initial package probe failed because Node 22 fetch rewrote its virtual Host header. The probe was corrected to use native HTTP preserving the exact Host; application host validation was unchanged, and the corrected check passed. Failed local probe output is preserved privately. No database state was involved.

The final generated package manifest records its source SHA and `providerAccepted:false`. Package SHA256, rollback location and final post-commit verification are recorded in `artifacts/godaddy-preview-receipt.json` and local verification receipts. The archive includes these five handoff documents and the separate placeholder-only variable template. A disabled sign-in screen is the only deployable behavior of this ZIP.

## Provider acceptance matrix — all pending

After provider acceptance and a separately reviewed fresh synthetic staging target, run:

1. Exact endpoint TLS and independent identity/grant checks; wrong endpoint, CA, hostname, account, server and schema rejection.
2. Preview/Publish cross-database access denial and credential-scope proof, including provider-injected secrets.
3. Fresh private administrator bootstrap, forced password rotation, login/logout and idle/absolute session expiration.
4. Secure/HttpOnly/Strict cookies, CSRF/origin enforcement, login throttling and trusted proxy tests on actual HTTPS.
5. Bottle creation and explicit initial stock verification; client/vendor signed openings, including zero balances.
6. Production and purchase stock-in; automatic selling price; discounted challan finalization; immutable DC reference and stock deduction.
7. Client/vendor payments and cash expenses; references, balances and Company Transactions.
8. Actual XLSX export and PDF print in an authenticated browser.
9. Duplicate posting prevention, negative stock and concurrent posting protection, immutable posted documents/journals/audit.
10. All-table consistency and ledger/stock reconciliation; consistent backup and independent new-target restore.

Do not import previous fixture dumps, change financial assertions or use real company accounts to fill this matrix. A disabled sign-in screen is not a passed login test. Report Partial Completion until real provider acceptance and this matrix pass.
