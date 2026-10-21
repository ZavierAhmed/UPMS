# P2.0 verification and future acceptance matrix

Documentation-only milestone, 2026-10-21. Baseline `868c488d7365fc148f21ca264d992a43f0f3990a`, branch `feature/upms-p2-0-requirements-architecture`. Local and remote W06 tips matched that exact SHA after fetch; no discrepancy was found. AGENTS.md, README and W05/W06 records were reviewed. No P2.1 implementation is included.

## Actual verification performed

| Check | Actual result / scope |
| --- | --- |
| Baseline and history | Fetch succeeded; W06 → W05 → W04 milestone chain confirmed; branch created from W06, not master. |
| Source access | Copies were initially absent from the known reference locations, so access was requested. Owner identified server/src/asset; all five files were then inspected read-only. Spreadsheet sampling and PDF/photo visual scope are documented in [requirements](P2-0-confirmed-requirements.md). No claim of full historical reconciliation. |
| Existing backend tests | 98 passed, 0 failed on Node 24.22.0, including W06 process startup/security tests. These exercise the existing public application, not future business rules. |
| Existing frontend tests | 89 passed across five files, 0 failed. No tests changed. |
| Build and lint | npm run verify passed frontend/prerender build, backend/frontend tests and frontend lint. Eleven public pages plus 404 still build; no production source/configuration changed. Local log: ignored tmp/w06/p20-verify.log. |
| Dependency audits | Backend and frontend npm audit reported zero vulnerabilities. No package/dependency/lockfile change. |
| Database/services | No MySQL connection, migration, import, production service configuration, SMTP sender or external deployment attempted. Existing tests use synthetic inquiry data and a local TCP sink/outbox, never real SMTP delivery. |
| Documentation | Fifteen requested files; valid relative links, balanced fences, eight Mermaid definitions and 54 future acceptance IDs checked by a local read-only documentation script. Diagram definitions are supplied as Mermaid source; visual rendering in a separate Mermaid engine is not claimed. |
| Scope/privacy diff | Only new docs/phase2 Markdown files staged. Runtime, website, API, tests, scripts/build configuration, packages and historical W05/W06 evidence unchanged. All source files and nine existing logo assets remain untracked and excluded. |

No new production or business tests were implemented. The acceptance scenarios below are **future tests to implement**, reviewed conceptually for design coverage; they have **not been run** against a Phase 2 system. Passing public W06 regressions is not proof of financial correctness, deployed compatibility or production readiness.

## Required-file manifest

All paths are relative to docs/phase2:

1. [P2-0-executive-summary.md](P2-0-executive-summary.md)
2. [P2-0-confirmed-requirements.md](P2-0-confirmed-requirements.md)
3. [P2-0-business-workflows.md](P2-0-business-workflows.md)
4. [P2-0-inventory-design.md](P2-0-inventory-design.md)
5. [P2-0-sales-challans.md](P2-0-sales-challans.md)
6. [P2-0-ledgers-payments.md](P2-0-ledgers-payments.md)
7. [P2-0-accounts-cheques-expenses.md](P2-0-accounts-cheques-expenses.md)
8. [P2-0-security-approvals.md](P2-0-security-approvals.md)
9. [P2-0-architecture.md](P2-0-architecture.md)
10. [P2-0-mysql-data-model.md](P2-0-mysql-data-model.md)
11. [P2-0-opening-migration.md](P2-0-opening-migration.md)
12. [P2-0-reporting.md](P2-0-reporting.md)
13. [P2-0-decisions-and-open-questions.md](P2-0-decisions-and-open-questions.md)
14. [P2-0-implementation-roadmap.md](P2-0-implementation-roadmap.md)
15. [P2-0-verification.md](P2-0-verification.md)

## Future invariant / acceptance-test matrix

All parties, quantities and amounts in future tests must be synthetic. Each scenario must assert journals, caches, source state, number issuance and audit as appropriate, not just HTTP success. Concurrency tests need separate real database connections and restart/retry tests, not a single in-memory mock.

