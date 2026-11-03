# Owner workspace upgrade

## Verified before-state

- Existing binding: `tmp/php-runtime/uath1-owner-binding.json`, preserved.
- Target: `upms_test_php_money_1793691451921`, 127.0.0.1:3330, 34 tables/88 guards.
- Existing administrator and credentials preserved; no bootstrap or reset.
- Local encrypted backup authenticated and checksum verified; 109 rows independently restored at 34/88.
- Recovery-copy migration rehearsed at 38/103, original rows preserved.
- A separate 34/88 recovery-review copy remains available; the source binding was not switched.

## Separate authorization and completed operation

The owner answered **Approve UAT-only upgrade** to request `call_6ba999386e26468eb46cd6f7ae9b1f85`. This separately authorized only the existing 5180 launcher restart, four additive tables, 15 guards, two permissions/administrator grants and two local UAT flags. No business postings, credential changes, 5173 change or production deployment were authorized.

The controlled restart preserved the binding. Its initial wrapper encountered a STARTING/readiness race before any migration; the launcher subsequently passed native readiness, and the startup script now waits rather than offering misleading new-password setup instructions for a bound workspace.

The following migration command was executed successfully (historical record; do not rerun):

```powershell
node scripts/uath1d-upgrade.mjs --owner-authorized --preflight-sha256=d17456623e75df1d05fd0740c7ee8c6afe4fcc6e2c21975ecbacf66679348316 --approval-reference=OWNER_REPLY_call_6ba999386e26468eb46cd6f7ae9b1f85_APPROVE_UAT_ONLY_UPGRADE
```

The target now has 38 tables/103 guards, native uniqueness constraints, unchanged original rows, existing administrator and runtime CRUD privileges. Only the classification flag and target-bound extension-evidence path were enabled. Production/default-off settings remain unchanged. The maintenance marker is COMPLETE; actual native readiness and management HTTP 200 passed.

To reopen the existing workspace without provisioning or resetting anything:

```powershell
./scripts/start-uath1-preview.ps1
```

## Failure and operational recovery

Do not drop/reset the existing database, rerun initialization, overwrite it from a fixture, or silently retry partial DDL. An interrupted migration leaves its maintenance marker/lock and source database preserved for review. Repair/complete the specific additive step only through a separately reviewed operation.

To authenticate the retained pre-upgrade archive and restore it into a DIFFERENT empty review database, without deleting/resetting or rebinding the owner database:

```powershell
./scripts/Protect-UATH1D-Preflight.ps1 -Mode RestoreReview
```

This tested command restores 34 tables/88 guards and all 109 original rows, then verifies every table hash plus financial/inventory/labor reconciliation. The original configuration is retained as `environment-before.dpapi`, protected by the same Windows identity. Do not overwrite the live environment from it while an incompatible partial schema exists. No automatic binding switch, rollback drop, import-over or administrator recreation is performed. Recovery routing or reversal of newly added objects requires explicit review; original data and the verified archive remain intact.

## Actual after-state and current checkpoint

The owner signed in independently with existing php-admin credentials. Dashboard and Hafta source review work; expense 3 is correctly blocked by unverified opening coverage. Existing earned labor is 2000.00; direct and applied payments remain zero. No owner business transaction was posted.

A new sealed checkpoint independently restored 121 rows at 38/103 and passed all financial/inventory/labor reconciliation. All original non-session rows remain. This read-only backup/recovery operation can be run as the owning Windows identity:

```powershell
./scripts/Protect-UATH1D-Preflight.ps1 -Mode Checkpoint
```

Keep the protected directory and DPAPI recipient available under the owning Windows identity. Neither recovery command rebinds or overwrites the owner database. Exact archive checksums and restore counts are in evidence/checkpoint.json and evidence/recovery-review.json.
