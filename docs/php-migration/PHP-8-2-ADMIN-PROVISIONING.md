# PHP-8.2 — two administrators after import

GoDaddy account creation: **NOT EXECUTED / NOT AUTHORIZED**. SQL contains zero users/password hashes. Intended clean provisioned state: exactly admin/Admin and haris/Haris, both Administrator, zero business rows.

After separately approved SQL import/finalization, existing private CLI `scripts/provision-admins.php --approved-production-profile /ACTUAL_PRIVATE_ROOT/provision.json` requires one-time-production-maintenance mode, exact provision-clean-administrators approval, matching reference/target/plan, verified backup/restore and protected credential/handoff paths. It checks canonical provisionable state, generates independent random credentials, hashes Argon2id, preserves matching committed accounts on retry, adds individual forced-rotation audit, binds BOUND/PENDING and disables its profile. Credentials remain in private0600 handoff files, never stdout/SQL/logs/archive.

Run private package verifier with --accounts afterward. It verifies two distinct IDs, exact usernames/display names, enabled Administrator roles, complete permission catalog, distinct Argon2id hashes, canonical schema, genuine target-bound provisionable receipt and zero business rows. It omits hashes and credentials. An actual production report cannot exist before the future target; synthetic reports are identified as local evidence.

Provisioning does not set READY. First-login rotation and separate sessions remain mandatory. No real passwords may traverse the currently untrusted public management endpoint; approve a controlled trust arrangement and a suitable trusted endpoint before public activation.

Expanded tests uncovered and fixed an existing read restriction: SimpleV1Controller now uses the same schema-bound OperatorPolicy as commands. Both exact designated admins may read authorized management pages; legacy behavior, role checks, name/ID/schema binding and posting gates remain. Arbitrary third admins do not gain designated access.

Fresh imported fixtures prove independent logins/rotations, PENDING posting rejection, cross-user replay rejection, stock opening/production/challan/customer payment/expense by each actor, management reads/reconciliation by both, and separate document/command attribution. Synthetic activation flags are not hosting approvals. Initial clean reports precede deliberately synthetic business exercises.
