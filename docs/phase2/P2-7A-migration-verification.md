# P2.7A preservation and additive migration plan

Fetched source and actual start SHA: `6871c6f4b3859e457a9c5c0be2e2d2f95801efb9`, source branch `feature/upms-p2-6b-cheque-management`; new cumulative branch `feature/upms-p2-7a-customer-returns-inspection`. Preserve nine unrelated untracked source logos. No public-site or dependency changes.

Read-only preflight confirmed MariaDB10.4.32, `127.0.0.1:3309/upms`, recovery0,90 physical tables/eight ordered migrations. Restricted runtime authenticated with exactly88 existing scopes. Main GST, receipt, cheque and return activation gates reject real operations.

Before main DDL: take a new consistent private logical backup; restore once into NEW `upms_restore_p27a_20261023`; compare all90 table/row fingerprints with restored and live source. Record eight historical source hashes and encrypted profile/signing-secret hashes. Never modify original3306 files/configuration, offline snapshot, backups, earlier failed schemas or recovery evidence.

Migration009 adds eight InnoDB tables: return_policies, return_documents, immutable revision return_lines, return_allowances, return_receipts, return_receipt_balances, return_dispositions, return_stock_movements. Add three movement catalogue entries and ten additive permissions. Only allowance and receipt-quarantine projections permit UPDATE; other new scopes SELECT/INSERT only. No new DELETE, global, DDL, delegation or old-table runtime rights. Expected98 physical tables,96 restricted runtime scopes/nine migrations. Historical migration sources remain unchanged. No inferred stock opening or financial journal.

Use the unchanged dedicated migrator only after verified backup/source fingerprints, isolated acceptance and complete diff review. Startup never migrates. Stop on changed state or partial DDL; preserve evidence and prepare a reviewed forward plan rather than resetting.

Fresh synthetic families `upms_test_p27a_{returns,cheques,receipts,sales,classification,inventory,purchasing,regression}_20261023_01`–`_08` are created only as needed for requested acceptance. Use distinct runtime/schema-only migrator identities (returns t, regression r, receipts e, cheques q), generated encrypted passwords and immutable operation receipts in ignored server/.local/p27a. Never reuse/drop populated runs. Explicit synthetic policy is not owner activation.

After migration: confirm original rows/admin/profile/signing-secret preservation, stock/classified/receipt/cheque/return/combined-money reconciliation, empty business/policy/opening tables and denied main activation. Preserve the original1037-file manifest and both original/offline copies. Restart only a verified recorded development app process, without bootstrap or DB process changes.

Rollback means keep the app offline, retain a fresh backup including later identity activity, and use independently reviewed forward recovery. Never downgrade/drop journals, replace data directories, or switch a running app to unhealthy3306. No merge, deployment or P2.7B. Execution evidence will be appended after actual checks.

## Executed verification

Backup SHA256 `8c5d8c171c0bc746f1d5653f8abfa9093f875f8a43f7a9f42a2743b9de7649da` restored exactly across90 tables into `upms_restore_p27a_20261023`. Only `202610230009_customer_returns.js` applied.98 physical tables/nine migrations verified; eight exact grant additions yielded96 restricted runtime scopes. Eight historical source hashes and all original owner rows retained. Independent return/source/shared-stock and every existing customer/receipt/cheque/combined-money reconciliation passed without repair.

One Administrator remains. Seven original profile/signing-secret hashes match prior evidence. All1037 original3306 files/offline copies match the original manifest; no configuration/directory replacement or DB process restart occurred. Main masters, stock, return and financial tables plus policy/cutoff/period/opening state remain empty/unactivated. Actual-name gates reject real operations. Verified recorded Runtime/Serve was restarted with unchanged profiles and returned management200 without bootstrap/startup migrations.

Private backup/fingerprint/grant/final/certification receipts remain ignored under server/.local/p27a. Preserve all failed/started test schemas and historical recovery evidence. The branch is committed/pushed only after full acceptance and diff hygiene, then stops for independent review.