| Test ID | Invariant / scenario | Required future acceptance result |
| --- | --- | --- |
| INV-01 | Two concurrent finished-stock outflows individually fit but together exceed stock | At most available total commits; loser sees updated balance/fails, no partial sale/ledger effects |
| INV-02 | Equivalent concurrent raw/cap/seal/ring/packing consumption | Same no-negative protection for every category; admin attempt cannot bypass |
| INV-03 | Repeated lines for same item exceed stock in aggregate | Aggregate validation fails before posting, even if each line individually fits |
| INV-04 | Draft quantity above balance; later posting after enough stock or without it | Draft allowed; actual posting checks locked current stock, not draft-era availability |
| INV-05 | Piece fractions, excessive measurement scale, changed transacted unit and packing-only difference | Invalid precision/unit change rejected; packing does not create another finished variant |
| INV-06 | Simultaneous duplicate normalized variant/master creation | One canonical unique variant; no NULL-dimension duplicate or guessed abbreviation mapping |
| INV-07 | Finished production versus material consumption | Production adds finished only; consumption removes eligible materials only; no automatic BOM effects |
| INV-08 | Deliberate stock cache/journal mismatch and unauthorized stock-taking adjustment | Detect/block affected posting; approved evidenced correction only, no silent cache edit |
| INV-09 | Damaged/quarantine outflow or correction would become negative | Reject; unavailable stock never participates in available dispatch/consumption |
| SAL-01 | Failure injected at each challan posting step | Whole transaction rolls back stock, customer debit, document state/audit/result and unissued number |
| SAL-02 | Same key replay, changed-payload same key, concurrent different keys on one challan, restart after lost response | One committed posting/number/effect set; authorized replay or conflict, no process-local-only dedup |
| SAL-03 | GST/non-GST choice, manual GST and exact line amounts | Correct independent debit; no inferred tax rate; non-GST cannot add GST |
| SAL-04 | Ordinary permitted Sales/Dispatch user posts a normal challan | Direct post succeeds without invented blanket secondary approval |
| SAL-05 | Direct POSTED edit/delete, correction without reason/approval or stale original revision | Denied; original payload/number remains unchanged |
| SAL-06 | Rate/metadata correction versus quantity/recorded-variant error | Only justified deltas; no stock for financial-only edits; physical evidence required for stock changes |
| SAL-07 | Goods actually dispatched then a request to reduce sold quantity | Cannot manufacture available stock; physical return workflow required for goods actually coming back |
| SAL-08 | Two corrections on same original/effective revision or correction below existing allocated value | Serialize/reject stale approval; require authorized matching-release plan, no extra receipt credit |
| RET-01 | Return received but uninspected/unapproved | Quarantine only; no available stock or automatic party credit |
| RET-02 | Reusable/damaged mix and approved valuation including damaged credit | Only reusable becomes available; credit equals separately approved valuation, not reusable units alone |
| RET-03 | Two concurrent receipts exceed remaining referenced dispatch entitlement | Parent-line guard permits only allowed claims; inspection/final posting does not claim again |
| RET-04 | Missing-reference/above-limit exception without explicit approved policy/evidence | Fail closed; no arbitrary stock creation or customer credit |
| RET-05 | Partial inspection, repeated disposition or attempted entitlement recycle after disposition | Unresolved quantity stays quarantined; no duplicate credit/stock/claim release |
| PUR-01 | Full/partial/credit received purchases | Correct stock/gross payable; zero/one immediate settlement and derived outstanding remainder |
| PUR-02 | Immediate-payment failure or retry with another request key | Stock/payable/payment/account all atomic; unique linked settlement prevents duplicate payment |
| PUR-03 | Payment erroneously entered again as expense or vendor return removes consumed stock | Duplicate-purpose settlement blocked; unsupported return/correction path not silently implemented |
| PAY-01 | Cash/bank receipt then immediate, partial, multiple or later allocations | One customer credit and account inflow total; allocation adds no credit |
| PAY-02 | Concurrent matching beyond receipt recognized amount or invoice eligible remainder | Serialize on ledger/doc guards; reject excess and cross-customer/class/currency matches |
| PAY-03 | Deallocation/reallocation or recognition reversal after allocation | Immutable matching events; no double release, no cash/credit invented; atomic eligibility repair |
| PAY-04 | Customer has opposing GST and NON_GST balances | No netting/transfer, even if combined report is zero; correct column/filter authorization |
| PAY-05 | Exact decimal multiplication, rounding tie, overflow and excessive input scale | Match approved policy exactly using decimal strings; reject illegal scale/range before DB coercion |
| CHQ-01 | Policy A receive → deposit → clear, including concurrent/repeated events | Exactly one party credit at receipt; custody moves once; bank once; no clearance credit |
| CHQ-02 | Policy B receive → deposit → clear | No pre-clearance credit/allocation; exactly one credit at confirmed clearance |
| CHQ-03 | Dishonour before recognition versus after recognized credit/clearance | No fictitious debit on uncredited instrument; reverse actual unreversed credit once; correct custody/bank effects |
| CHQ-04 | Company changes policy while instruments are pending | Old cheques keep their snapshot; no retroactive recognition rewrite |
| CHQ-05 | Opening cheque already credited in old net customer balance | Clearance adds no second credit; dishonour reverses only documented included recognition |
| CHQ-06 | Unsupported postdated/re-presented/lost/partial/vendor-cheque case | Block until approved policy; no resetting old state or creating a duplicate instrument |
| ACC-01 | Concurrent money outflows/transfer and expense from same source account | No normal negative result; transfer equal opposite legs and no income/expense/party duplicate |
| ACC-02 | Specific admin deficit approval then balance/amount/version changes before post | Stale approval rejected; exact resulting deficit/actor/reason retained; no permanent exemption |
| ACC-03 | Staff attempts deficit exception or any actor tries stock bypass | Denied, including administrator stock override attempt |
| EXP-01 | Expense posting filters/category/reference; vendor settlement/advance disguised as expense | One expense/outflow only; duplicate settlement blocked; advances/payroll excluded |
| APR-01 | Staff self-approval versus justified currently permitted administrator self-approval | Staff denied; admin permitted only with required permission, reason and explicit audit |
| APR-02 | Edit approved payload/effects, revoke permission, disable user, close period or change original revision | Revalidate at action; stale authority/approval rejected; history retained |
| NUM-01 | Parallel posting per type/year; rolled-back candidate; committed corrected document | Unique annual numbers; separate type counters; no issued-number reuse; failed unissued candidate not exposed |
| NUM-02 | Pakistan calendar-year boundary and backdated/closed-period/cutoff attempts | Deterministic approved posting-year policy; ordinary illegal dates blocked; explicit exception audit only |
| OPN-01 | Duplicate opening run, incomplete generation, changed evidence after approval | No double initialization or ordinary posting before verified release; approval binds reconciliation hash |
| OPN-02 | Stock/money/party/cheque source totals do not reconcile | Block cutover; no fictional balancing expense/GL or negative-stock exception |
| OPN-03 | Pending cheque custody already counted; historic invoices absent; advances in source PDF | No duplicate custody/credit; running-balance receipt supported; no invented sale/expense/history import |
| SEC-01 | Session fixation, expiry/logout/revocation, CSRF and login abuse | Maintained security controls, current grants, safe failure/logging, bounded expensive work |
| SEC-02 | Inventory/Sales user queries balances/export columns through API directly | Sensitive columns/aggregates/lookups denied or omitted server-side; no route-hiding-only protection |
| SEC-03 | Public prerender/static/sitemap/inquiry access attempts private routes/scripts/data/exports | No management data/assets/financial bootstrap leaked; existing public behavior unchanged |
| RPT-01 | As-of running balances, corrections, unit/currency filters and cheque totals | Journal-derived consistent view; no double original/effective totals or custody/bank counting |
| RPT-02 | Unauthorized export, CSV formula payload, revoked grant during retrieval and huge date range | Scope checked, unsafe cell values escaped, private bounded output, no silent truncation/long posting locks |
| OPS-01 | Lock timeout/deadlock, connection loss, restart after commit and full pool | Whole transaction safely rolled back/retried within limits or durable result recovered; no duplicate source effects |
| OPS-02 | Restore approved backup into isolated environment and reconcile journal caches/recognition | Measured owner-approved recovery drill; no live SMTP/DB overwrite or unsupported readiness claim |

