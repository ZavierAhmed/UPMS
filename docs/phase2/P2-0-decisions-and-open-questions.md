# Decisions and open questions

Status meanings: **CONFIRMED** = explicit owner requirement; **PROPOSED** = technical/business default for review; **UNRESOLVED** = missing fact or unapproved policy. Evidence E-01–E-05 is documented separately in [requirements](P2-0-confirmed-requirements.md); an observed old worksheet convention is not silently upgraded to a decision. No business quantities, balances, customer identities or account labels are reproduced here.

## Confirmed decision register

| ID | CONFIRMED decision / controlling requirements |
| --- | --- |
| C-01 | Documentation/architecture only; preserve public W06 and Unique Plastic identity; no database/service implementation or deployment (R-01/R-02) |
| C-02 | Four stock categories, one base unit/item, no V1 automatic unit conversion (R-03) |
| C-03 | Bottle identity has four dimensions; packing is challan-only (R-04) |
| C-04 | Absolute no-negative inventory in all categories, no administrator exemption (R-05) |
| C-05 | Independent production and material consumption, no automatic BOM (R-06) |
| C-06 | Received supplier purchases affect stock and payable; full/partial/credit with atomic immediate payment (R-07/R-15) |
| C-07 | Challan simultaneously dispatches and sells; internal selling rates; ordinary authorized direct posting (R-08/R-09) |
| C-08 | Independent GST/NON_GST customer ledgers, manual GST, no automatic tax rate/netting (R-10/R-11) |
| C-09 | Posted challans immutable; approved linked incremental corrections, no compulsory cancellation/reissue (R-13) |
| C-10 | Physical returns inspected; reusable availability separate from damaged custody and approved financial credit (R-14) |
| C-11 | One customer credit/receipt; optional allocations create no second credit (R-16) |
| C-12 | Cheque policies A/B, per-cheque snapshots, conditional dishonour reversal, no retroactive policy changes (R-17) |
| C-13 | Configurable separate money accounts; transfers not income/expense; exact administrator money-deficit exception only (R-18/R-19) |
| C-14 | Expenses separate from purchase settlements; advances/payroll deferred (R-20/R-21) |
| C-15 | Approved/reconciled immutable openings at cutoff, historical workbooks retained, no bulk historical import (R-22) |
| C-16 | Department visibility, explicit approval authority, staff no self-approval, justified admin self-approval; values/version binding (R-23/R-24) |
| C-17 | Independent annual type/year posting sequences, year visible, no issued-number reuse; Pakistan local business time unless owner changes it (R-25) |
| C-18 | Exact operational journals/durable idempotency, no JS monetary floating point or full general ledger/valuation (R-21/R-26) |
| C-19 | Protected session/auth/export architecture, single-process-compatible hosting and bounded DB transactions; readiness unresolved (R-27/R-28) |
| C-20 | Operational reports only, server-enforced filters/columns/exports (R-29) |

## Proposed defaults requiring review

| ID | PROPOSED default | Approval/review needed |
| --- | --- | --- |
| P-01 | `/management/*` and `/api/v1/management/*`, private React entry/gated assets in same Express process | Owner/technical/security review |
| P-02 | Q DECIMAL(20,6), rate DECIMAL(18,6), money DECIMAL(20,2), scale validation, per-line half-up rounding; configurable single base currency, PKR suggested | Owner/accountant; Q-09 is blocking |
| P-03 | AVAILABLE/QUARANTINE/DAMAGED stock buckets; no location dimension until confirmed | Operations/owner |
| P-04 | Shared document header/lifecycle, typed extensions and append-only journals with atomic caches | Technical/domain reviewers |
| P-05 | Number year based on successful server posting instant in Asia/Karachi; prefixes DC/PUR/PRD/MC/RCP/VP/SR/ADJ/EXP/TRF | Owner; Q-10 |
| P-06 | InnoDB READ COMMITTED plus explicit ordered parent/balance locks, maximum three whole-transaction retries, bounded pool initially five | Verified hosting/database/concurrency review |
| P-07 | Maintained Argon2id/session/CSRF implementation; opaque database-backed sessions, 30-minute idle/8-hour absolute expiry | Owner/security and hosting measurement |
| P-08 | One receipt method/instrument per document; mixed tender represented by explicitly separate receipts | Accounts/owner |
| P-09 | Pending/deposited instrument balances tracked in nonspendable custody accounts; not spendable bank cash | Accountant/Accounts |
| P-10 | All general expenses require approval until thresholds are agreed | Owner; Q-11 |
| P-11 | No new overpayments/refunds, reference-less returns, unsupported cheque transitions or purchase corrections until policy resolved | Owner/accountant: fail-closed interim implementation boundary |
| P-12 | Revised roadmap brings minimum durable identity DB and shared transaction/approval controls earlier than dependent posting features | Owner/technical approval before P2.1 |
| P-13 | Separate numbered physical return-receipt child posts quarantine/claims; final inspected return disposition is all-or-nothing per return document | Owner/operations; prevents stock mutation by a financial draft and immutable-record conflicts |

