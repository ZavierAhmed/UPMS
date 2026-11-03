# Employee payment classification policy — UAT-H1C

Version: `uath1c-v1`. Isolated UAT only; not a production accounting release.

Ordinary employee-associated expenses remain `BUSINESS_EXPENSE`. Neither an employee association nor a category named Advance establishes wage purpose. The ordinary expense form links explicitly to the authoritative Hafta payment service. A new direct Hafta payment creates one canonical account debit and one labor settlement; it creates no second expense.

## Applying an existing payment

An administrator with `employee_labor.classify`, `employee_labor.view` and `money.accounts.view` must select a supported posted employee expense, review its retained employee snapshot and original cash/bank evidence, enter a reason/evidence of 10–500 characters, select an effective classification date and explicitly approve. The service requires exactly one canonical original money batch and movement for the full source amount. Drafts, unsupported legacy sources, nonemployee expenses, wrong employee identities, inactive employees, refunded/reversed sources and previously claimed sources are rejected. Native unique keys independently prevent multiple claims on the expense, batch or movement.

An evidenced employee labor opening must cover the original cash date. Missing coverage is UNVERIFIED, not zero. Existing immutable openings cannot be rewritten to manufacture eligibility. Allocation cannot exceed verified earned payable. The effective date must be on or after the original cash date and the latest employee earning/payment/allocation, and cannot be in the future. Older records can therefore be classified on an explicitly selected current effective date without inventing a historical advance balance.

The new immutable allocation retains the original employee snapshot, document/batch/movement IDs and hashes, original cash date/reference, approval actor, timestamp and reason. Original expense, money, stock and ledger rows remain unchanged. Duplicate requests with the same idempotency key return the same result; new-key duplicate source claims fail.

## Expense reporting and cash

The original expense stays positive on its original date. A separately labeled negative NONCASH Hafta classification adjustment appears on the selected effective date, with a source link and the same category/employee/account filters. It is not an actual refund or new cash movement. A same-period 1,200 expense and -1,200 adjustment net to zero ordinary expense. An earlier closed-period report retains its original expense; the later period exposes the signed adjustment rather than silently restating history. Hafta separately shows direct cash payments and existing payments applied; ordinary transport/business expenses stay outside wage deductions.

## Explicitly unsupported

No future-labor advances, negative wage liabilities, partial source allocations, backdated settlements, employee reassignment, allocation reversal, or refund after allocation. These need separate reviewed policies and recovery/guard tests. Generic money reversals cannot reverse allocated source cash. A mistaken original expense is not repaired by fabricating a refund.

## Protection boundary

Original 88 guards are unchanged; 15 additional guards and native constraints protect new immutable evidence and block source refunds/reversals. SQL credentials still permit consistent fabricated inserts and mutable-state operations within existing CRUD authority. Application authorization is not database row isolation or proof that physical cash changed hands. Reconciliation proves retained-source, snapshot, hash, audit and arithmetic consistency, not physical-payment authenticity.
