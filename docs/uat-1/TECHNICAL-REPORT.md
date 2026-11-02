# UAT-1 technical report

Baseline: `01460a0e05dbd948e5408177f3442a05e43dded8` on `feature/upms-p3-2b4-consolidated-readiness`. Candidate branch: `feature/upms-uat1-ui-reports-workflows`. This is local owner UAT work, not a production release.

The popup defect came from a global sidebar footer margin applied inside native dialogs. Scoped layout resets preserve the approved graphite/orange/warm-white identity, provide intrinsic horizontal labels, and preserve draft fields. Dialogs cycle keyboard focus and restore their opener on close.

Employee expense payees are derived server-side for newly prepared employee-based drafts. A version marker enables strict historical reconciliation without rewriting legacy posted snapshots. Ordinary expenses retain their required manual payee. Renamed/inactive employees require a fresh review before posting.

Money Accounts pushes meaningful child-view transitions into browser history and replaces filter synchronization. Back/Forward restores the URL-selected view and cached unsaved transfer fields without posting anything.

Custom challan numbers are optional, trimmed and uppercased ASCII identities, maximum 40 characters. Single hyphens/slashes separate alphanumeric groups. Spaces, repeated separators, Unicode lookalikes and reserved DC/CR/VP/RF prefixes are rejected. Literal O/0 and I/1 remain distinct. Official numbers and external references are independent. The existing transactional identity-guard lock serializes posting claims; this is application-mediated uniqueness, not a native SQL unique index. Direct database compromise remains outside this guarantee. Finalized documents retain existing immutability guards. No historic numbers are backfilled.

Reusable approved-logo print headers and scoped print styles cover the active PHP reports and financial documents. Company totals stay with the final record, table headers repeat, and identity/reference strings bypass status-label formatting. Client Hafta and weekly employee business-expense reports remain separate; no payroll, salary or unsupported financial policy was introduced.

No schema migration, 72 guard-definition change, stock mathematics change, BusinessCommand change, role change, default production activation, backup operation or website modification was performed. New optional JSON semantics require the matching updated recovery reader on any future separately approved release.

## Validation and evidence

Commands are recorded with working directories and exit status in `evidence/validation.json`. The validation runner deliberately stops on failure. The first full run stopped at browser acceptance after exposing an unloaded-report print-footer bug; that defect was corrected. Subsequent evidence must be consulted for final status; a failed attempt is not a pass.

PHP units: 97 tests / 1394 assertions. React: 259 tests / 36 files. Existing financial integrations: 28/28/28/26 checks, plus 83 security HTTP checks and four mutation snapshots. Consolidated independent integer oracle: 20 checkpoints; actual custom-number concurrent claim returns 200/409. Genuine isolated encrypted recovery: 29 tables / 72 triggers / 262 rows. Browser evidence uses the real PHP HTTP kernel and isolated local MariaDB, not mocked application APIs.

Owner-created business records, administrators and control state are compared read-only against a pre-change hash baseline in `evidence/owner-preservation.json`. The running local preview remains bound to the original owner schema. Automated fixtures use separate databases. Credentials and raw owner records are excluded from evidence.

See the issue matrix, print acceptance, navigation acceptance, owner retest guide and outstanding release blockers. UAT-2, UAT-3 and UAT-4 remain separate milestones. Production readiness is not claimed.

## Final acceptance record

The completed browser run captures 27 after screenshots, 15 corrected Chrome PDFs and 10 actual Excel downloads through 263 PHP requests. The baseline captures eight screenshots and two PDFs from the verified Git archive. Print validation compares signed expense refunds, company events, ledger debits/credits/balances, money legs, stock movements and purchase totals with actual PHP data. Visual review identified and corrected orphan challan signatures, oversized ledger cards, hidden expense headers, literal-reference formatting and omitted purchase rate/amount columns. A posted purchase without an official sequence now prints its posted entry identity and external reference rather than “Not posted”.

Reproduce from repository root: `node scripts/uat1-validate.mjs`. This provisions only synthetic fixtures. After a print-gate stop and print-only correction, `node scripts/uat1-browser.mjs` regenerates evidence and `node scripts/uat1-finish-validation.mjs` reruns React, ESLint, PDF/Excel and owner preservation while retaining the failed attempt. Run with the owning Windows identity because local fixture credentials are DPAPI/ACL-bound. Use the existing PHP/MariaDB prerequisites; do not initialize or reset the owner's local environment.

Render visual review: bundled Python `scripts/uat1-render-review.py`. Inventory: `node scripts/uat1-inventory.mjs`. The complete command/exit history is in validation evidence, and source hashes/inventory are recorded separately. Existing local management preview responds HTTP 200 at `http://127.0.0.1:5173/management`; refresh to load the new built bundle.
