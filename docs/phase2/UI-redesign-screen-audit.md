# Management screen audit

Before evidence: ignored tmp/ui-redesign/before, preserved from the completed P2.7C demo captures. Initial UI had a horizontal button strip, plain bullet records, narrow forms and a foundation-only overview. Original source and data are retained in source commit9a7458bf562957da6d5a9da74fd3be37ae802087.

| Screen | Corrective presentation |
|---|---|
| Administrator/Accounts overview | Authorized read-only KPIs, scoped notes, pastel workflow cards, two-column hierarchy |
| Master Data | Shared readable controls/tables; existing canonical validation and master CRUD preserved |
| Inventory | Consistent heading/actions; unit/condition distinctions retained; mobile record tables |
| Purchases/vendor accounts | Separate receipt/invoice/payment presentation, readable ledger/journal cards and review confirmation |
| Sales | Readable responsive challans/line tables, explicit GST/NON_GST, retained source/detail/audit controls |
| Customer ledgers | Existing explicit classification selection, stale-response protection and separate credit/unapplied/outstanding labels |
| Customer Receipts | Structured customer/classification/account/allocation form; confirmation and immutable receipt audit |
| Cheques | Custody/settled distinction retained; responsive lifecycle table; exact dishonour source reviewed |
| Physical returns | Quarantine/inspection quantities and condition release remain distinct from financial credit |
| Credit notes | Dedicated form/detail with return-to-list action, exact approval and explicit no-refund presentation |
| Business expenses | Category/status cards, dedicated form/detail, separate original/paid/payable, payment source links |
| Users/profile/history | Coherent forms and mobile tables; timeline and permission controls retained |
| Approvals/reconciliation | Existing actual module destinations, shared visual system and read-only mismatch evidence |

No business service, migration, API contract or authority rule was changed. Card/list rendering retains actual record values and handlers. Financial confirmation adds a UI-only read/review gate; same POST body and durable command key reach the same server afterward. Synchronous in-flight refs supplement disabled controls in older modules. No success appears until confirmed API completion. Empty/load/error states and a workspace error boundary improve recoverability without editing records.
