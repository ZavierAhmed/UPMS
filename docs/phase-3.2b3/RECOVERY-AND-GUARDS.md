# Refund recovery and database protections

## No schema or guard extension

This milestone adds no table, column, index, SQL resource or trigger. Development remains **29 tables / 72 guards**. Existing `v1_documents.kind` has room for FINANCIAL_REFUND; the existing unique `corrects_id` foreign key supplies native full-correction uniqueness. Original 45, money 15 and expense 12 guard definitions are unchanged. See actual guard verification/hashes in [integration evidence](evidence/integration.json).

Existing triggers enforce posted-document and journal/audit immutability and runtime restrictions. Tests authenticate the fresh local runtime via CURRENT_USER(), verify exactly SELECT/INSERT/UPDATE/DELETE on its escaped fixture database, and reject posted-refund updates/deletes, party journal mutations, money/audit mutations, CREATE and GRANT. This is local MariaDB evidence, not a new GoDaddy privilege verification.

These guards do not make broad runtime CRUD equivalent to row-level authorization. Compromised runtime SQL credentials can still fabricate new inserts, alter allowed mutable records and administrator passwords, and bypass application attestation. Hashes and reconciliation establish consistency, not independent physical payment provenance. The feature adds application authorization and canonical source checks without claiming database-enforced complete business transactions or bank authentication. No runtime DDL is requested.

## Versioned refund-aware recovery

`FinancialRecovery` uses `UPMS_FINANCIAL_SNAPSHOT_V1` plus `p32b3-full-same-account-v1`, retaining the same 29 canonical tables and 72 definitions. The isolated prototype captures and encrypts with a recipient public key (authenticated sealed box), decrypts in memory, checks the manifest/policy, and delegates existing empty-target/schema/guard/FK/row validation to the expense recovery layer.

Additional checks cover original/refund source hashes, exactly one full correction, precise money direction/account/amount/date and posting audit, client/vendor journals, absence of refund stock/line effects, expense snapshot history and all money movement/audit evidence. Restore repeats these checks on the restored rows. Native PDO numeric representation is normalized without changing payloads. Posting audit selection explicitly excludes unrelated draft/cancel events. A second restore into the nonempty target is rejected.

The old expense capture/restore format refuses refund documents by default, including drafts; only the explicitly refund-aware wrapper opts in. Older 20/45 and money-only formats are not declared compatible with refund data. Private fixture recipient secrets/ciphertext stay under ignored owner-protected test storage or memory, never committed; public evidence contains synthetic reconciliation only.

## Hosted work still pending

Current production remains the owner's stated **20 tables / 45 guards**; this milestone did not connect to it. The existing protected recurring Windows/GoDaddy backup scripts, DPAPI keys, production collection, retention and automation are unchanged.

Before any future cumulative deployment, upgrade the collector/streaming encryption manifest, Windows DPAPI consumer, authenticated validation, scheduling/retention and failure handling to the 29/72 refund-aware format while preserving the existing backup path through transition. Independently restore a genuine protected off-host production archive into an authorized empty isolated target and verify every row, FK, guard, identity, source/refund and master-history check. The local in-memory snapshot experiment does not satisfy that production gate. No migration/restore/activation command is authorized by this document.
