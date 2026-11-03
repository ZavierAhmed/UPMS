# Future production checklist — no deployment authorization

This branch does not deploy production or migrate either owner UAT database. New flags remain false by default; a production profile is explicitly rejected by the isolated extension readiness path. Existing 20/45 operational backups are untouched.

Before any separately approved production release:

1. Review and approve full-source classification, effective-date expense adjustments, unsupported advances/refunds and residual SQL-credential risks with the owner/accountant.
2. Preserve and independently recover the actual target's current data before any additive change. Inventory the actual target version; do not assume its schema matches synthetic UAT.
3. Prepare a separately reviewed additive migration and least-privilege maintenance/definer procedure. Runtime remains CRUD only. Preserve every original row/guard and verify exact new DDL, constraints, receipts, grants and all 103 guard definitions on the approved target. No reimport or reset.
4. Replace the current isolated-only release gate through a separate approved production workflow, including target-bound release evidence. Do not set environment flags to bypass it.
5. Extend, protect and independently restore operational off-host backups to the exact new format, tables and guards BEFORE financial operations. The old 20/45 job is not sufficient for a 38/103 database.
6. Test actual recovery, trusted HTTPS, host isolation, both administrators, password/session/CSRF/logout and negative authorization. Preserve existing credentials. Keep SMTP disabled until configured/tested.
7. Explicitly verify existing employee coverage and original expense-to-money evidence. Have the owner approve each real allocation; do not automatically classify Ahmed's or any other historical expense.
8. Perform nonfinancial smoke checks first. Obtain explicit deployment/activation approval for any residual risks and approved migration. Stop on failed checks; preserve evidence and data.
