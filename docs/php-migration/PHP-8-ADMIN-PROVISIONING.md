# PHP-8 administrator provisioning — REVIEW PLAN ONLY

No CLI provisioner has been implemented or executed in this blocked Phase A change. No production users were created, renamed, disabled or reset. Exactly-two-admin acceptance is NOT satisfied yet.

Target identities: admin / Admin / administrator and haris / Haris / administrator. They must have separate preserved/generated IDs, hashes, sessions and audit attribution, with the existing full Administrator role permissions. Other legitimate non-administrators are retained.

## Inventory and conflict rules

First inspect actual users, roles, identity_audit_events and v1_control using verified read-only access. Preserve any existing Administrator ID, foreign keys and historical actor references. An existing user's rename to admin requires an exact owner-reviewed, audited correction; it is never automatic. Conflicting admin/haris usernames, unexpected ownership/role/enabled state or more than two active administrators block provisioning for explicit owner disposition. Do not disable/delete another account to make a count assertion pass.

## Required future CLI procedure

It must be private and CLI-only, require explicit production provisioning mode plus an authorized maintenance identity, validate the pinned production target, and refuse missing/incompatible role/schema/audit catalogs. Normal application startup and HTTP routes must never call it. No schema initialization or development seeding.

Reuse Argon2id parameters accepted by the current system: memory 19456 KiB, time 2, parallelism 1, with distinct random salt/hash and strong independently generated temporary passwords or secure interactive input. No hardcoded/default/shared credential, process-argument password, stdout credential or secret in an archive. Repository authentication derives first-login rotation from administrator.bootstrap audit details requirePasswordChange=true until a subsequent user.password.changed event, not from an invented database column. Preserve that mechanism and test both accounts' forced rotation before normal workflows.

Create the required user/role/audit evidence atomically under a reviewed transaction and locking strategy; authorization-version/session behavior must stay intact. Bind audit evidence to the genuine authorized maintenance actor/principal after actual schema/FK inspection; never impersonate the original operator. Idempotent reruns must verify the prior committed receipt and exact existing identities without regenerating credentials or resetting passwords. Conflicts fail closed.

Credential-file delivery cannot be claimed atomic with a DB transaction. Prepare protected exclusive pending credential storage before commit, correlate its receipt to the atomic DB/audit transaction, then atomically finalize the private handoff. Crash recovery must reconcile the committed receipt rather than repeat account creation/reset. Disable the one-time maintenance mode/credential after verified owner handoff and password rotation.

Prerequisites before any execution: Phase A compatibility, exact owner inventory/identity plan, restorable backup, reviewed restricted runtime/maintenance grants, tested dual-admin policy, host-matching staging, risk disposition and explicit final cutover approval. All remain pending where not evidenced.
