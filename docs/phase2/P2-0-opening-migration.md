# Opening balances and cutover plan

R-22 is **CONFIRMED**: start from verified approved openings at an approved cutoff, not automatic import of historical transactions. This document proposes a future controlled process; no import, migration, balance entry or database connection is authorized in P2.0.

## Coverage and ownership

| Opening class | Required evidence / proposed representation | Double-counting safeguard |
| --- | --- | --- |
| Finished goods | Count by approved four-dimension variant and base unit | Packing is not another variant; no duplicate opening plus historical production |
| Raw/component/packing stock | Count or measured quantities in each item's base unit | No conversions; include caps/seals/rings and packing, no negative category exceptions |
| Quarantine/damaged goods | Owner-confirmed physical condition and custody, separately unavailable | Never include in available stock; disposal remains separate policy |
| GST customer balance | Reviewed net opening for that customer's GST ledger | Never combine with NON_GST; prior cheque-credit inclusion documented |
| NON_GST customer balance | Separately reviewed net opening | No cross-class netting or forced duplication of customer master |
| Vendor payable | Reviewed signed vendor balance, explicit credit/prepayment exceptions | No simultaneous import of old purchase/payments that generated the same net balance |
| Cash/bank/cash-holder | Independently confirmed named account/currency balances at cutoff | Configurable account names; specific reviewed negative money exception if opening is a deficit |
| Pending/deposited cheques | Instrument evidence, actual custody/state, selected ledger, policy snapshot and whether credit is already included | One custody opening per instrument, no second bank/cash credit; later clearance does not repeat recognized party credit |

Existing employee advances/payroll-related balances are explicitly excluded from V1 operational expense openings. Maintain a private unresolved reconciliation schedule and owner-approved scope boundary; do not fabricate an expense or 'balancing' ledger entry to force a total. A verified cash-account net balance may reflect historical advance movements without importing them as new expenses. Any remaining reconciliation gap must be disclosed, not hidden in an invented general ledger.

## Proposed dry-run workflow

1. Owner/accountant approves cutoff date/time/timezone, responsible preparer/reviewer, reconciliation basis and posting freeze rules. No specific date or amount is approved by P2.0.
2. Preserve read-only copies of the original workbooks/PDF/photo in private evidence storage outside deployment/public assets. Record provenance/hashes privately. Inspect worksheets with owners; do not assume file totals, abbreviations, party names or formulas are automatically correct.
3. Map normalized items/units/quality/colours and parties/accounts to a private mapping sheet. Flag duplicate/inactive items, missing dimensions, class ambiguity, fractional pieces, ambiguous balances and historical paper references. No automatic merge or F/R mapping.
4. Reconcile physical counts to stock, ledger class totals to reviewed party balances, vendor balances to outstanding confirmations, money accounts to approved cash/bank/holder evidence, and cheque custody to instrument register. Record exclusions and explanations with no fictional balancing amount.
5. Load only a **future authorized isolated dry-run environment**, not production or the public website. Stage typed opening lines and proposed cheque recognition markers. Generate a comparison report: source reviewed quantity/amount, mapped target, proposed opening, differences, reviewer and status. This report is not an import authorization.
6. Block unresolved differences, duplicate targets, illegal negative stock, unapproved money deficits, ambiguous cheque recognition, unmatched parties/classes and precision problems. A signed exception must describe the actual resolved treatment; it cannot override stock nonnegativity.
7. Reviewer approves the exact opening batch version and reconciliation hash at the cutoff. Staff may not self-approve; justified administrator self-approval must be explicit. Any changed target/value/evidence invalidates approval.
8. In a later approved cutover window, freeze ordinary posting. Under cutoff/policy guards, post one bounded atomic opening generation with its journals, caches, cheques, official number and audit. Idempotency and unique generation/target constraints prevent repeated initialization.
9. Compare all posted journal sums/cache balances/custody/recognition totals back to approved control totals before releasing ordinary posting. If batch size cannot fit a short transaction, stop and design a reviewed staged-generation mechanism that remains invisible/nonpostable until complete; do not quietly permit partial openings.
10. Obtain owner sign-off to release the system, retain secure backup and review access/period settings. Record the actual release time and reconciliation evidence. No such sign-off or activity has occurred in P2.0.

## Cheques and missing historical detail

An opening pending cheque needs an instrument line plus an explicit `opening_credit_included`/recognized amount and reference to the reviewed customer opening balance line. A net customer opening may already reflect that credit even though UPMS has no separate historical receipt. Do not invent a new receipt to represent it. On clearance, move custody to bank; grant party credit only for the not-previously-recognized portion allowed by approved policy. Partial recognition and stale/unclear instruments need owner resolution before opening.

Post-opening receipts can reduce the running customer balance without invoice allocation. If historical challan-level matching is required, propose separately reviewed **opening outstanding references** constrained to reconcile to the opening ledger, with no new sales, stock-out or second party debit. That optional detail model is unresolved and not included as historical transaction import. Preserve paper references as restricted evidence fields, not automatic new official challan numbers. Archived source records remain outside the live transaction model.

## Cutoff protection and later correction

Ordinary pre-cutoff/closed-period posting fails server-side. An exceptional pre-cutoff business date requires an explicit transaction/date-scoped administrator authorization and audit under the reviewed period policy, never a permanent staff toggle. Its stock, money, tax-class, sequence and idempotency checks remain unchanged. Proposed number year uses the actual posting instant in Asia/Karachi; owner backdate-year decision remains open.

Posted opening lines cannot be edited/reimported. Corrections use approved linked adjustment documents with verified deltas; stock decreases must still have current available quantity, money deficits require exact exceptions, and already recognized cheques cannot be credited twice. Reopening a generation is not a way to erase subsequent events. Rollback of a future cutover requires an approved coordinated application/database restore/reconciliation plan, not deletion of opening journals after business posting begins.
