# Management UI audit

| Surface | Existing issue or review | Implementation / retained control |
|---|---|---|
| Sidebar | Long review/control group and difficult discovery | Five groups, searchable authorized entries, current-page marker, existing mobile focus trap and Escape retained |
| Page context | Technical version in staff top bar | Business page name; original route handlers preserved |
| Forms | Mixed spacing, borders, input sizes and focus treatment | Shared warm-white surfaces, 44px minimum controls, clear focus, compact fieldsets and readable validation |
| Cheque fields | Owner-reported misalignment; confirmed tablet label-height conflict | Paired labels/48px inputs, issuer/action grouping and measurable alignment |
| Issuing-bank dialog | Action footer inherited a half-width form column | One-column dialog form, full-width fieldset/footer, aligned Save/Cancel |
| Stock/production | Dense selectors, quantities and rates | Shared control/table standards; searchable employee and Add Employee retained; labor/value and initial-stock verification untouched |
| Challans/returns | Dense line grids and totals | Scroll-contained tables, readable amounts; single custom/generated display policy and source relationships retained |
| Clients/vendors/ledgers | Search and balances need clear hierarchy | Shared filter/card/table rules; opening, movement, closing and unverified labels retained |
| Money accounts | Custody must not appear spendable | Existing cash/bank/custody semantics and statement coverage preserved; filter/history behavior exercised |
| Employee Hafta | Coverage and opening evidence are essential | FULL/PARTIAL/UNVERIFIED evidence and all earnings/payment/deduction calculations retained; shared responsive surfaces |
| Expenses/categories/employees | Inconsistent selectors/dialog presentation | Shared dialog/control standards; employee Payee and immutable classification snapshots unchanged |
| Reports | Screen controls must not leak into output | Existing print headers, repeated table headings, coverage and reconciliation retained; cheque-specific print layout isolated |
| Empty/error/loading | Mixed visual treatment | Consistent empty cards, alerts, field errors and live loading messages; errors are not hidden |

No posting algorithm, balance, source link, permission or security gate was changed. Browser evidence contains loaded screenshots, mobile Back/Forward checks and reduced-motion verification. Screenshots with `aligned-` names are the final targeted cheque form review after owner clarification; general `after-management-` screenshots show the shared design-system pass.

Filtered-list return correction: URL-backed cheque/transaction/register filters and nested document parent history were verified in actual Chrome. The sidebar now identifies the business workspace for document details. This extends view metadata within the existing route events and preserves draft/authorization checks.
