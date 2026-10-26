# Remaining operational blockers

Packaging compliance is separate from database approval. The new ZIP is a persistent **disabled management preview**, not production-ready UPMS. The public website remains on cPanel and is excluded from this upload.

| Requirement | Status / next evidence |
| --- | --- |
| Actual GoDaddy Node patch and native installation | Local Node 22.23.4 install/native checks do not prove hosting's Node patch, OS/architecture or Argon2 availability. Verify private provider install/runtime logs. |
| Actual assigned Preview hostname and immediate proxy peers | Existing approved Preview name is fixed; different assignments require a narrow review. No wildcard hosts or trust-all forwarded headers. |
| Authenticated MySQL TLS | No hosted diagnostic has run. Need actual authorized CA chain, certificate hostname, negotiated protocol/cipher and no verification bypass. Web HTTPS is not database TLS. |
| Engine/version and identity | Need exact engine/version, schema, CURRENT_USER, UUID/ID and server port. Injected credentials are not independent identity evidence. |
| Restricted runtime privileges | Need the exact existing table allowlist, no runtime DDL/global/wildcard grants, no audit/journal mutation. No credentials/accounts are created by this release. |
| Staging isolation | Owner confirms same-app Preview/Publish share a database. Need a distinct app/database/credentials/receipts and proven access isolation, with entitlement/fee review first. No synthetic transactions against the attached database. |
| Migrations and initialization | Unknown/populated data must be preserved; explicit schema confirmation and separate reviewed authorization required. No startup migrations. |
| Backup and independent restore | Actual export, protected storage, restore to a different isolated schema and stock/ledger/document reconciliation remain unverified. No backups in public/assets. |
| Openings and cutover | Private administrator handoff/rotation, OPENING state, numbering review, opening evidence and a separate live-posting approval remain required. |
| One-shot diagnostic lifecycle | Existing diagnostic packages exit and do not satisfy a persistent management-server lifecycle. A supported private one-time execution method and private persistent run-state contract remain unproven. Do not upload a diagnostic ZIP as UPMS. |

Existing managed/cPanel database profiles remain blocked. The new management entry never imports the database pool, diagnostics, identity/session middleware or operational app; provider-injected DB values are unused. Enabling flags cannot turn it into a working app. The core host/schema/identity/grant/TLS checks and all stock/ledger/payment/return logic remain unchanged.

No hidden HTTP diagnostic, keepalive workaround, infinite sleep, automatic migration or healthcheck claim of operational readiness was added. Private persistent state, credentials, logs and backups must never be put in public/assets, even where a generic hosting guide recommends that directory for ordinary persistent files.

No hosted execution, database import/write, account change, DNS change, publication or posting activation occurred. Next review should evaluate actual provider evidence and prepare a separately reviewed runtime adapter/initialization plan; it must not infer approval from a locally successful disabled preview.
