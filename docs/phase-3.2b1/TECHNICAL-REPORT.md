# P3.2B1 — Financial documents and money accounts

Development only. Production records, files, administrators, grants, SMTP, live guards and backup automation were not accessed or changed for this milestone. Feature configuration remains disabled by default. Unrelated uncommitted assets were preserved.

Starting local and remote branch: `feature/upms-p3-2a-money-accounts-foundation`, verified SHA `0f392ff68898c4aeeb14a24c8716a0ca365ceeb8`. Work branch: `feature/upms-p3-2b1-financial-money-integration`. The final commit SHA is supplied with delivery and can be verified using `git rev-parse HEAD` on that branch.

## Financial behavior

| Posted document | Money effect when enabled | Existing business effect retained |
|---|---|---|
| Cash/bank client payment | Credit selected verified matching cash holder/bank | One client credit reduces company receivable |
| Cash/bank vendor payment | Debit selected verified matching cash holder/bank | One vendor debit reduces company payable |
| Paid expense | Debit selected verified matching cash holder/bank | One expense fact; no client/vendor journal or payable |
| Immediately paid purchase | Debit selected account by the exact purchase total | Existing stock increase and net settled vendor journal; no second payment |
| Credit purchase | None; selecting an account is rejected | Existing stock increase and vendor payable |
| Cheque receipt or payment reversal | Explicitly blocked, including pre-existing drafts | Disabled mode preserves established behavior; integrated correction/lifecycle policy pending |

Both cash holders remain independently selectable; names never determine financial calculations. CASH requires CASH_HOLDER, BANK_TRANSFER requires BANK. Cheque custody cannot receive or fund any supported document effect. Missing/unverified openings, mismatched identities, insufficient funds and backdated account activity fail closed. No deficit override, historic allocation or advance inference was introduced.

`MoneyDocuments` prepares a server-owned `moneyIntegrationVersion=p32b1` and account identity inside each applicable draft snapshot. A pre-integration draft must be edited and saved with an account before posting. Turning the feature off cannot silently post an integration-marked draft without its effect. Feature-off requests retain the old strict input/result contracts and do not claim money effects.

## Atomicity, uniqueness and reconciliation

`Documents::post` remains inside the existing `BusinessCommand::run` transaction and identity guard. It rechecks authorization, extension readiness, canonical source conflicts and full money/document/party/stock reconciliation. Normal stock/party calculations run unchanged. The adapter then appends the exact money batch/leg/audit, finalizes the original document, writes its existing posting audit, verifies document/money reconciliation and returns a linked receipt. The existing command receipt is inserted before the same outer commit. There is no second HTTP call or independently committed balance update.

Canonical claims use `source_type=DOCUMENT`, `source_key=SHA256(canonical decimal document ID)`, `source_ref=UPMS-DOC:<ID>`. Existing unique `(source_type,source_key)` enforces one claim per document. Movement kind remains SOURCE_CREDIT or SOURCE_DEBIT; source namespace distinguishes integrated business effects from manual EXTERNAL attestations. Amounts remain exact strings/integer cents throughout posting; UI previews use BigInt and are advisory until the server checks current funds again. Account rows are locked in ID order under the existing serialization protocol.

Manual external posting rejects reserved document identities and references belonging to posted UPMS documents. Document posting also rejects an existing normalized EXTERNAL claim for its external or official reference. Human aliases for the same physical source cannot be exhaustively detected; independent evidence review remains required. Direct money reversal of a DOCUMENT claim is blocked because it would detach the money effect from its business fact. No standalone transfer changes a party balance, income, expense or stock.

Money reconciliation checks every marked posted source has exactly one effect and each DOCUMENT effect identifies a marked posted source, with matching amount, date, direction, account classification and actual finalizing administrator from posting audit. Draft author and finalizer may differ. Historical unmarked documents are counted explicitly as unlinked, never backfilled. Global reconciliation still runs the original document/stock/party checks. `Integrity` now validates standalone money receipts and linked document receipts against exact retained batch shapes/actors, while keeping legacy receipt validation strict. Recovery checks this source/effect relationship after restore as well.

## UI and changed files

