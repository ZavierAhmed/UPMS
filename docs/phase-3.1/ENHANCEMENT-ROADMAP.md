# Owner / Haris enhancement roadmap

Audit scope: deployed PHP Simple V1 paths at baseline `07897208`, not the older Node ERP modules. Existing Node cheque, GST and expense modules are reference material; their presence does not establish PHP V1 functionality. No items below are deployed in this milestone.

| Priority / requirement | Current PHP V1 or public-site evidence | Proposed work and acceptance boundary |
|---|---|---|
| P1 · Bottle purchase and selling rates | `MasterData`, `Pricing`, `Documents`, `BottleLineEditor`: optional default selling price; editable positive line rates; immutable posted snapshots. Purchase line rates already supported. | Improve separate purchase-rate defaults/history and buying/selling UX. Confirm effective-date and tax policy; never rewrite snapshots or make unset prices zero. |
| P1 · Logo on printed delivery challans | `SimpleV1.jsx` Document shows company text/signatures; Hafta now imports the existing approved company SVG. | Reuse approved logo in challan print template, verify pagination; no third-party identities. |
| P1 · Detailed items in ledger exports | `SimpleV1::ledger` and `Ledgers` export journal particulars/reference, not posted item breakdown. | Join immutable source lines in an optional detailed export; keep debit/credit totals counted once per document. |
| P1 · Clean ledger-only PDFs | Existing Tools calls browser print, with general management print CSS. | Dedicated ledger print component; hide navigation/filter controls, repeat headings, exact signed amounts. |
| P1 · Four holdings: Haris, Junaid, UBL Official, Cheques | `SimpleV1::state` explicitly says cash/bank balances are not managed. Payment method labels are not financial accounts. | New account model, explicit verified openings, account permissions, reconciliation and append-only journals. Owner must confirm each holding's legal/business meaning. |
| P1 · Account-linked receipts, expenses and transfers | `Documents` supports account-level party receipts/payments and paid expenses, with method/reference only. No holding balances or transfers. | Depend on four-holding model. Atomic balanced transfers, immutable postings and reversals, no duplicate party credit. Requires a separate schema/security milestone. |
| P1 · Future-dated cheque register/status workflow | PHP V1 cheque reference credits client on receipt; explicit dishonour reversal exists. Future posting is blocked. | Separate received/deposited/cleared/dishonoured/returned lifecycle, cheque date and holding movements. Confirm when party credit is recognized; do not port legacy Node code without PHP parity/security review. |
| P1 · Customer/vendor outstanding summaries | `overview` has signed net client/vendor positions and unverified-party count; ledgers are separate. | Party-level outstanding statements with verified coverage, date cutoff and GST separation when explicitly recorded. Do not net customers and vendors together. |
| P2 · Custom external challan numbers | Internal DC sequence and official identity protected; payload reference already stores an external reference. | Improve external-number input/search/print and duplicate policy while preserving immutable internal identity and idempotency. |
| P2 · Improved vendor purchase entry | `Transactions`, `Documents` support PURCHASE stock lines, vendor, reference and paid-immediately flag. | Improve item search, rate entry and payable/paid explanation. Confirm vendor bill number and holding allocation; retain stock reconciliation and transaction atomicity. |
| P2 · Bills, quotations, purchase orders | Not in `Documents::KINDS`; paid expense register is not a bill or payable workflow. | Design independent draft/approve/post/convert lifecycle; quotations and POs must not post stock/money until authorized fulfillment. |
| P2 · Searchable expense categories / inline creation | Local P3.2B2 ExpenseMasters/ExpenseEntry: stable categories, search, + popup, auto-selection, versions/activity and audit history. | Implemented and tested locally; disabled by default. Hosted schema/guard/backup and owner release gates remain pending. |
| P2 · Employee expense categories / searchable employees / inline creation | Local P3.2B2 employee directory, Employee-Based flag, required search/+ popup, immutable source snapshots and business-expense confirmation. | Implemented locally; no payroll, employee advance or loan accounting. Resolve duplicate real names and access/approval policies before release. |
| P2 · Category/employee expense reports | Local P3.2B2 posted-only category/employee/date groups, exact totals, identity/account filters, legacy bucket and verified PDF/XLSX exports. | Implemented locally. Reports are not payroll or full profit-and-loss statements; no historical mapping inferred. |
| P3 · Website product PDF downloads | Product category/gallery pages exist; approved category download flow needs asset/identity audit. | Stage approved PDFs, verify identity/metadata/alt text, accessible download links and correct file sizes. Do not publish source brochures blindly. |
| P3 · Machinery descriptions, confirmed HDPE blow moulding | `Manufacturing.jsx` describes brochure machinery generically; no verified machine specification registry. | Owner-approved equipment descriptions and photographs. HDPE blow moulding is a confirmed requested capability; capacity, model, manufacturer and count require evidence before publication. |
| P3 · Bottle, sticker and carton photography | Approved bottle/catalog imagery exists; stickers/cartons currently use explicitly labelled illustrations in `company.js`. Unrelated untracked source assets are preserved. | Stage owner-supplied photography separately, review rights and branding, optimize and write accurate alt text. Conversation images are not available assets here; no replacement photography is fabricated. |

