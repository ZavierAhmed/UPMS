# Paid expenses only

Date, category, description, positive exact amount, PAID status, Cash/Bank transfer, payee, payment reference and optional remarks. Ordinary save creates a draft; explicit Finalize posts it. Description/category/payee/status remain readable in details and printing. Existing idempotent command and immutable posted-document rules apply.

EXPENSE is a V1 document kind. No new table or migration. Posting creates no bottle lines, stock journal or party journal. Runtime rights are unchanged19-table V1/identity scope. Party-linked expense posting is rejected, avoiding duplicate vendor payables. Reconciliation independently checks amount and paid evidence.

Unpaid expenses, later settlements, expense reversals and edits to posted expenses are unsupported. Do not record unpaid bills as paid. No payroll, recurring bills, tax, approval workflow, chart of accounts or old P2.7C activation. A future correction policy requires separate owner review.
