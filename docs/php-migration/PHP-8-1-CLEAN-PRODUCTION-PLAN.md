# PHP-8.1 clean production plan

Status: **PARTIAL — local implementation verified; production activation BLOCKED**.
Baseline: `21d71167eff47515e811d8c4d10629079a4f54eb`. Branch: `feature/upms-php-8-1-clean-production-readiness`. The fetched remote matched the baseline. Existing main/PHP7.8/PHP7.9/PHP8 worktrees and owner assets are preserved; main is not merged.

The owner classifies the current GoDaddy `upms` as disposable dummy/development data and does not require its business history in the new production database. This supersedes the previous requirement to migrate that history into production. It does not authorize deletion now. No GoDaddy database was authenticated, inventoried again, modified, reset or deployed to in this milestone.

## Proposed operation

Prefer a separate **new, empty, owner-approved cPanel schema**. Keep old `upms` intact while preparing and validating the new target. Exact new schema name, account prefix, quota and account ownership remain to be supplied privately after cPanel verification; do not invent them.

1. Verify remaining target/transport evidence using the consolidated manual procedure. Record exact old/new schemas, authenticated accounts, server identity and transport.
2. Back up every actual old table, including existing administrator/audit/initialization history, even though none will be imported. Protect an off-device copy and independently restore it. Record backup SHA256 and restore reference.
3. Review the exact new target, canonical plan hash, private/public/management roots, CA or socket pins, grants and backup evidence. A separate final owner receipt must identify the specific operation. All checked-in examples remain disabled and NOT_APPROVED.
4. Under that future approval only: initialize the empty target. It contains 19 canonical application tables plus `upms_production_migrations`, required role/permission catalogs, guard and PENDING control. No old data or `upms_remote_initialization` is copied.
5. Under a separate specific provisioning approval: create only admin/Admin and haris/Haris, generate private distinct credentials, bind the actual admin ID to control while retaining PENDING. Set the schema-bound operator map from actual receipt IDs; never assume production IDs are 1/2.
6. Validate protected host-matching staging, restricted grants, restored backup, SMTP behavior, 128 MB web runtime and final Linux artifact paths. Require a separate reviewed activation approval before READY/ACTIVATED. Runtime also requires the activation receipt; changing READY alone is insufficient.
7. Application-pointer/root switch and public activation are later, separately authorized actions. No synthetic posting or inquiry smoke tests in production. Preserve old database/backups until a separately reviewed retention/deletion decision.

If a second schema is impossible, **stop**. In-place replacement remains blocked pending a complete exact object inventory, independently restored backup, write fencing, rollback plan and separate approval specifying every irreversible object operation against the verified old target. This milestone provides no DROP/TRUNCATE/bulk DELETE/reset executor. The initializer deliberately refuses a nonempty target. Do not use the historical Node remote initializer or plaintext development profile.

## Exact inclusion/exclusion preview

The canonical new table/column/key/index definitions are in `upms.php/resources/production-schema.json`, derived from reviewed historical migrations and checked against Laravel Schema.php. It includes selling_price, entry_version, next_item_code and all four sale/discount fields. Source catalogs contain four roles and eleven permissions; only two application users are provisioned.

Included: required system catalogs, locking guard, clean counters/control, new migration receipt and genuine administrator identity/audit state. Excluded: every old business/user/session/audit row, old initialization marker, items, parties, stock, production, challans/returns, payments/reversals, expenses, journals and inquiries. Old administrator/history are retained only in the protected old database/backup. Actual old object names beyond the owner-confirmed marker have not been supplied; do not fabricate a table-by-table diff from matching table counts.

See [initialization](PHP-8-1-DATABASE-INITIALIZATION.md), [backup](PHP-8-1-BACKUP-RESTORE.md), [administrator acceptance](PHP-8-1-ADMIN-ACCEPTANCE.md), [hosting evidence](PHP-8-1-HOSTING-EVIDENCE.md), [readiness](PHP-8-1-DEPLOYMENT-READINESS.md) and [tests](PHP-8-1-TEST-RESULTS.md).
