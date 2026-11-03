# Employee Hafta policy

Implemented for isolated UAT only. `UPMS_EMPLOYEE_HAFTA_ENABLED` defaults to false. This is not production approval.

An assigned employee earns piecework only when a PRODUCTION document posts successfully. Quantity multiplied by the explicitly entered per-piece labor rate determines each immutable earning. Labor rates are independent of selling and purchasing rates. A zero rate requires explicit confirmation. Drafts, cancelled drafts, purchases, opening stock and stock corrections do not earn labor. An unassigned production is explicitly unallocated; historical quantities never imply wages.

Opening payable is **UNVERIFIED** until an administrator explicitly records a reviewed coverage date, amount and evidence. Zero is accepted only as an explicit reviewed opening. The system never converts an old employee business expense into a wage payment or invents historical earnings. A period preceding verified coverage remains unverified. All-employee balances remain unverified if any included balance is unknown.

For a verified employee, opening = reviewed opening + prior recorded earnings - prior Hafta settlements. Closing = opening + current earnings - current settlements. Weeks use the existing Karachi business-date Monday–Sunday helper; custom dates are inclusive. Balances carry across weeks.

A Hafta payment records actual outgoing cash or bank money and reduces only the selected holding and employee payable. It is not an ordinary expense document and does not also create a customer/vendor journal entry. Payment cannot exceed verified payable or available money. No advances, negative payable, anonymous payroll allocation or silent backdating are supported. Employee payment dates cannot precede their latest earning/payment; existing account chronology rules also apply.

Employee-associated business expenses remain separate, labeled **Not deducted from labor balance**. There is no historical reclassification. Employee renames preserve original posting snapshots. Inactive employees cannot be selected for new production or payment. Existing records remain reportable.

Corrections, reversals, clawbacks, advance policies and retroactive opening adjustments require further business approval and implementation. The correction permission is reserved and ungranted; there is no correction API. Stock corrections do not silently reverse wages.

All active Simple V1 operations still require an administrator. Additional labor view, record, pay and opening permissions separate these actions; money-account details require `money.accounts.view`. These permissions do not enable ordinary staff access to Simple V1. No production user or administrator was recreated.
