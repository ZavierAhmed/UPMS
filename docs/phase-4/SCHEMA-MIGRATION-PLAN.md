# Schema transition plan

Status: **BLOCKED for production; structural local rehearsal PASS**.

Source is the actual 20-table / 45-guard production snapshot with 140 rows. Target is the current cumulative isolated 47-table / 133-guard schema. All original table definitions and guard bodies match after controlled runtime-name normalization. The difference is 27 new tables and 88 new guards; no source table removal or base-guard replacement is required by the structural comparison.

The genuine encrypted backup was restored to a new pinned local MariaDB schema. `ddl-rehearsal.json` verifies dependency-ordered DDL, exact final definitions and preservation of all original rows. An interruption after CREATE but before its receipt was resumed only after verifying the created table's exact definition and empty state. DDL is not assumed transactional. No synthetic business rows, permission grants, fabricated migration receipts or opening balances were imported.

`evidence/structural-transition-plan.json` is explicitly a structural rehearsal, not an owner-executable production migrator. Current production verification still expects the original contracts; money, labor, Hafta and cheque extensions deliberately enforce isolated-UAT boundaries. Removing those boundaries or pretending isolated receipts are production approval is prohibited.

Before any hosted change: implement and review a versioned production contract, exact guard/DDL allowlist, authentic stateful migration receipts, runtime/definer validation, permissions and resumable per-step reconciliation. Obtain owner/accountant treatment for existing payments, openings, bank allocation and legacy cheque references. Existing history does not justify implicit zero openings or automatic backfill.

Rehearse that operational migrator on a newly independently restored production copy, validate balances and coverage, then on separately hosted HTTPS staging. Prefer a maintenance-window additive transition with verified forward recovery. A separate replacement schema is an alternative only with reviewed identity/history preservation, cutover and new-transaction reconciliation; never silently switch databases. Production execution requires separate approval after the blocked gates clear.
