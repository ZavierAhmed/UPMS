> **Latest status — 2026-10-21, Asia/Karachi:** The owner approved the preserving forward plan. New localhost accounts were created; the unchanged migration was applied by `upms_migrator@localhost`; all eleven tables, seven foreign keys, four roles and eleven permissions were verified. Runtime reconnected as `upms_runtime@localhost` with the exact nine-table grant allowlist and no global/audit-mutation rights. Fingerprints confirmed both existing wildcard accounts remained unchanged. Main `upms` has zero users and zero bootstrap events before the owner checkpoint. The separate approved test environment passed all 17 integration checks, eight SQL denial probes, ten browser checks and 40 bounded requests at concurrency four with zero errors. Owner administrator bootstrap/login/logout remains pending. Earlier stop/missing-profile observations below are historical and resolved; preserved wildcard privileges remain an owner-managed exposure. Public browser/package regression is still running. No merge or deployment.
# P2.1A forward plan: preserve owner-created wildcard accounts

Status: explicitly approved by the owner and executed successfully; main provisioning is complete. Owner confirmed creating both wildcard accounts. No wildcard account will be changed, removed, reset or used by the application.

## Read-only evidence

At 22:41 Asia/Karachi on 2026-10-21, `upms` still contained zero tables/views and zero migration records. Private checkpoint `preflight-2026-10-21T17-41-45-717Z.json`, SHA-256 `b413b16e9363049ff4981a6433f3a4abcec7be875ac7403b7968920d9d839d75`.

`upms_migrator@%` and `upms_runtime@%` have global SELECT, INSERT, UPDATE, DELETE, CREATE, FILE, REFERENCES, INDEX and ALTER privileges. The migrator also has ALL on the older `upms_test_p21_20261021` schema. Neither has grant option. Existing wildcard privileges therefore remain a separate owner-managed exposure; the new restricted accounts will not remove them.

## Approved forward operations

1. Preserve the two `%` accounts and all their passwords/grants exactly. Preserve the older test schema. Reinspect account identities and sanitized grants and require them to match the reviewed checkpoint. Stop on any new host/account or changed scope.
2. Permit only these two reviewed wildcard-name exceptions to the original name-collision guard. Require `upms_migrator@localhost` and `upms_runtime@localhost` to be absent. Do not use CREATE USER IF NOT EXISTS or silently reuse another host account.
3. Create the two new localhost accounts using the owner-chosen passwords already saved in Migrator and Runtime DPAPI profiles. Distinct passwords of at least 16 characters remain mandatory. Grant only schema-scoped migration rights and the exact runtime table rights in `server/tools/provision-local.review.sql`. No global, FILE, DROP or delegation grants will be added.
4. Before migration, connect through the saved Migrator endpoint and require CURRENT_USER() exactly `upms_migrator@localhost`, with only the reviewed migration grants. If MariaDB chooses the wildcard account, stop before migration; do not alter account matching or grants automatically.
5. Reconfirm `upms` remains empty and the checkpoint/source digest matches. Apply the unchanged identity migration, verify the schema and tracking, then grant runtime table rights. Reconnect Runtime and require CURRENT_USER() exactly `upms_runtime@localhost` and the strict table allowlist before any application use.
6. Compare the wildcard account/grant summaries afterward with the checkpoint and retain private evidence that they were preserved. Stop on partial DDL/account/grant success; no automatic cleanup or reset.
7. Only after runtime verification, ask the owner to run the masked administrator bootstrap and local login/logout. The agent will not choose owner application credentials.

The separately approved test environment has already been provisioned and passed synthetic acceptance. This forward approval concerns the main `upms` account collision only; it does not authorize deployment, removing wildcard privileges, upgrading MariaDB or adding business modules.
