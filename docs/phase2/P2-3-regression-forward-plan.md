# P2.3 interrupted regression provisioning

Inventory acceptance run 01 passed 18 tests with no skips or failures. Main P2.3 migration and grants have not run. The second restore passed exact fingerprint verification across two fresh connections.

Provisioning `upms_test_p23_regression_20261022_01` timed out during DDL. Read-only process inspection found one connection in `Creating table` and another in `Init for update`, both for that isolated schema; metadata reads time out. The exact partial schema is not assumed complete. No acceptance pipeline was started there.

## Reviewed forward actions requested

1. Preserve regression schema/account/profile 01 and all existing databases, accounts, backups and evidence. Never resume its migrations, reset it, reuse it for tests, or drop its tables.
2. Request a normal graceful shutdown of the existing local XAMPP MariaDB server using the private saved Owner profile, then restart the same executable with the unchanged existing configuration. No forced process termination, server configuration changes, filesystem deletion, tablespace repair or account reset. If normal shutdown fails or startup/readability fails, stop for database-owner investigation.
3. Recheck main 38-table readability and exact original fingerprints; recheck the verified second restore. Any mismatch stops all migration work.
4. If healthy, use the already approved fresh regression pipeline 02, refusing existing schema/account/profile names. Apply the unchanged three migration files once and exact restricted grants, then run the original identity and business regressions once. Preserve any failure. No third regression schema is authorized.
5. Main migration remains conditional on all required acceptance gates and the original reviewed plan. No stock, cutoff, period or prefix activation in upms.

The P2.3 brief requires stopping for a reviewed forward-recovery plan after partial DDL. This plan does not authorize destructive repair of the stalled schema or the server.
