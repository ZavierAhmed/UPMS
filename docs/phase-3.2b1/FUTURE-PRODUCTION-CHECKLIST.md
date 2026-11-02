# Future controlled production release — pending, not authorized

P3.2B2 now implements expense categories, employees and reports locally. Financial corrections are separately proposed as [P3.2B3](../phase-3.2b2/P3.2B3-FINANCIAL-CORRECTIONS.md). Use the updated [29-table/72-guard production checklist](../phase-3.2b2/FUTURE-PRODUCTION-CHECKLIST.md) and [cheque plan](../phase-3.2b2/P3.2C-CHEQUE-PLAN.md); the text below records the earlier P3.2B1 checkpoint.

All hosted gates below remain unchecked. This milestone made no production connection, deployment, migration, grant change, administrator change or live guard change.

- [ ] Obtain separate owner authorization for a concrete cumulative P3.1/P3.2A/P3.2B1 release and accounting policy, with exact release SHA and integrity manifest.
- [ ] Upgrade the protected off-host backup **before** hosted account-schema migration: version-aware twenty-five-table/sixty-trigger collector, encryption, protected Windows consumer, checksums, authenticated decrypt validation, protected retention and failure handling. Preserve existing scheduled backup protection throughout transition.
- [ ] Independently restore a genuine encrypted off-host backup into a separate empty authorized target; verify all rows/FKs, original forty-five plus fifteen money guards, source/document/money reconciliation and runtime usability. The local in-memory prototype is not evidence for this hosted gate.
- [ ] Recheck live target identity, trusted HTTPS, public/management isolation, actual authenticated four-CRUD runtime grants and separate SELECT/TRIGGER definer privileges. Never give DDL privileges to runtime.
- [ ] Verify reviewed P3.2A DDL/master configuration and all unchanged baseline guard hashes. Use maintenance-only forward installation with preflight/finalization; do not reimport/reset/recreate administrators or rewrite original financial history. Stop and preserve state on failure.
- [ ] Approve actual opening evidence, dates/cutoff, source categories, account/operator policy and how any earlier manual source claims are resolved without double effects. Do not infer ownership from historic payment methods. No automatic backfill.
- [ ] Review residual SQL insert fabrication, mutable-state and account-isolation risks. Confirm that guarded immutability does not authenticate arbitrary new SQL inserts or cross-table financial completeness.
- [ ] Inventory saved financial drafts. Require explicit re-review/account selection for old cash/bank payment/paid-expense/immediate-purchase drafts. Block cheque and payment-reversal drafts until the separately approved correction/cheque workflows exist.
- [ ] Verify target-bound extension guard evidence, schema receipt and separately approved release record with `documentIntegrationVersion=p32b1`; validate the concrete release and genuine recovery evidence. No prior approval is silently reused for new money behavior.
- [ ] Prepare reversible file/config rollout, maintenance window and rollback stop conditions. Keep the money feature disabled until every gate passes and the owner approves activation. Turning it off must not silently post previously integrated drafts.
- [ ] Run separately authorized non-business acceptance for administrator accounts, password/session/CSRF/permission enforcement, source links, UI and host isolation. Do not create real stock, challan, payment, expense or ledger transactions as smoke fixtures.
- [ ] Keep SMTP disabled until independently configured and tested. Preserve the existing public website identity and design.

No executable GoDaddy deployment/activation command is supplied as authorization in this development-only milestone. The reviewed P3.2A bundle remains a future migration review artifact, not a ready production installer.
