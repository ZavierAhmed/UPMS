# Operational reporting and exports

R-29 is **CONFIRMED**; layout, filters and performance defaults here are **PROPOSED**. Reports are operational subledger views, not a general ledger or audited/statutory statements. No report endpoint or export code is added now.

## Report catalogue and visibility

| Report | Measures / useful filters | Proposed default audience / sensitive restrictions |
| --- | --- | --- |
| Inventory by item/category | Available/quarantine/damaged quantities and base units; category/item/active filter; as-of time | Inventory; exclude customer balances, sales rates and bank details |
| Stock journal | Source/action, bucket, signed quantity and running balance; item/date/document/actor | Inventory; show adjustment approval/evidence only within granted scope |
| Production and consumption | Separate output/usage documents, references, quantities/reasons/date/creator | Inventory; never imply automatic yield, BOM or cost |
| Challans and sales | Posted original/effective values, customer/class, quantities, rates, subtotal/manual GST and linked corrections; date/customer/variant/class | Sales/Dispatch permitted sales data; account balances require an additional grant |
| GST/NON_GST sales | Separate subtotals/manual tax/sale totals and correction effects | Accounts; no statutory GST return or legal invoice claim |
| Customer running ledgers | Opening, debit, credit, balance; GST and NON_GST separate; customer/date/as-of/posting order | Accounts; consolidated read-only view only with permission and clear independent columns |
| Vendor ledger/purchases | Gross purchase payable, settlements, signed balance and purchase lines; vendor/date/status | Accounts; Inventory may see received quantities without supplier financial columns if granted |
| Outstanding balances | Signed party balances and eligible document matching; class/vendor/customer/as-of | Accounts; distinguish running balance from invoice allocations and pending cheque recognition |
| Receipts/vendor payments | Amount, method, source/selected ledger/account and recognized state; date/party/account | Accounts; no unrecognized Policy B receipt counted as ledger credit |
| Cash/bank/cash-holder | Separate balances and movements, transfers, expenses, approved deficits | Accounts; no default Sales/Inventory access; pending custody shown separately |
| Cheque register | Pending/deposited/cleared/dishonoured, policy snapshot, recognition/opening flags and custody; date/customer/bank/status/holder | Accounts; mask instrument/contact fields in reduced-scope exports |
| Expense summaries | Posted amount by date/category/paying account plus adjustments/approvals | Accounts; no advance/payroll grouping disguised as expense |
| Adjustments/returns | Original links, signed effects, physical receipt/inspection/disposition, approved credit valuation | Per-domain grants; financial return values not default Inventory visibility |
| Approvals/audit | Actor/action/version/reason, reviewer/self-approval/exception evidence | Administrator and expressly permitted auditor; sensitive column redaction enforced |

No P&L, balance sheet, trial balance, general ledger, COGS, stock valuation or employee-advance outstanding report is a V1 deliverable. Quantity × purchase rate in a source document is not an implemented inventory valuation method. 'Sales totals' do not establish accounting profit or tax compliance.

## Semantic rules

- Only committed effects enter balances. Draft/submitted/rejected/approved-but-unposted records can have workflow reports but never appear as posted stock, sale or money facts.
- Default effective views show original plus linked adjustments while keeping original and delta drilldown. CORRECTED is a label, not disappearance of the original. Avoid counting original and effective total together.
- Customer running balance D−C and vendor C−D must be explicitly labelled. Opening balance at the start of a date-filtered report includes all earlier authorized journal movements. Same-date order is stable `(business_date,posted_at,entry_id)`; provide a posting-order view for backdated investigation.
- Invoice matching is distinct from total ledger balance. Allocations do not create credits; releases do not create cash. Old opening running balances without itemized historical invoices remain clearly unallocated.
- Show cheque face/custody, recognized credit and cleared bank funds in separate columns. Do not add them as independent cash assets; disclose Policy A uncleared receipt risk and opening recognition markers.
- Stock buckets, units and quantities remain separate; never sum kilograms/pieces/rolls into one meaningless stock total. Consolidated money views require same configured currency; FX is deferred.
- Report date basis, timezone, filters, inclusion of correction effects, generation/as-of time and rounding policy. A printed customer copy's pricing visibility is unresolved; staff internal values remain stored.

## Query and export design

Authorize filters, object scope, aggregates and individual output columns **on the server**, including CSV/Excel/PDF/print. A hidden UI column must not remain in the JSON or download. Apply identical scope to underlying drilldowns; audit sensitive financial exports with actor/filters/column-set/as-of time, never full customer payloads in ordinary logs.

Propose keyset pagination, indexed date/party/source queries, bounded totals and explicit row/time caps suited to shared hosting. For one export use a consistent database snapshot or documented watermark; do not combine totals and lines from unrelated moments. Long exports must not hold posting locks or require a permanent worker. If limits are exceeded, require narrower filters or an authorized bounded chunking workflow; do not silently truncate.

CSV/Excel need formula-injection defenses for untrusted values beginning with spreadsheet command characters, explicit decimal/text/date treatment and preserved identifiers. PDF/print generation uses maintained escaping/rendering tools, no raw customer HTML. Generated files stay private with short approved expiry/revocable downloads, no predictable public static URLs. No report caches may outlive permission revocation without reauthorization; sensitive responses no-store. Export retention and authorized auditor role are decisions, not approved defaults.
