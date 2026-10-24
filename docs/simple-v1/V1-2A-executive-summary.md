# V1.2A executive summary

Starting SHA: `758bf3ce8640f95a14d2afdbf82ad345d075eb43`.
Branch: `feature/upms-simple-v1-2a-uat-corrections`.

The reported stock discrepancy was an unposted production draft for ITM-0003, whose opening was also unverified. The owner confirmed that exact selected code. No incorrect stock projection was found. See the root-cause report for the private read-only evidence summary.

Challans now show Available: N bottles or Stock opening required, with Set Up Stock Opening for the selected item. The selected code remains visible. Draft review explicitly explains that no stock or ledger movement has posted; challan review refreshes current stock and disables finalization when the selected stock is unverified or insufficient. Inline quantity errors cover empty, zero, negative, fractional and excessive quantities. Route changes, Back/Forward and successful commands refresh authoritative reads without losing selected IDs. Backend locking, numbering and business arithmetic are unchanged.

All active V1 forms fill the content workspace. Responsive columns retain readable inputs, wider bottle selection and stock status, aligned money columns and exact grouped PKR amounts. Screen changes do not affect print rules.

New synthetic UAT: http://127.0.0.1:3113/management. Existing demos3110/3111/3112 and all owner UAT business records are preserved. Main3309/upms remains unchanged; original3306 is untouched. No application migration was added or applied to protected databases. Only approved fresh targets01,02,03,04 and demo were created;05,06 remain unused.

Acceptance evidence:176 backend,173 frontend,33 original SQL,20 V1.2 SQL,11 final browser workflow groups (plus the earlier11-group run),6 financial browser groups,3 freshness assertions and7 final read-only browser groups passed. Public W06, lint, build, zero-vulnerability audits and extracted-package smoke checks passed. See test-results and layout reports for paths.

Owner review is pending. No merge, deployment, live activation or further milestone was performed. The existing private management bundle-size warning remains; no dependency was changed.
