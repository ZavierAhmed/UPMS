# Main P2.3 migration verification

**Applied successfully to recovered upms at 127.0.0.1:3309 after conditional owner handoff approval.** Original XAMPP directory/configuration/snapshot remain unchanged. Prior stop/recovery plans are historical evidence retained separately.

Before main mutation, recheck confirmed MariaDB 10.4.32, recovery mode 0, the exact private instance path, 38 InnoDB tables, two original migration rows, all original fingerprints and the preserved administrator. Byte-verified rollback copies of Owner/Migrator/Runtime profiles preceded explicit port-3309 configuration; runtime/migrator passwords and the signing key were preserved. The generated private recovery root credential is operator-only.

A new single-transaction logical backup was taken under server/.local/p23b/resumption, checksum/readback verified, and restored into NEW upms_restore_p23b_resume_20261022. All 38 table fingerprints matched. The restore refused existing schema names and contained no DROP/TRUNCATE/schema-switch statements. All old backups/receipts remain preserved.

Only 202610220003_inventory_operations.js applied as upms_migrator@localhost. Both historical files retain exact approved SHA-256:

- Identity: 4c4e290353031d7cf3663a9fa6685b0ea5632dad87477a9c1ca3edeeb8e0deef
- Business foundation: a913d4b78499f1d58387c9dd0dd0b259f5fd76acb36b87700b2b59732c289862

The migration adds inventory_tracking, inventory_documents, inventory_lines, inventory_movements, inventory_balances and inventory_policy_acceptances; thirteen permission keys and explicit administrator/Inventory/Sales role grants. Existing items would receive UNVERIFIED metadata only, no quantities; main had no items. All existing rows, administrator/password, role assignments, sessions and audit remained retained. Final schema: 44 physical tables, three migration records. The two tracking tables remain hidden from runtime.

Only the reviewed six inventory table privilege sets were added to upms_runtime@localhost. Actual authentication and exact 42-table runtime allowlist passed. No DELETE, DDL, global, FILE or delegation rights were introduced. Original wildcard accounts remain preserved in the unchanged original environment; none were imported broadly into the recovered instance.

Final owner counts: all six inventory tables zero; no open period or inventory policy acceptance; one preserved administrator. No opening stock, cutoff or prefix activation. Main reconciliation matched and negative balances were zero. Successful fresh SQL/browser suites and failed-run preservation are documented in P2-3-concurrency-and-test-results.md. Private backup/migration/grant/final-preservation receipts remain ignored, never staged.

Rollback: stop the local app, preserve a fresh candidate backup including later identity/audit data, restore saved private profiles if needed, and keep the app offline while the old endpoint is unhealthy. Never downgrade/reset/restore over either environment. See P2-3B-main-handoff-plan.md.
