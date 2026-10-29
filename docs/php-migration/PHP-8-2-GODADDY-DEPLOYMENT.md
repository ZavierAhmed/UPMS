# PHP-8.2 — hosting preparation and preservation

No live upload/database change/provisioning/DNS/certificate purchase/activation performed. Existing upms is owner-classified dummy data but remains preserved until complete backup, independent restore and separate final approval. No old records enter the clean package.

## Consolidated backup and independent restore — future approval required

1. Pin exact old schema/server/account/verified socket and inventory all objects. Include all twenty owner-reported InnoDB tables, identity/roles/audits/upms_remote_initialization and any discovered triggers/routines/events. Stop on incomplete backup grants.
2. Coordinate consistent snapshot and DDL/write fence. Use a separately approved backup identity and0600 private defaults file, never a password argument. Complete MariaDB dump must include schema/data, explicit utf8mb4/hex-blob and applicable triggers/routines/events. Single-transaction cannot protect concurrent DDL or nontransactional/private journal changes. Do not assemble commands from guessed live names.
3. Record UTC timestamp, source/tool versions/identity, object definitions, every table count/integrity hash, numbering/history and dump SHA-256. Keep encrypted/restricted outside both roots/Git. Independently verify an off-device copy and protected key custody.
4. Inspect restore destination behavior; reject source USE/CREATE DATABASE redirects. Restore only to a separately approved isolated destination with independently verified identity. Compare all objects/types/keys/precision/collations/counts/integrity hashes, administrators/audits/history and applicable financial/stock reconciliation. Exit0 alone is insufficient.
5. Retain original, backup and restore evidence. Bind backup checksum/restore reference to later operation approval. PHP-8.1's synthetic20-table/44-row rehearsal is historical evidence, not a GoDaddy backup or new execution.
6. If no second database is available, review quota/provider/architecture alternatives separately. Never silently reset upms. No destructive executor is supplied. After future real writes, fence/reconcile before rollback rather than overwrite new transactions.

## Prepared layout

Owner reports public root /public_html, management /public_html/dashboard. Owner-home prefixes remain unknown. Approve actual absolute private backend/vendor/config/storage/log/backup/maintenance paths outside **both**; do not guess /home/... paths. Private directory0700/files0600. No Laravel/vendor/config/credentials/maintenance endpoints in web roots.

PHP8.3; Linux locked no-dev Composer dependencies; APP_ENV=production; APP_DEBUG=false; private generated APP_KEY; UPMS_ENABLED=false until approved; UPMS_ENFORCE_HOST_BOUNDARY=true; UPMS_ORIGIN=https://app.unique-plastic.com; explicitly reviewed UPMS_PRODUCTION_PROFILE. Socket/identity pins remain strict; no synthetic environment fallback. Distinct finalization, provisioning and activation profiles/approvals. Verify web SAPI/extensions/limits, CLI worker path and actual cPanel granular grants. Runtime gets scoped command/session/counter grants, not DDL/GRANT/receipt/state/operator updates or ALL privileges. Preserve prior shared-SQL-account row-scope limitations for owner disposition.

`scripts/php-8-2-release-source.mjs` prepares a separate source layout. Linux finalizer installs locked no-dev dependencies, checks platform/audit and creates checksum manifest. This is local private staging, not production readiness. SQL package and diagnostics stay private/separate. Exclude tests, .env, Node server/dependencies, Windows vendor, business dumps and inquiry journals.

Existing Apache/HostBoundary isolation remains: public host cannot reach /dashboard or management APIs/assets; app host cannot reach public inquiry routes; unknown hosts rejected. Verify actual rewrite/headers/MIME/AllowOverride and renewal exceptions before a future switch. Preserve approved Unique Plastic Industry graphite/orange/warm-white design and assets. No alternate identities introduced.

## SMTP, storage and endpoint trust

Owner-supplied CLI8.3.36/extensions/128M, child-process and scratch exclusive-create/flock/rename/persistence/0700 PASS are retained. They do not establish web-to-CLI, fsync, final-path cross-worker journal or aggregate account limits. Preserve private durable journal, INQUIRY_PHP_BINARY, duplicate prevention and uncertain-delivery handling; never blindly retry uncertain mail.

Provider-approved SMTP endpoint is still missing. Once privately confirmed, use this exact existing read-only probe shape, replacing placeholders only with approved values:

```sh
php /ACTUAL_PRIVATE_ROOT/smtp-tls.php --host=APPROVED_PROVIDER_HOST --port=587 --mode=starttls
# Only if provider specifies it: --port=465 --mode=implicit
```

Add --ca=/ACTUAL_PRIVATE_ROOT/provider-ca.pem only for a reviewed provider CA. TLS verification stays enabled. Probe sends no AUTH/MAIL/RCPT/DATA, only handshake/EHLO/QUIT. No live messages were sent; delivery acceptance needs later approval.

Owner retains self-signed management certificate for controlled preparation. No global TLS bypass or real credentials through an untrusted public endpoint. Approve out-of-band controlled trust and suitable trusted public management endpoint before activation. No DNS/certificate changes authorized.
