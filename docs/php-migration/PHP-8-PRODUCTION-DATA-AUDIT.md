# PHP-8 production data audit — NOT EXECUTED

Phase A is blocked; no authenticated owner database inspection has occurred. The existing upms records are UNKNOWN, not clean/test/empty by assumption. No records, counters, users or audit rows were changed. Never copy any local upms_test_php_* schema into production.

## Controlled inventory plan

After verified account/server/transport identity, use a separately approved restricted read-only identity. Pin schema, endpoint, physical server evidence, authenticated account and actual version/capabilities before querying business data. Inspect metadata first; do not assume that repository table definitions exactly match the owner database. Read users, user_roles, roles, role_permissions, identity_audit_events and v1_control, followed by legitimate item/party/document/line/journal/counter/migration evidence. Never export password hashes or session tokens into ordinary reports.

Use a consistent read-only snapshot where supported; record table counts, stable row hashes, financial/stock summaries, document numbering/counters, user IDs and foreign-key/audit relationships. Keep detailed owner data private. Reports should contain redacted identifiers and classification references, not credentials or customer datasets.

Classify through source evidence, actor/time/history and owner confirmation. A record's name resembling a fixture is not sufficient proof it is disposable. Unknown or mixed-origin records are preserved and flagged. No DELETE, DROP, TRUNCATE, counter reset, recreated historical opening, development seeder or whole-database initialization is authorized.

A clean source-built application package is distinct from an empty database. Legitimate existing business history must remain. If a new empty production database is needed, require an explicit reviewed data/initialization decision; never redirect the app to a test dump. Actual user/data conflicts must be resolved before a provisioning plan can become executable.

Current result: no inventory, no classification, no production data-cleanliness claim. Backup and restore validation are also pending. See HOSTING-PREFLIGHT and BACKUP-ROLLBACK.