## Unresolved decisions and implementation gates

| ID | UNRESOLVED question | Required reviewer / blocks |
| --- | --- | --- |
| Q-01 | What do SMALL F / SMALL R / BIG F / BIG R mean and how map them to approved item dimensions? | Owner/operations; item migration and matching |
| Q-02 | Canonical bottle types/sizes/quality/colour definitions, duplicate normalization and inactive-item exception workflow? | Owner/inventory; masters/openings |
| Q-03 | What proves physical return receipt/reusable classification, who inspects/authorizes, and how are damaged goods disposed? | Owner/operations; return release |
| Q-04 | Supplier returns, short receipt, purchase corrections and settlement/refund rules? | Owner/Accounts; purchase exception paths |
| Q-05 | GST/legal invoice/withholding/manual tax adjustments and supporting evidence? | Owner/accountant; financial sales release; no legal policy invented |
| Q-06 | Does the customer challan copy show rates/amounts/GST? What is the approved Unique Plastic print identity/template? | Owner; printing |
| Q-07 | Initial cheque policy, postdated instruments, deposit omissions, partial settlement, lost/replaced/re-presented instruments, bank fees, vendor cheques and post-clearance dishonour? | Owner/Accounts; cheque release |
| Q-08 | Approved cutoff, actual opening counts/balances, reviewers, freeze window and source reconciliation evidence? | Owner/accountant; cutover |
| Q-09 | Currency, monetary/quantity precision/limits, rounding/tie rule, rate precision and zero/free-item treatment? | Owner/accountant/inventory; authoritative posting |
| Q-10 | Numbering prefixes and year for backdated business dates, gap/historical number treatment, closed-period reopening authority? | Owner/Accounts; numbering/period controls |
| Q-11 | Expense thresholds, categories, proof, approver delegation and permitted ordinary expense posting? | Owner; expense release |
| Q-12 | Receipt overpayments/credit balances, refunds, receipt reversal/reallocation, vendor advances and write-offs? | Owner/accountant; settlement/correction release |
| Q-13 | Multiple stores/locations, inter-store movement, stock counts/frequency and discrepancy approval? | Owner/inventory; location/stock-taking scope |
| Q-14 | Eligible managed Express entitlement, actual proxy topology/headers, database version/limits, backup coverage and recovery expectations? | Owner/hosting/technical; production readiness |
| Q-15 | Historical paper reference handling and whether document-level opening outstanding references are needed? | Owner/Accounts; optional historical allocation detail |
| Q-16 | Read-only/Auditor role, specific sensitive columns/export grants and operational retention periods? | Owner/security; access/reporting release |
| Q-17 | Password reset/recovery without live SMTP, MFA for administrators and delegated emergency access? | Owner/security; identity release |
| Q-18 | Cutover handling of excluded employee-advance/payroll balances and reconciliation gaps, without classifying them as expenses? | Owner/accountant; opening sign-off |
| Q-19 | How are caps/seals/packing supplied with bottles operationally recorded as independent consumption? Any physically received purchase-invoice timing splits? | Owner/operations; consumption/purchase workflow completeness |
| Q-20 | Evidence standard and authority for prior dispatch quantity/variant recording errors, and above-reference return exceptions? | Owner/operations; stock-affecting corrections |
| Q-21 | Wrong customer/GST ledger class corrections and tax/receipt reallocation consequences, without automatic cross-ledger transfers? | Owner/accountant; financial correction paths |
| Q-22 | Concurrency/reconciliation response ownership, cache-mismatch recovery and approval of any initial deficit money balance? | Owner/Accounts/technical; operational acceptance |
| Q-23 | Retain source files privately outside runtime/deployment inputs; approved evidence storage/access/retention? | Owner/security; release hygiene |

All Q items remain unanswered by P2.0. A supplied record's apparent usage, this schema or a proposed default is not owner approval. Record future answers with date/actor/evidence, update the affected requirements/design/acceptance tests together, and obtain independent milestone review. Source access itself is resolved: the owner supplied the local folder and all five files were inspected as described; no missing-source claim remains.
