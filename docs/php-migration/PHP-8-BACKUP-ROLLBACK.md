# PHP-8 backup and rollback — NOT EXECUTED

No production backup or restore was attempted; no authenticated database access exists yet. Historical local synthetic restore results are not evidence of a restorable owner backup.

Before provisioning/activation, verify the exact source identity and all table engines/capabilities. Use an approved backup identity distinct from runtime and provisioning. Capture a consistent complete snapshot including users/roles/permissions, sessions where policy requires, identity guard/audits, v1_control/counters, masters, documents/lines/journals, command records, migration evidence and relevant private inquiry journal state. Inventory actual schema instead of omitting unknown tables. Coordinate DDL/write fencing and SMTP handoff state; a transaction-only dump is insufficient if any table/storage behavior prevents a consistent snapshot.

Store encrypted/restricted backup outside all web roots, archives and Git, with SHA-256, time, verified source identity, tool versions, table/count/hash manifest and separate key custody. Never place passwords on command lines or in normal logs. Record grants separately without exposing secrets. Confirm quotas, permissions, protected off-device copy and owner retention/RTO/RPO policy.

Restore into a newly authorized separate private target with independently verified destination identity; never into the source schema. Compare all tables/row counts/hashes, user IDs/audits, stock/balances, journals, numbering/counters and migration evidence. Run reconciliation without production test postings. Confirm restored restricted-runtime access and private inquiry-state consistency. Preserve partial failures for investigation; do not reset/reimport unknown data to obtain a green check.

Rollback trigger: financial/counter mismatch, auth/header/TLS failure, failed inquiry-state integrity, or package/checksum mismatch. Fence writes/dispatch, preserve new transactions and evidence, then owner selects the reviewed application-pointer/config rollback and any data recovery. An application rollback must preserve the database; restoring an older DB snapshot after new transactions needs a separate approved reconciliation plan. Do not auto-switch to Express against the live DB without a reviewed compatible state/profile.

Actual backup ID, checksum, restore target/results, retention, RTO/RPO, operator and rollback approval: PENDING OWNER / NOT VERIFIED.
