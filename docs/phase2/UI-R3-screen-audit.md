# Round 3 screen audit — before implementation

Verified source feature/upms-ui-navigation-ux-fixes at ac837c4cd14e5e7940589c8cb89e4d013132841f. Nine untracked source logos are preserved and excluded. Existing UAT02: four enabled demo roles,109 restricted runtime table scopes, matched reconciliations, recovered MariaDB3309 normal recovery0. Main100 business-table fingerprints, seven saved profiles and1037 files in each original/offline snapshot match baseline. No reset or data overwrite.

Priority P0: preserve permissions, accounting/stock, browser navigation and demo/main data throughout. P1 below must be resolved or explicitly blocked. P2 denotes secondary polish. Audit covers all current private screens, including nested forms/history/configuration.

| Screen / existing route | Existing entry/actions and issues | Priority / required correction |
|---|---|---|
| Overview /management | Sidebar/cards; role-authorized summaries; primary actions open workspace only; neutral buttons, insufficient workflow hierarchy |P1 consistent action system and obvious workflow landing actions |
| Customers /management/customers | Currently alias of Sales customer ledger; no dedicated master list/create/detail/edit; contacts hidden in generic masters |P1 separate customer registry and /customer-ledgers; preserve /sales/customers legacy ledger |
| Vendors (no dedicated route) | Master Data dropdown; authorized create/edit but no detail route/searchable dedicated entry |P1 /vendors using existing vendor API/form |
| Products/items (no dedicated route) | Master Data items; create/edit canonical categories/unit/four dimensions; immutable identity only protected by server; no dedicated details |P1 /products with explicit metadata/stock distinction and identity locked in edit UI |
| Reference masters /masters | Generic resource selector with approved forms; references, money accounts, periods, proposals; inline create/edit; audit details serialized |P1 keep actual APIs/forms, link dedicated pages; readable audit. P2 reference-route selection |
| Inventory /inventory | Overview/documents/new/history/reconcile/configuration; production/consumption/count/correction; dense detail/version/payload evidence |P1 shared details/actions; preserve adjustment/negative stock guards |
| Purchases /purchases | List/new, supplier invoice/payment and correction; vendors/money/reconciliation; detail mixes source facts/technical data |P1 shared details/actions and vendor registry link |
| Vendor accounts /purchases/vendors | Existing classified vendor financial workspace; no registry entry |P1 retain financial permission, explicit link from vendor details |
| Sales /sales | Challans/new/detail/history, customer ledger/configuration/reconciliation; New delivery challan appears below tabs, obscure to owner |P1 prominent header New Challan, working original lifecycle |
| Customer ledgers /sales/customers and /customers | Separate class selection but many redundant technical paragraphs/arrays; no financial hierarchy/type filters/source links |P1 new accounting-style /customer-ledgers using existing authoritative projections, no GST/NON_GST combination |
| Receipts /receipts | List/new/application/reconciliation and draft/detail/history; balances/allocations mixed with JSON Evidence |P1 shared details, business summaries, secondary diagnostics |
| Cheques /cheques | Receive draft/saved draft/detail/deposit/clear/dishonour; custody versus settlement explained but dense records |P1 shared details; custody separate from customer credit |
| Returns /returns | Request/receipt/inspection/reconciliation; source-dependent new URLs; dense physical history and variant JSON |P1 business physical quantities, collapsed activity, preserve source-dependent permissions |
| Credit notes /credits | Request/list/details/approval/post/correction/reconciliation; technical hashes and approval snapshots prominent |P1 shared readable details; keep exact version approvals/server guards |
| Expenses /expenses | Obligations/payments/categories/reconcile; summary/list dense and technical detail/history mixed |P1 shared detail/actions; collapse secondary category configuration |
| Approvals (master selector and document details) | Exact review/approve/reject actions exist; no fake global pending queue |P1 consistent green/red/amber labels; never hide required approval controls in collapsed audit |
| Audit /audit, masters audit and per-document history | Identity raw pre, master serialized details, document events/source hashes |P1 human action descriptions; authorized administrator-only technical disclosures |
| Staff /users and profile /profile | Actual create/edit/revoke/change-password actions; role guarded; inconsistent neutral buttons |P1 semantic actions; preserve session/password restrictions |

Cross-cutting: existing label associations/native validation and no-overflow rules exist; normal/empty/error states use generic wording. Loading uses fixed read-progress. Mobile drawer is focus trapped and closes on selection/Escape. Keep these and Back/Forward/deep refresh/unsaved warnings while improving labels, default evidence visibility, row actions and mobile cards. Existing master list API caps100 matching records; expose that bound instead of inventing pagination. Existing ledger history has bounded ancillary arrays; disclose coverage and avoid a fabricated running balance.

Implementation outcomes and residual P2 issues are recorded in UI-R3-open-issues.md after verification. Owner visual approval and full manual UAT remain paused.

## Verified implementation outcomes
All listed P1 usability areas now use dedicated directories, semantic actions, readable evidence/details or the classified ledger. Primary creation actions are in workflow headers. Existing server authority and public branding are unchanged. Remaining bounded-history, draft-memory and secondary formatting limits are documented in UI-R3-open-issues.md. Owner visual sign-off remains pending.