- `Documents.php`, new `MoneyDocuments.php`, `MoneyAccounts.php`, `V1Input.php`: atomic adapter, account validation, canonical claims and linked receipts.
- `Integrity.php`, `Reconciliation.php`, `SimpleV1.php`: strict receipt checks, complete reconciliation and document links.
- `MoneySchema.php`, `MoneyRecovery.php`: money-specific approval requires integration version; snapshot metadata and isolated restore validate linked sources.
- `SimpleV1.jsx`, `PaymentDocument.jsx`, new `MoneyDocumentEffect.jsx` / `moneyDocument.js`: searchable account choices, exact available balances, disabled reasons, effect preview and final confirmation. Credit purchases do not request an account. Enabled forms exclude cheque selection.
- `SearchableEntitySelect.jsx`: optional account label/disabled-reason rendering; existing callers retain their defaults.
- `MoneyAccounts.jsx`: statement/history links to original business documents; linked claims excluded from standalone reversal choices.
- New PHP/component tests, isolated integration/browser scripts and evidence in this directory. The enhancement roadmap and future release checklist are updated.

Screenshots use actual isolated PHP response fixtures over local intercepted GET transport. They are not hosted acceptance: [receiving account](evidence/customer-account-preview.png), [disabled paying choices](evidence/expense-account-search.png), [expense final review](evidence/expense-final-review.png), [linked receipt](evidence/receipt-linked-movement.png), [linked purchase](evidence/purchase-linked-movement.png), [statement source links](evidence/statement-original-documents.png), [mobile](evidence/mobile-expense-review.png). Finalization was dismissed; browser financial requests were blocked.

## Validation

Actual results are retained in [evidence](evidence), including the complete financial reconciliation and local recovery result. PHP 8.3.36 unit suite: 69 tests, 1,288 assertions. React: 236 tests across 34 files. Existing independent financial regression: 83 HTTP comparisons and four database snapshots. Lint, scoped Pint, public/SSR/prerender and management builds passed; the management bundle retains Vite's 500 kB advisory. **28 grouped integration checks passed**; restore compared **242 rows**. Integration covers all four source adapters, exact balances, concurrency, idempotency, duplicate references, invalid accounts, insufficient funds, cheque exclusion, mutation/escalation denial, CSRF/rotation/authorization, feature-off compatibility and injected failures in batch, movement, money audit, party journal, stock journal, business audit, command receipt and document finalization. Encrypted isolated recovery preserves 25 tables and 60 guards plus canonical source reconciliation.

Failures found and resolved: the first full integration run found that the old integrity checker rejected the new receipt formats; explicit batch-bound validation was added rather than relaxing the legacy checks. A validator initially read Laravel configuration directly and broke a framework-free unit test; the mode is now an explicit parameter with the legacy false default. The browser harness initially dismissed a draft-leave warning and aborted navigation; it now accepts leave warnings while still dismissing financial confirmation. Failed runs are not reported as passing results.

## Remaining policy and release limits

There is no hosted validation or production readiness claim. See [schema/guard/backup impact](MIGRATION-GUARDS-RECOVERY.md), [future production checklist](FUTURE-PRODUCTION-CHECKLIST.md) and [P3.2B2/P3.2C plan](NEXT-INTEGRATION-PLAN.md). The protected 20-table/45-trigger backup is unchanged and must be upgraded and independently restored before any hosted money-schema migration. The in-memory money snapshot prototype is not that production upgrade.

Unresolved policies include real opening evidence/cutoff; manual external claims and aliases; per-account restrictions or independent approval; integrated refunds/payment corrections/expense corrections; bank fees and bank statement reconciliation; account closure/rename; cheque custody, deposit, clearance and dishonour recognition; and any future owner-approved historic allocation. Current designated administrators may use all matching verified accounts; there is no claimed per-account database row isolation.

## Local reproduction

Use the existing ignored PHP 8.3 runtime and positively verified loopback MariaDB fixture engine only:

```powershell
& .\tmp\php-runtime\bin\php.exe .\upms.php\vendor\bin\phpunit -c .\upms.php\phpunit.xml --testsuite Unit
node .\scripts\p32b1-money-integration.mjs
node .\scripts\p32b1-money-browser.mjs
Set-Location .\upms.client
node .\node_modules\vitest\vitest.mjs run --maxWorkers=4
node .\node_modules\eslint\bin\eslint.js .
```

Integration creates fresh positively identified `upms_test_php_money_<digits>` fixtures only. Credentials, encryption keys, raw snapshots and fixture environment files remain ignored/private and are never committed.
