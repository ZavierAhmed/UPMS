> **Automated setup follow-up:** The newer owner brief authorized automatic administrator bootstrap. Existing migration/accounts/profiles were reused; one administrator and one bootstrap audit event are now confirmed. Login/CSRF/profile/logout/stale-session checks passed. First-login rotation and encrypted private handoff are described in [administrator setup](P2-1A-administrator-bootstrap.md). Earlier pending-bootstrap wording below is historical.

> **Latest status — 2026-10-21, Asia/Karachi:** The owner approved the preserving forward plan. New localhost accounts were created; the unchanged migration was applied by `upms_migrator@localhost`; all eleven tables, seven foreign keys, four roles and eleven permissions were verified. Runtime reconnected as `upms_runtime@localhost` with the exact nine-table grant allowlist and no global/audit-mutation rights. Fingerprints confirmed both existing wildcard accounts remained unchanged. Main `upms` has zero users and zero bootstrap events before the owner checkpoint. The separate approved test environment passed all 17 integration checks, eight SQL denial probes, ten browser checks and 40 bounded requests at concurrency four with zero errors. Owner administrator bootstrap/login/logout remains pending. Earlier stop/missing-profile observations below are historical and resolved; preserved wildcard privileges remain an owner-managed exposure. Public browser/package regression is still running. No merge or deployment.
> **Current checkpoint, 2026-10-21 17:38 UTC:** The owner approved the main and separate test provisioning plans. A fresh read-only inspection still found zero objects in `upms`, but found `upms_migrator@%` and `upms_runtime@%`; these accounts were absent in the earlier checkpoint below. The account-absence guard stopped main provisioning. No migration or runtime grants were applied by this run, and existing accounts were preserved. Creation/source of these accounts requires owner clarification and a reviewed forward plan. The separately approved test step stopped before connecting because `testruntime.credential.clixml` is missing. Owner input remains pending. Private latest checkpoint SHA-256: `83bb5aa7d6d651c9d9e3d6a433c2cd46334b0e00b15635e05ba1ab94a4a466fc`.
# P2.1A database provisioning and owner-review plan

**Implemented:** private input helpers, fresh metadata inspection, an explicit migration/runtime grant plan and fail-closed runtime credential validation. **Pending:** owner authorization for account creation/grants, owner-chosen dedicated passwords, schema application and restricted SQL acceptance. No privileged mutation has been performed at this checkpoint.

## Fresh pre-migration facts — 2026-10-21, Asia/Karachi

Target: `127.0.0.1:3306/upms`. Product/version: `10.4.32-MariaDB`. InnoDB supported; database utf8mb4/utf8mb4_general_ci; session UTC `+00:00`, strict SQL mode, REPEATABLE READ. There are **zero tables/views and zero migration records** in the fresh inspection. Neither `upms_migrator` nor `upms_runtime` exists at any inspected host. The connected operator is the owner's existing broad account; it is not permitted as the application's runtime identity.

Private checkpoint: `server/.local/p21a/preflight-2026-10-21T17-17-10-861Z.json`, SHA-256 `ff99b5e55532764e3847ca0a13778285385e2a240c6e5602567f225507a4667f`, with an adjacent human-readable report. Only schema metadata/account-grant summaries were captured; no passwords, hashes, session tokens or business rows. Because the database is empty, this inventory is the empty-schema recovery checkpoint: there are no records to back up. Recheck immediately before DDL. If anything has appeared, stop; do not reset it. Nonempty/partial/unclassified schemas require owner review and an appropriate private backup before mutation.

## Concrete proposed operations requiring owner approval

1. Create **new** `upms_migrator@localhost` and `upms_runtime@localhost` using passwords chosen privately by the owner. Refuse any existing account-name collision; never alter/drop/reuse it automatically.
2. Grant the migrator only SELECT/INSERT/UPDATE/DELETE/CREATE/ALTER/INDEX/REFERENCES on `upms.*`. No global privileges, DROP, delegation or unrelated schema grants.
3. Using the migrator, apply the unchanged `202610210001_identity.js` only if `upms` is still empty, the checkpoint matches and exact target/MariaDB opt-in guards pass. No startup or destructive down migration.
4. After verifying all eleven identity/support/tracking tables and the applied migration, grant runtime the exact table allowlist in [the reviewed SQL template](../../server/tools/provision-local.review.sql). No audit UPDATE/DELETE, role-permission mutation, DDL, global/delegation or other database access.
5. For synthetic/fault-injection acceptance only, separately approve a new empty `upms_test_p21a_20261021` schema and new `upms_runtime_test_p21a@localhost` account, with the same runtime table allowlist scoped only to that schema. The owner operator applies test DDL/fault injection; runtime executes the application. No automated fixtures are inserted into `upms`. No existing test schema/account is dropped or reset.

MariaDB DDL/account creation/grants are not an atomic rollback unit. If any step partially succeeds, retain what exists, stop and request a reviewed forward fix. No automatic cleanup, ALTER USER, REVOKE, DROP or password replacement is supplied. Reconnection/grant inspection must confirm actual host-account matching rather than assume that TCP/localhost names match.

## Private input

The Windows helper uses masked Read-Host input and current-user DPAPI credential files under the ignored `server/.local/p21a` folder. The folder ACL grants the current Windows identity and SYSTEM access. Existing profile files are never overwritten. Passwords are decrypted only into temporary process environment variables for the operator child process and restored/cleared afterward; no credential appears in arguments, normal output or Git. Local administrators can still take control of the machine; DPAPI is not protection from a compromised Windows account. Server-side database logging is under owner control and must remain private.

From the repository root, save owner-chosen passwords before creating the corresponding accounts:

```powershell
.\server\tools\Save-UPMSCredential.ps1 -Profile Migrator
.\server\tools\Save-UPMSCredential.ps1 -Profile Runtime
.\server\tools\Save-UPMSCredential.ps1 -Profile TestRuntime
```

For TestRuntime enter `upms_test_p21a_20261021` and `upms_runtime_test_p21a`. The helper only saves credentials; it does not create database accounts. Do not send passwords through chat. The operator wrapper selects Node 24, retains exact target confirmation/MariaDB opt-in and fails closed. Normal runtime must use `upms_runtime`, never the owner or migrator profile.

Owner-controlled administrator bootstrap is a separate checkpoint, using the masked local terminal command after schema/grants pass. Codex will not select the owner's application username/password. No public deployment or server upgrade is authorized by this plan.
