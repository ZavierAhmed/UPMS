# P2.5A executed tests and evidence

Executed on 2026-10-22 with Node 24.22.0, real MariaDB 10.4.32 and fresh synthetic schemas at port3309, recovery mode zero. No mocked database acceptance, skipped checks, owner business fixtures or reset/reused populated schemas count as success.

| Suite | Actual result |
|---|---|
| Backend | 137 passed: original131 plus six new checks |
| Frontend | 110 passed: original107 plus three new checks |
| Identity SQL | 17 passed, regression01 |
| Business SQL/browser | 16 passed, regression01 |
| Inventory SQL/browser | 20 passed, inventory01 |
| Purchasing SQL/browser | 29 passed, purchasing01 |
| Original Sales SQL/browser | 23 passed, final sales04 |
| Expanded Sales/classification SQL/browser | 38 passed, final classification03: original23 plus 15 additional checks |
| Build/lint | Passed |
| Full backend/client dependency audits | Zero vulnerabilities in each |
| Production package before commit | 81 files; clean production-only install; native Argon2, integrity/corruption rejection, all11 public routes, asset and seven private probes passed; SMTP Disabled |

Node SQL counts include parent tests and embedded browser checks. The expanded run repeats the original Sales baseline; its 23 checks are not 23 additional unique assertions. Original suite expectations change only for the genuinely superseding classification contract and current schema/history/evidence metadata. No security or stock assertions are removed. The prior strict-field unit fixture was updated to contain valid classification fields before probing forbidden extras.

New real SQL checks prove required/invalid classes; no charged GST on NON_GST; exact 10000+1800=11800; arbitrary manual amounts with no tax percentage; zero-GST draft-only; explicit confirmation; independently pending openings; same-customer simultaneous classes; only selected balance/version changes; cross-class stock competition; durable replay/conflict and revoked GST authority; audit rollback; historical/unclassified guards; no old projection writes; composite FK/check constraints; tamper reconciliation; versioned class changes; approved conversion requests with no effects; Accounts visibility/Inventory denial; explicit ledger filters and component-only summaries.

Browser sessions are isolated by role and wait for loaded options and ready controls. They create/edit/review/post NON_GST and GST challans, confirm manual amount/total, prove stock and selected ledger effects, inspect separate histories for one customer, exercise correction review and department restrictions, and verify mobile/no page or unexpected console errors. Existing actual lock timeout, deadlock, lost COMMIT acknowledgement and restart/idempotency tests remain enabled.

Failure history: sales01 stopped during isolated DDL due to an automatically generated FK name over64 characters; short explicit names fixed the unapplied migration before successful fresh runs. Sales02 exposed an invalid extra customer-classification field on the synthetic vendor fixture; only the fixture was corrected. Classification01 exposed a repeatable-read test transaction started before its draft existed; draft creation now precedes that rollback-only transaction. All failed schemas, account profiles and JSON receipts remain preserved. A scope log-name collision replaced the original Sales02 text log with classification02 output; observed original error/counts were archived from tool output and the original JSON retained. Scope-specific filenames now prevent recurrence. Detailed private diagnostics are excluded from Git/package.

Final main evidence: exact backup/restore fingerprints; only migration006 applied; 74 physical/72 runtime tables/six migrations; original row retention; one Administrator; unchanged encrypted profile/session-secret hashes; all Sales/classified financial and activation tables empty; stock/classified reconciliation matched with no repair; actual main GST gate rejected activation. All1,037 original XAMPP files and offline copies were hash-verified unchanged.

Public regression passed all66 route/viewport combinations and22 interactions. Lighthouse performance: home96, catalogue97, detail97, contact98; accessibility/best-practices/SEO100 on all four pages. The81-file package passed real production-only installation, native Argon2 hashing, integrity/corruption rejection, eleven public routes, asset serving and seven private-path probes. SMTP remains Disabled. The package is regenerated after commit to embed the exact final source SHA and rechecked from a fresh extraction.

Ignored receipts/logs/backups remain in `server/.local/p25a` and `tmp/w06/p25a`; none is published. No merge or deployment.
