# P3.2B2 / P3.2C — proposed next integration work

P3.2B2 now implements expense categories, employees and reports locally. Financial corrections are separately proposed as [P3.2B3](../phase-3.2b2/P3.2B3-FINANCIAL-CORRECTIONS.md). Use the updated [29-table/72-guard production checklist](../phase-3.2b2/FUTURE-PRODUCTION-CHECKLIST.md) and [cheque plan](../phase-3.2b2/P3.2C-CHEQUE-PLAN.md); the text below records the earlier P3.2B1 checkpoint.

These are review boundaries, not approval to implement or deploy the next milestones.

## P3.2B1 completed locally

New cash/bank customer receipts, vendor payments, paid expenses and immediate purchases post canonical exactly-once money effects in the existing business transaction. Credit purchases retain payable-only behavior. Statements and document details link the two retained records. Old snapshots and party conventions remain intact; no ordinary receipt is classified as an advance. Money feature remains off by default and none of this is hosted acceptance.

## P3.2B2: financial corrections and operational policy

Before expanding supported operations, approve exact policy for correcting cash/bank customer/vendor payments, paid expenses and settled purchases. Any integrated correction must reverse/link the original business fact and its exact money effect together, with funds checks, actor/evidence, source uniqueness, retry/concurrency protection and full reconciliation. Do not use the standalone money reversal endpoint to detach an original DOCUMENT effect. Current integrated payment reversals are deliberately blocked.

Resolve opening cutoff/evidence and opening correction; manual external-source alias conflicts; bank fees; bank statement reconciliation; account closure/renaming; administrator self-approval versus independent approval; and whether particular operators may use particular accounts. Current designated administrators may use all verified method-compatible accounts. Historical allocation requires separate explicit authorization and canonical original-document claims; it must never be a payment-method backfill.

Complete the production backup/restore and release tools in the checklist before proposing hosted migration. Preserve independent party and stock evidence, exact monetary representation, original forty-five guards and new fifteen money guards. Expand negative tests for every newly approved correction and approval path; do not infer that a local immutable journal proves physical funds.

## P3.2C: full cheque lifecycle

First approve instrument identity, drawer/payee, dates, custody versus bank recognition, deposit/clearance/dishonour and partial/multiple instruments, duplicate claims and historical cheque treatment. Decide explicitly how existing immediate client-credit-on-receipt history transitions to the new lifecycle without a second client credit.

Receiving a future-dated cheque must never credit UBL or another spendable holding. Custody should track actual instruments, not pretend its declared opening value is bank cash. Only an approved tested clearance event may recognize spendable bank funds. Dishonour/cancellation must preserve original instrument, party and money history with exact linked effects in one transaction. Design separate versioned additive schema, guard and backup extensions if needed; never weaken current records to accommodate cheque state transitions.

Keep enabled-money cheque receipt and payment-reversal posting blocked until this lifecycle and its recovery/concurrency/correction tests pass. Disabled money mode continues to describe the existing legacy behavior truthfully.
