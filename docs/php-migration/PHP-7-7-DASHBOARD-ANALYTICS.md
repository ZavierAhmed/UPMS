# PHP-7.7 dashboard analytics contract

## Data and arithmetic

No endpoint, migration or stored summary is added. OperationsDashboard receives
the existing authorized Simple V1 data already loaded by its parent: overview,
items, clients, vendors and documents. The existing seven-read refresh path is
unchanged. Changing 7/30/90 days makes no additional API request. Authorization,
same-origin, CSRF and posting code are untouched. The production dashboard has
no mock/demo arrays or browser-stored financial inputs.

Aggregation uses integer BigInt cents and decimal strings. Only bounded chart
coordinates/percent widths convert ratios to Number; displayed money remains
exact. Business dates are the stored YYYY-MM-DD values. The range ends on today's
Asia/Karachi calendar date, includes both endpoints and subtracts calendar days
using UTC date arithmetic. It does not substitute created_at for business date.

| View | Definition / coverage |
| --- | --- |
| Six current/today KPIs | Existing overview values: active items, verified available bottles, today's posted challans/sales, current net client receivable/vendor payable. Current balances include advances and ignore activity-range selection. |
| Sales activity | Posted CHALLAN totals by business date; posted CHALLAN_RETURN credits separately; net = sales minus returns. Neither profit nor collected cash. |
| Inventory | Current active verified items, descending exact bottle quantity; at most eight visible bars. Missing openings excluded, never treated as verified zero. No low-stock threshold. |
| Posted activity | Selected-date POSTED counts by the existing thirteen document kinds. DRAFT/CANCELLED counts are separate; neither contributes money. |
| Net client receipts | Selected-date CLIENT_PAYMENT minus PAYMENT_REVERSAL whose original source is CLIENT_PAYMENT. Includes cheque ledger credit, not verified bank collection. |
| Net vendor payments | Selected-date VENDOR_PAYMENT plus immediately paid PURCHASE, minus reversals sourced to VENDOR_PAYMENT. Credit purchases do not count as payments. |
| Expenses / returns | Selected-date paid EXPENSE totals / CHALLAN_RETURN credits. No GST, margin, cash balance or invoice allocation is invented. |
| Recent activity | Latest eight documents by business date then exact numeric ID; type/reference/party snapshot/posted amount/status link to existing detail pages. Nonfinancial/draft amounts are not presented as posted financial totals. |
| Attention | Current unverified active item openings, unverified party openings and drafts. Explicit Settings link for reconciliation; no automatic reconciliation call. |

Reversals are assigned to their own business date, even when the original payment
is outside the selected range. If an original source is unavailable, payment
summaries say Incomplete rather than guessing its category. Invalid monetary
evidence produces safe refresh/review UI rather than fabricated chart values.

## Accessibility and performance

Sales series have distinct colors/dash treatment, units, date coverage and an
expandable exact daily table. Inventory has item labels and exact bottle counts.
Posted-type meters have readable counts and accessible labels. Empty ranges and
missing openings have explicit empty states. No growth percentage is fabricated.

A test-only 10,000-document / 90-day benchmark measured a 13.49ms median across
five local runs. Chart series are bounded at 90 points, inventory at eight rows
and recent activity at eight rows. Source records are still processed in memory;
recent sorting is O(n log n), totals are O(n). The inherited complete-record read
architecture remains a scaling limitation for large production histories. This
milestone adds no unrestricted SQL read and makes no production capacity claim.
No chart dependency, license burden or dependency vulnerability was introduced.

Actual browser checks validated 200.00 sales, 50.00 return credits and 150.00 net
sales in the canonical fixture; net client receipts 50.00 after cheque reversal,
vendor payments 75.00 and paid expenses 18.00. Unit tests also cover paid purchases,
reversals, signed net sales, large exact values, range boundaries, invalid/empty
data, unverified stock, draft/cancel exclusion and navigation. All are read-only
dashboard calculations; existing posting/reconciliation implementations are unchanged.
