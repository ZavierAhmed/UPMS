# P2.6B migration and preservation plan

Verified fetched and local baseline: `433089062e80ac95a5ae7c4317101a8f9df49df3`. Branch: `feature/upms-p2-6b-cheque-management`. Main preflight confirms MariaDB10.4.32, `127.0.0.1:3309/upms`, recovery0,83 physical tables/seven ordered migrations. Existing Runtime authenticated with exactly81 reviewed table scopes. Nine unrelated untracked source logos remain preserved.

Before main DDL, create a consistent private logical backup and restore it once into NEW `upms_restore_p26b_20261022`. Compare all83 table/row fingerprints with both source and restored schema. Record seven historical migration-source hashes and encrypted credential/session-secret hashes. Preserve original3306 directory, configuration, offline snapshot and all prior failed schemas/evidence unchanged.

Migration008 adds seven InnoDB tables: immutable policy, cheque source, event timeline, exact dishonour request, credit compensation and allocation compensation; only the current cheque-state projection is mutable. Instrument uniqueness is conservatively drawer-bank/number/date. A forward enum extension allows CHEQUE_HOLDING on receipt posts without rewriting old sources/rows. Nine additive department permissions. Expected90 physical tables,88 runtime scopes/eight migrations. Dedicated migrator only; no startup migration. Grant SELECT/INSERT on all seven additions, plus UPDATE only on cheque_states; no extra old-table rights, DELETE, DDL, globals or delegation.

Operator tooling uses ignored private `server/.local/p26b`, encrypted generated credentials, fail-if-existing operation receipts and exact endpoint/name guards. Fresh synthetic schema families `upms_test_p26b_{cheques,receipts,sales,classification,inventory,purchasing,regression}_20261022_01`–`_08` are permitted only as needed for this requested acceptance. Each has a distinct loopback runtime and schema-only migrator. Preserve every started schema, including failures; never reset/reuse/drop. Cheques use account family q; receipts e; classification c. Test provisioning does not authorize main policy/opening activation.

Apply main migration only after source, backup, isolated acceptance and complete diff review pass. Recheck fingerprints, grants, one administrator, credential/signing-secret preservation, empty business/activation tables and stock/customer/cheque/combined-money reconciliation. Stop on changed state or partial DDL; retain evidence and prepare a forward plan, never repair automatically.

Rollback: keep the app offline, preserve later activity in a fresh consistent backup, retain all receipts and use independently reviewed forward recovery. Never downgrade/drop financial tables or replace either data directory. Original3306 is unhealthy; do not switch a running app to it. No merge, deployment or P2.7.

Execution evidence will be appended after actual checks; this plan is not a completion claim.

## Executed result

Backup SHA256 `1f4bdb1411bde2f05ae9a9084944c2da338ec4fd09b4d34de759a0a8c1132228` restored exactly across83 tables into `upms_restore_p26b_20261022`. Dedicated migrator applied only `202610220008_customer_cheques.js`;90 physical tables/eight ordered migrations verified. Seven reviewed grant additions yielded88 exact restricted runtime scopes. All seven historical source hashes and original rows retained. Main policies, periods, masters, stock and all financial tables remain empty/unactivated; one Administrator and matched reconciliations retained. Actual-name GST/receipt/cheque gates reject main activation.

All seven original encrypted connection/credential/signing-secret hashes match P2.6A. All1037 original3306 files and offline copies match their existing manifest. Local Runtime/Serve was restarted only after elevated inspection verified its recorded PID/start ticks/command; port3000 management returned200. No bootstrap, automatic migration, credential reset or database process restart occurred. Private final receipts contain the full evidence without publishing customer/bank/credential data.
