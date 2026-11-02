# Future production checklist — no activation authorization

- [ ] Approve exact release commit/artifact hashes and supported business policies after reading the gate matrix. Local acceptance is not an owner release approval.
- [ ] Verify actual production target, authenticated runtime CURRENT_USER(), exact database CRUD or original strict scoped policy, absence of extra global/database/wildcard/table/column privileges, and separate restricted SELECT/TRIGGER guard-definer identity. Never grant runtime DDL/ALL PRIVILEGES.
- [ ] Preserve the canonical cumulative sequence: base 20/45 → money 25/60 → expenses 29/72. Review maintenance-only install order and exact hashes; financial refunds add no DDL. Preserve all original definitions and records; no reset/reimport/admin recreation.
- [ ] Upgrade protected collection/encryption manifest, Windows consumer, recurrence, retention/failure alerts and restore tooling for the approved 29/72 refund-aware state before hosted migration. Preserve current legacy backup protection through transition.
- [ ] Independently restore a genuine protected off-host archive into an authorized empty target; verify complete rows, schema, FK integrity, all guards, identities, financial journals, expense snapshots and correction links. Synthetic Windows acceptance cannot satisfy this.
- [ ] Approve real opening/cutoff/account evidence, master identities/access, operator segregation and independent approval policy. No historical allocation inferred.
- [ ] Obtain separate target-bound money, expense and refund readiness/release approvals, exact policy `p32b3-full-same-account-v1`, target hash, installed guard proof SHA256 and verified recovery format. `UPMS_REFUND_RELEASE_APPROVAL` is a separate gate; no approval is generated here.
- [ ] Resolve the compatibility bridge between existing money/expense approval format requirements and the new refund-aware operational backup format. Do not simply relabel a 20/45, 25/60 or earlier expense backup as a valid cumulative refund recovery.
- [ ] Keep partial/backdated, incorrect-entry-only, metadata, cross-account, purchase/goods-return and cheque corrections blocked. GST separation, payroll and full profit-and-loss are outside the implemented PHP scope.
- [ ] Prepare owner-approved reversible file/config restoration, maintenance/write fencing and stop conditions. Database DDL is not assumed transactionally reversible; stop and preserve evidence/state on failure, never auto-reset.
- [ ] Reverify readiness, reconciliation, release integrity, HTTPS, host isolation and genuine recovery immediately before separate explicit activation approval. Any mandatory FAIL or BLOCKED means NO GO.
- [ ] Run separately authorized non-business smoke acceptance. Preserve existing administrators/passwords, records, public branding/design and SMTP-disabled state. No synthetic financial transactions in production.

P3.2B4 preflight is read-only/dry-run. It cannot migrate, change grants, deploy, activate or roll back production.