## Request-section coverage review

This is a design coverage review, not evidence that a business implementation passed the scenarios.

| Owner request section | Coverage |
| --- | --- |
| 1 baseline/safety | Actual baseline/diff evidence above; docs-only branch/commit/push scope |
| 2 sources/evidence | E-01–E-05 in requirements; private inspection, no fabricated data or abbreviation decoding |
| 3 scope/modules | Executive summary and architecture boundary; sixteen operational areas across owning documents |
| 4 classification/units | Inventory/model; INV-05/06 |
| 5 inventory invariant | Inventory/architecture; INV-01–04/08/09 |
| 6 stock-in | Workflows/inventory; INV-07/PUR-01 |
| 7 consumption | Workflows/inventory; INV-02/07 |
| 8 challan/sale | Sales and sequence diagram; SAL-01–04 |
| 9 GST | Sales/ledgers; SAL-03/PAY-04/Q-05 |
| 10 corrections | Sales; SAL-05–08/APR-02 |
| 11 returns | Sales/workflows/inventory; RET-01–05 |
| 12 purchases/vendors | Workflows/ledgers/model; PUR-01–03 |
| 13 receipts/allocations | Ledgers; PAY-01–04 |
| 14 cheques | Accounts state/effect tables; CHQ-01–06 |
| 15 money accounts | Accounts/architecture; ACC-01–03 |
| 16 expenses | Accounts/reporting; EXP-01/Q-11; payroll/advance exclusion |
| 17 opening/cutover | Opening plan/model; OPN-01–03 |
| 18 roles/approval | Security diagram/matrix; APR-01/02/SEC-01/02 |
| 19 annual numbering | Architecture/model; NUM-01/02/Q-10 |
| 20 operational integrity | Architecture/ledgers; PAY-05/OPS-01; no fictional general ledger |
| 21 MySQL logical design | Full table dictionary/shared profiles/ERD; no DDL or connection |
| 22 security | Security/architecture; SEC-01–03 |
| 23 hosting/resources | Architecture/W06 gates; OPS-01/02/Q-14 |
| 24 reports/exports | Reporting; RPT-01/02 |
| 25 deliverables/diagrams | Fifteen-file manifest; architecture/flows/sequences/states/ERD/approval diagrams |
| 26 decisions | C/P/Q register, explicit blockers and reviewers |
| 27 verification | Actual regression evidence and unexecuted acceptance matrix separated |
| 28 roadmap | Proposed P2.1–P2.9 order with dependency corrections; no implementation |
| 29 completion | Exact requested commit/push to feature branch; final SHA reported to owner after completion |

## Independent review and remaining risks

All technical defaults remain proposals. Owner/accountant review is required for precision/rounding/currency, GST/legal invoice/withholding, cheque/receipt/refund cases, physical correction/return proof, expense approvals and opening reconciliation. Actual hardware/engine/hosting/proxy/backup behavior is unverified. Operational subledgers cannot produce full financial statements or tax compliance guarantees. Strict stock protection may block a recording correction until physical evidence/current balances are reconciled; approvals cannot remove that protection.

The five newly supplied reference files currently sit inside server/src/asset. Existing Express static serving does not expose that directory, and they remain untracked. W06's deployment packager recursively validates runtime inputs and will **fail closed** on these unexpected non-JavaScript files; do not run it expecting a new release package until the owner approves private evidence placement outside runtime/deployment inputs. No file relocation/deletion, packager change or deployment was performed for P2.0. Q-23 records this release-hygiene issue.

The fifteen new documents, all diagrams and the logical dictionary need independent owner/technical review before approving P2.1. No source evidence is being adopted as company branding or confirmed opening data. Stop at P2.0.
