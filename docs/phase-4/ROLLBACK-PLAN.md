# Rollback and forward recovery

Preserve existing deployment manifests, encrypted backup evidence and source identities. The observed deployed source is `c0d05b340cbaa136464015669fe650060e450f12`; exact source and patch manifest hashes are in `evidence/host-release.json`. No live files were replaced in P4 preparation.

Before any future cutover, retain a verified previous application artifact and environment binding outside the public root. Application rollback is allowed only after proving its compatibility with the database's actual schema and migration state. Disabling a new feature does not undo its financial history.

MariaDB DDL commits independently. Resume additive changes from durable per-step receipts after exact definition checks; never presume a transaction rollback reverted DDL. The local structural interruption test demonstrates this technique, not a complete production recovery procedure.

If transactions occurred after cutover, do not restore an older backup over them. Stop writes under owner-authorized maintenance, preserve current ciphertext and logs, reconcile new transactions and use reviewed forward correction. A destructive point-in-time restore requires separate owner authorization, explicit data-loss assessment and independently verified recovery. Never drop production schemas, reset administrators, renumber/repost documents or fabricate migration receipts to make an old application start.
