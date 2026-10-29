# PHP-7.9 management color and UX

The existing sidebar, workflow structure, dashboard charts, ranges and financial terminology are retained. The refresh adds screen-only presentation through refresh.css, imported after the existing management design. Financial print rules remain in the unchanged print stylesheets.

| Role | Palette / application |
| --- | --- |
| Brand | #F58220 orange, #252A30 charcoal; primary/create actions, selected navigation and login |
| Verified stock / positive | Soft teal/green surfaces, dark green labels and accent borders |
| Receivable / financial information | Muted blue surfaces and readable dark-blue totals |
| Draft / attention | Soft amber, explicit DRAFT and Needs attention labels |
| Error / dangerous operation | Restrained red text/surfaces with explicit action/error wording |
| Canvas / cards | Warm light-grey canvas and white surfaces |

Dashboard KPI tone assignments are explicit presentation metadata by existing label. No aggregation, money parsing, series points, date logic or financial values changed. Sales/return/net chart lines retain their legend and dashed distinction; colors do not replace labels or exact tables. Quick actions, chart panel borders, financial summaries, form section headings, selected filters, table headers, empty states, draft review panels and status badges use the same restrained vocabulary.

POSTED, DRAFT, CANCELLED and error labels remain visible; cancelled is a distinct neutral state, not presented as an error. Generic summary cards use subtle informational accents, not new financial meanings. No low-stock threshold, profit metric or automatic reconciliation was introduced. Existing icons, keyboard focus, mobile drawer, responsive tables and reduced-motion behavior remain.

The final login browser test checks selected dashboard/KPI text contrast (minimum 5.31:1), while dashboard acceptance verifies all original date ranges and amounts. Mobile form acceptance covers 27 views with labels, no overflow, no unexpected CSP violation and no financial submissions. CSS @media screen scoping keeps financial printing independent; actual PDFs/XLSX are separately checked.

Owner desktop/mobile visual review remains PENDING OWNER. The existing private bundle-size warning remains documented; no dependency was added.
