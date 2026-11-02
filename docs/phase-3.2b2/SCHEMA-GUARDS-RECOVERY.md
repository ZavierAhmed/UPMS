# Four-table / twelve-guard expense extension

P3.2B2 is a separate version `p32b2-expense-v1` on top of the unmodified P3.2A plan. Canonical resources and normalized MariaDB DDL hashes describe:

| Table | Purpose / protection |
|---|---|
| expense_categories | Stable ID, normalized unique name key, Employee-Based flag, active status, version, actor/timestamps |
| employees | Stable ID, normalized unique name key, optional designation/phone/notes, active status, version, actor/timestamps |
| expense_master_audit | Immutable full master snapshot per entity/ID/version, actor/action/time; unique version claim |
| expense_schema_receipts | Immutable singleton plan/version/finalization evidence |

There are no seeded employees/categories, opening balances, history remaps or new party accounts. Expense category/employee display snapshots live inside the existing immutable posted expense payload. No foreign key is invented for those JSON references: application reconciliation binds them to retained master history. Runtime deletion of either master is denied regardless of whether it has already been used, so referenced historical masters cannot disappear through the API or runtime DELETE.

**Twelve new rules:** for each master, INSERT validates initial version/name/key/timestamps; UPDATE preserves identity/creation time and requires the next version; DELETE is denied (six total). History UPDATE/DELETE are denied and INSERT must identify the current master/version/actor/name/time (three). Receipt INSERT/UPDATE/DELETE are denied to runtime (three). The existing forty-five business/identity and fifteen money rule bodies/hashes remain unchanged. Total: **29 tables / 72 guards**.

Authorized master saves use the existing BusinessCommand identity lock, optimistic version, backend role/password/CSRF gates and one SQL transaction containing master/history/command. Pure reconciliation checks normalized names, complete typed snapshots, consecutive versions, creation/update chronology, actor/time and exact current snapshot. Expense document reconciliation checks its retained historical name/identity/version/flag and required employee/confirmation/purpose. Inconsistency blocks publishing report totals or further master mutations; no repair or reclassification is performed.

The default MoneyGuards verifier still requires exactly the original sixty rules. Only ExpenseGuards supplies the explicit twelve-rule extension and requires the exact seventy-two definitions/events/tables/timing/definer. Separate expense readiness binds normalized DDL, receipt, runtime CURRENT_USER, target hash and all three plan hashes to a private proof. A 60-rule proof is rejected after enabling the extension. Money-only operation on the installed extension still requires that strict 72-rule verification, even with the new UI feature off. Hosted readiness additionally requires a separate target-bound owner approval and genuine expense-format recovery evidence; no such record was generated.

## Database limitations

The runtime remains SELECT/INSERT/UPDATE/DELETE only. No DDL, ALL PRIVILEGES, grant option or new administrative role is required. Existing scoped runtime mutation policy is not loosened: the new service uses fixed explicit table/column SQL. Strict scoped hosts would need a separately reviewed extension to their table-grant allowlist; this milestone does not claim that the old strict verifier accepts the new tables automatically.

The twelve guards protect retained history from runtime UPDATE/DELETE and constrain basic master transitions. They do not enforce that every mutable master update has a complete audit/command at transaction commit, authenticate the operator's business intent or prevent compromised runtime SQL credentials from fabricating a new valid version/audit set. Hash-derived name uniqueness and JSON source links are validated by the application, not database-enforced employee identity/provenance. Compromised SQL credentials can retain the previously documented mutable-state and insert-fabrication risks. Administrator authorization is not database row isolation. Normal API transactions preserve full evidence atomically; this is not claimed as equivalent to database-enforced transaction completeness.

## Migration and recovery boundary

The [review bundle](../../deployment/expense-masters/README.md) is generated offline with four canonical CREATE TABLE statements and twelve CREATE DEFINER triggers plus byte checksums. It executes no SQL, creates no users/grants/data and does not finalize receipts or activate a feature. Future maintenance tooling must verify the exact cumulative state, stop on partial DDL failure and preserve existing records/administrators. There is no authorized GoDaddy deployment in this milestone.

`ExpenseRecovery` defines **UPMS_EXPENSE_SNAPSHOT_V1**, captures exactly 29 canonical tables and 72 exact guards, authenticates/decrypts in memory, validates every DDL before restoration, restores prepared rows into an empty positively identified local target, compares all rows, scans FK orphans, reinstalls all 72 rules and reconciles money/document links plus master histories and expense snapshots. The test restored 138 rows. A nonempty target and wrong/incomplete manifest are refused. This prototype is deliberately separate: the old money-only 25/60 recovery path is not silently taught to accept unknown tables.

The production protected off-host collector/Windows consumer still expect **20 tables / 45 guards**. They are unchanged. Neither the money 25/60 prototype nor this 29/72 prototype upgrades streaming encryption, DPAPI consumer, protected retention or recurring live backup checks. A cumulative production release must upgrade those tools first and independently restore a genuine off-host backup before any hosted money/expense schema migration. Local definer privilege acceptance is explicitly false/not hosted validation; actual production definer SELECT/TRIGGER and runtime four-CRUD checks remain pending.
