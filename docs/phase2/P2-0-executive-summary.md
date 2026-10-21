# P2.0 executive summary

Unique Plastic Industry needs one private operational system for stock, production, consumption, supplier purchases, delivery challans/sales, returns, separate GST/non-GST customer ledgers, vendor payables, receipts/payments, cash/bank/cash-holder accounts, cheques and expenses. This milestone records requirements and proposes architecture only. Nothing described here is implemented or production-ready.

## Authority and evidence

The owner's supplied P2.0 rules are **CONFIRMED** business decisions. Reviewed source-file structure is **EVIDENCE**, not permission to infer business policy. All new schemas, precision choices, API paths, security defaults and implementation sequencing are **PROPOSED**. Missing facts are **UNRESOLVED** in the [decision register](P2-0-decisions-and-open-questions.md).

After initially locating no copies in the known repository files, access was requested. The owner identified `server/src/asset`; all five references were then inspected read-only. The source log in [confirmed requirements](P2-0-confirmed-requirements.md) explains the bounded spreadsheet inspection. No names, addresses, account labels, historical amounts, photos or source spreadsheets/PDFs are included in these deliverables. The photographed form's unrelated printed identity is not an affiliation or approved company branding; only its field layout is a reference.

## Non-negotiable controls

- No inventory category may become negative, including under administrator action or simultaneous posting. Production and material consumption remain independent; no automatic BOM or conversion.
- A finished-bottle variant is bottle type + size + quality + colour. Packing belongs to the challan, never the stock identity.
- Posting one challan atomically issues its annual number, deducts stock, records sales and debits exactly one selected GST/non-GST customer ledger. Ordinary authorized Sales/Dispatch staff post directly.
- Posted records remain immutable. Approved linked adjustments add only justified incremental effects. A correction cannot pretend physically dispatched goods were never sent; physical returns require inspection.
- Receipts credit a party once. Allocations allocate existing credit without another ledger entry. Cheque receipt-versus-clearance policy is snapshotted per cheque; clearance never repeats previously recognized credit.
- Money accounts normally cannot go negative. Only a transaction-specific administrator approval with reason and resulting deficit can allow a money deficit; it can never relax the stock rule.
- Sensitive approvals bind exact values/version; non-administrator staff cannot approve their own work. Administrators may self-approve only with explicit justification and audit evidence.

## Proposed architecture and model

A modular monolith extends the existing single Node 24/Express process with a private React area and protected management API. Identity/permissions, document lifecycle, approvals, numbering, durable idempotency and transaction coordination are shared services. Domain modules own their tables and append-only operational journals. MySQL row locks and unique source-effect keys protect balances across processes and retries. No permanent workers, microservices or full general ledger are proposed.

Public rendering/inquiries remain isolated: no management routes/data in the public prerender registry, bundles or sitemap; no inquiry-to-sales automation. Existing W06 runtime, website, APIs, scripts and dependencies are unchanged by P2.0. The [logical model](P2-0-mysql-data-model.md) is a design dictionary and ERD, not migrations or database access.

## Approval needed before implementation

Priorities are abbreviation/quality mappings, physical adjustment and return evidence, print-price/GST presentation, rounding/currency, receipt overpayments/refunds, cheque edge cases, supplier returns, opening reconciliation/cutoff, locations/stock-taking and expense thresholds. Tax/legal invoice/withholding policy belongs to the owner/accountant. Hosting eligibility, actual proxy trust, database limits and backup/restore expectations remain open; Hostinger Premium is not established as an Express target.

The proposed next milestone is **P2.1: identity, permissions and private shell**, after independent approval of P2.0 and an explicit scope for the minimum durable identity database foundation. Sensitive posting cannot be released before shared transaction/approval controls and its prerequisite decisions are resolved. The [roadmap](P2-0-implementation-roadmap.md) explains dependency changes; no P2.1 work is authorized here.

See [verification and future acceptance matrix](P2-0-verification.md) for actual regression results, coverage and unexecuted business invariants.
