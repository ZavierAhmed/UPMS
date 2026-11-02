# Future production release checklist — not performed

Historical P3.2A checkpoint. P3.2B1 now implements the supported cash/bank document adapters locally; use the [current report](../phase-3.2b1/TECHNICAL-REPORT.md) and [updated future production checklist](../phase-3.2b1/FUTURE-PRODUCTION-CHECKLIST.md). Production authorization and hosted gates remain pending.

Every hosted gate below is **pending**. The local P3.2A tests do not satisfy them. No release or activation authorization is requested or inferred by this document.

- [ ] Review the complete cumulative patch against the genuinely deployed release. P3.1 and P3.2A were local-only milestones; do not assume the starting Git branch is the hosted release.
- [ ] Obtain explicit owner authorization for the maintenance window, additive migration, money-specific SQL privilege risks, release integrity and rollback/recovery procedure. Retain the original production activation and administrator records.
- [ ] Complete and test the production preflight/receipt-finalization tools; the supplied migration generator is review-only and the executable migration/restore helper refuses production targets.
- [ ] Upgrade the deployed streaming backup, protected Windows off-host consumer, versioned 25-table/60-guard manifest and restore process **before** any hosted table changes. Verify a genuine protected off-host copy and independent restore. The old 20/45 backup cannot be treated as extension coverage.
- [ ] Recheck management HTTPS, host isolation, release hashes, authenticated runtime identity and exactly four existing CRUD permissions; no runtime DDL, TRIGGER, GRANT OPTION or administrative privileges. Do not grant ALL PRIVILEGES.
- [ ] Verify both existing designated administrators and mandatory password-change status without resetting/recreating them. Verify global business state and maintenance/posting controls.
- [ ] Verify the exact selected database, original canonical schema/receipt, all 45 original guard definitions and a genuine before-state inventory of every financial/audit table. Verify no partial money tables exist.
- [ ] With posting blocked and runtime deployment still disabled for money, apply reviewed additive schema/master/guard stages using the separately authorized maintenance and existing guard-definer routes. No SQL reimport, table reset or old staging package upload.
- [ ] Stop on any failed DDL or check. Preserve state and evidence; do not retry partial DDL, drop company data or recreate administrators. Recovery to a new target or compensating maintenance requires explicit review.
- [ ] Verify all 25 table definitions, FKs, decimal types, source uniqueness, all 60 guard definitions and the actual SELECT/TRIGGER-only guard definer. Prove runtime cannot mutate masters, migration evidence or posted history.
- [ ] Prove the new financial tables are empty, masters are exactly owner-approved and every opening is **Unverified**. Migration must not infer or create live opening balances.
- [ ] Finalize target-bound extension receipt, actual guard evidence and independently verified recovery records. Obtain a fresh explicit owner-approved money release record; do not fabricate approval files from local fixture receipts.
- [ ] Deploy only the integrity-verified minimal cumulative patch with SMTP still disabled. Enable the money feature only after successful final readiness checks.
- [ ] Run authorized read-only account/statement/session/CSRF/logout/role/isolation acceptance without real transfers, expenses, receipts or openings. Confirm prior P3.1 Hafta/items still work.
- [ ] Confirm scheduled protected off-host backups now cover all 25 tables/60 guards and alert on freshness/failure. Only then plan separately authorized real opening verification and operational use.

No current production state is asserted beyond the owner's supplied baseline. No live balances, grants, recovery, HTTPS or release checks were executed for this milestone.
