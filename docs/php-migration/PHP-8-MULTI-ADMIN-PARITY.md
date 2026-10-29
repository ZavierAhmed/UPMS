# PHP-8 multi-administrator parity — BLOCKER CONFIRMED, NOT FIXED

Source inspection confirms PHP BusinessCommand::operator and Express simple-v1/service.js operator both require administrator role AND user ID equal to v1_control.operator_id. Authentication alone cannot give a second administrator full business access. This branch does not claim two-admin support is implemented or tested.

## Required coordinated policy

Use an explicit private, target-bound designation of the two approved existing user IDs and expected login keys admin/haris, independently enabled and holding the Administrator role. Do not authorize every authenticated user or every newly created Administrator. Preserve v1_control and its original operator ID/cutover state; do not repurpose actor IDs or rewrite history. Existing single-operator defaults must remain fail-closed until reviewed multi-admin configuration is activated.

Laravel and Express must enforce the same designation on reads and commands while retaining authorization-version checks, forced password change, session expiry/revocation and full approved permissions. Preserve actor-bound idempotency: another actor reusing a key must conflict even with identical input. Keep existing transaction boundaries, stock locks, numbering locks, journals and rollback/lost-COMMIT behavior. The UI's Single operator label must be replaced only with a truthful authorized workspace/user identity, not fake production data.

## Required acceptance, still NOT RUN

On a disposable schema and later host-matching staging: two independent logins and mandatory password changes; action by admin followed by action by haris with exact IDs in document/audit/command records; cross-actor replay conflict; parallel distinct-account operations with consistent stock, journals and unique numbering; same-item contention/insufficient stock, rollback and lost-COMMIT; disabled/non-designated/non-admin/stale-authorization/expired sessions denied; all thirteen kinds, custom rates, historical returns, reversals, expenses, reports, reconciliation, dashboard, PDF and XLSX.

Do not run these financial tests against owner data. Actual designated IDs cannot be chosen safely before inventory. Single-operator code remains unchanged in this Phase A stop.