Cross-cutting gates for future work: isolated synthetic tests; retain PHP 8.3 compatibility, operator authorization, first-password restrictions, exact money, transaction safety, audit, idempotency and immutable snapshots; assess changes against all 45 guard definitions; production deployment and business-state changes require their own approved milestone.

Phase 3.1 completes Hafta, item optionality and the affected Back navigation only. Cash holdings, cheque lifecycle, new modules and public content changes remain backlog work.

## P3.2A progress — local only

The Money Accounts foundation now implements configurable Haris/Junaid cash holdings, UBL Official bank and nonspendable Cheques custody; explicit openings; exact immutable movements; atomic transfers/reversals; statements; additional guard design and isolated forward/restore tests. It is disabled by default and has not been deployed. See [P3.2A technical report](../phase-3.2a/TECHNICAL-REPORT.md).

Requirements 5 and the foundation portion of 6 are locally implemented. Account-linked existing customer receipts, vendor payments, paid purchases and expenses remain **P3.2B**, with no historical backfill. Requirement 7 remains **P3.2C** for the instrument register and clearing/dishonour workflow; custody opening value is not spendable funds or a full cheque lifecycle. Category/employee requirements remain subsequent work. All other 17 requirements and branding/asset approvals remain as recorded above.

Production migration remains blocked pending version-aware 25-table/60-guard protected off-host backup/recovery, actual hosted readiness and a separate explicit owner release approval. No prior production authorization is treated as approval of these new money operations.

## P3.2B1 local financial integration checkpoint

Cash/bank customer and vendor payments, paid expenses and immediate purchases now create atomic canonical money-account effects in the active PHP application. Credit purchases remain payable-only. P3.1 Hafta/item behavior and historic snapshots are preserved. Searchable account selection, exact effect previews and source links are implemented. This extends requirements 5/6 locally; it does not complete the full financial/cheque roadmap or authorize deployment.

See [P3.2B1 report](../phase-3.2b1/TECHNICAL-REPORT.md), [P3.2B2/P3.2C boundaries](../phase-3.2b1/NEXT-INTEGRATION-PLAN.md) and the [pending production checklist](../phase-3.2b1/FUTURE-PRODUCTION-CHECKLIST.md). All original seventeen requirements remain in force.

## P3.2B2 local expense and employee checkpoint

Requirements 12–14 now have an implemented and tested PHP/React foundation: searchable category/employee masters, inline creation, explicit Employee-Based behavior, immutable snapshots and exact posted-only reports/exports. No production migration or deployment occurred. The cumulative extension is 29 tables / 72 guards; the original 45+15 guard bodies remain unchanged.

See [P3.2B2 report](../phase-3.2b2/TECHNICAL-REPORT.md), the separate proposed [P3.2B3 financial corrections](../phase-3.2b2/P3.2B3-FINANCIAL-CORRECTIONS.md), updated [P3.2C cheque plan](../phase-3.2b2/P3.2C-CHEQUE-PLAN.md) and [pending production checklist](../phase-3.2b2/FUTURE-PRODUCTION-CHECKLIST.md). All other seventeen original requirements and branding/asset approvals remain in force.

## P3.2B3 local correction checkpoint

Full actual cash/bank customer refunds, returned vendor payments and paid business-expense refunds now have linked atomic PHP documents, original-account effects, immutable source snapshots, idempotency and signed reports. Incorrect-entry-only, metadata/category/employee, wrong-account, partial/backdated, legacy/cheque and purchase/goods-return cases remain explicitly blocked pending their separate policies. No purchase stock reversal is inferred.

The cumulative schema/guards remain 29/72 with no new definitions. Refund-aware encrypted isolated recovery and desktop/mobile acceptance passed locally; protected hosted backup integration, genuine independent recovery and separate owner release gates remain pending. Features default off and no production work occurred. See [P3.2B3 report](../phase-3.2b3/TECHNICAL-REPORT.md), [policy matrix](../phase-3.2b3/CORRECTION-POLICY.md), [release checklist](../phase-3.2b3/FUTURE-PRODUCTION-CHECKLIST.md) and [P3.2C dependencies](../phase-3.2b3/P3.2C-CHEQUE-PLAN.md). All original seventeen requirements and Unique Plastic branding/asset constraints remain in force.
