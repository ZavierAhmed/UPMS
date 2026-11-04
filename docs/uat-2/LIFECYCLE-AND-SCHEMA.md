# Lifecycle and additive schema

Version: `uat2-v1`. Baseline: **38 tables / 103 guards**. Cumulative UAT-2: **44 tables / 124 guards**. No original guard definition, table definition, posted document, journal, numbering sequence or relationship is rewritten.

| New table | Purpose and constraints |
|---|---|
| cheque_schema_receipts | Singleton version/plan receipt, `ISOLATED-UAT2-ONLY` |
| cheque_issuing_banks | Immutable authoritative synthetic issuer IDs/codes |
| cheque_instruments | Immutable instrument/customer snapshot; unique business reference and composite bank/account/number identity |
| cheque_events | Append-only dated lifecycle; unique instrument ordinal; previous audit hash; bank/payment/batch FKs |
| cheque_audit | One immutable hash/actor/time record per lifecycle event |
| cheque_clearances | One immutable instrument/event/document/batch/movement claim, each independently unique, with source hashes |

State derives from the latest retained event; there is no mutable status projection to edit. Valid transitions:

```text
RECEIVED -> DEPOSITED -> CLEARED (terminal)
                     -> DISHONOURED -> RETURNED (terminal)
RECEIVED -> RETURNED (terminal)
DEPOSITED -> RETURNED (terminal)
RECEIVED -> CANCELLED (terminal)
```

The 21 new guards comprise UPDATE/DELETE denial on all six new tables (12), maintenance-only INSERT for receipt/directory (2), instrument/event/audit/claim INSERT validation (4), two additional document guards and one additional money-batch guard. The existing 103 are verified alongside them without alteration. Runtime has no DDL/TRIGGER privilege.

The additional document guards constrain clearance payloads to a retained current deposit, matching customer, account, amount and date, and block unsupported corrections of claimed payments. The money guard blocks external recognition using a registered/reserved cheque source and reversal of a clearance batch. INSERT guards constrain actor permission, event order, date, bank opening, evidence, exceptional approval and canonical financial source. Hash authenticity/physical evidence cannot be inferred from SQL shape alone.

`cheque-schema.json` contains the versioned DDL; `cheque-schema-hashes.json` pins canonical SHOW CREATE output. Installation first positively identifies the private loopback engine, verifies 38/103, creates only additive objects/permissions and checks every preexisting row remains present byte-for-byte after scalar normalization. Existing owner bindings are explicitly excluded by the CLI helper and launchers. Interrupted nontransactional DDL is retained for review, never blindly rerun.

Permissions: `cheques.view`, `.receive`, `.deposit`, `.clear`, `.dishonour`, `.dispose`, `.reports`. They are separate server checks beneath the existing operator boundary. The report endpoint checks `.reports`; export/print UI checks it too. A user entitled to view a register can inherently copy visible information; an export permission cannot prevent manual copying or browser printing.

API (existing authentication, secure PHP cookies, Origin and CSRF middleware):

```text
GET  /api/v1/management/simple-v1/cheques
GET  /api/v1/management/simple-v1/cheques?report=1&status=DEPOSITED
POST /api/v1/management/simple-v1/cheques
POST /api/v1/management/simple-v1/cheques/{id}/{deposited|cleared|dishonoured|returned|cancelled}
```

Mutation inputs are strict; unknown amount/customer/bank overrides on clearance are rejected. Registration requires reference, clientId, issuingBankId, drawerName, drawerAccount, number, chequeDate, receivedDate and exact string amount. Disposition requires date, reference, reason and evidence. Deposit additionally takes bankId. Clearance additionally requires approved=true and, where applicable, selfApprovalReason.

BusinessCommand's transaction and identity-guard lock serialize mutation, retain the actor/fingerprint/idempotency result, and validate full final evidence before commit. A lock conflict can occur in authentication preflight or session touch as well as the command. The cheque boundary returns a retryable 409; retry with the **same** key to retrieve a committed result or safely retry. Never interpret a transport/conflict response as permission to create a second command with a different key.
