# Physical customer returns and inspection

Verified source SHA `6871c6f4b3859e457a9c5c0be2e2d2f95801efb9`; cumulative branch `feature/upms-p2-7a-customer-returns-inspection`. Returns reuse P2.2 documents/approvals/numbering/coordinator and P2.3 authoritative inventory_balances. No second warehouse or financial subledger.

Sales creates/posts a source-linked request without stock effects. Inventory receives into QUARANTINED only and records partial inspection proposals. Administrator approves/rejects the exact version/hash and posts paired QUARANTINED-to-AVAILABLE/DAMAGED transfers. Cumulative physical allowance is separate from request, disposition and quarantine quantities.

Financial credit not processed: no customer credit, GST adjustment, allocation, cheque, vendor or money movement. Original source challans/rates/tax remain immutable and hidden from unauthorized Inventory users. Real activation remains blocked by actual database-name and explicit synthetic-policy gates. No production readiness, merge, deployment or P2.7B.

Execution results are documented separately after actual acceptance.

Locally accepted: migration009,98 physical/96 runtime tables/nine migrations; main activation remains blocked and owner state is preserved. Backend154/frontend119; identity17/business16/inventory20/purchasing29/Sales23/classification38/receipts48/cheques66; complete returns86 (including prior66). Build/lint/audits/W06/extracted package passed. Test-results records overlap and preserved failures. Independent review is next; no P2.7B.
