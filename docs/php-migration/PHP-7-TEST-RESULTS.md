# PHP-7 — public inquiries and final React integration

Verified starting branch: `feature/upms-php-6-expenses-reports`.
Exact starting SHA: `e5fa64a50ddca96d621a5a0a53f6559f860c52e0`.
Delivery branch: `feature/upms-php-7-public-integration`.
The final SHA in the handoff identifies the commit containing this report; a commit
cannot embed its own final hash. No PHP-7.1 or owner-operated PHP-7.5 work was executed.

## Result

The public inquiry API runs through Laravel without management auth, SQL or CSRF,
using a bounded private cross-worker journal and verified TLS Symfony SMTP. Existing
React public pages/assets are unchanged. The only React edit corrects a posted
expense heading from Draft to Expense, with specific tests and no accounting change.
All thirteen accepted Simple V1 kinds retain their contracts and business effects.

This is isolated integration acceptance, **not production approval**. Owner full-system
UAT, the separate source-findings review and account-specific hosting verification
remain required. Review the explicit transport/persistence differences rather than
assuming that two different mail libraries classify every network failure identically.

## Executed verification

| Check | PHP 8.3.36 | PHP 8.4.27 |
| --- | ---: | ---: |
| Inquiry equivalent HTTP comparisons | 66 | 66 |
| Inquiry total recorded checks (includes the HTTP comparisons) | 78 | 78 |
| PHPUnit tests / assertions | 73 / 1,304 | 73 / 1,304 |
| PHP-2 HTTP / complete SQL-state comparisons | 144 / 13 | 144 / 13 |
| PHP-3 HTTP / complete SQL-state comparisons | 223 / 12 | 223 / 12 |
| PHP-4 HTTP / complete SQL-state comparisons | 265 / 14 | 265 / 14 |
| PHP-5 HTTP / complete SQL-state comparisons | 270 / 13 | 270 / 13 |
| PHP-6 HTTP / complete SQL-state comparisons | 250 / 11 | 250 / 11 |
| Combined management HTTP / SQL-state comparisons | 1,152 / 63 | 1,152 / 63 |
| Actual Apache HTTPS/FastCGI public browser checks | 28 | 28 |
| Actual Apache HTTPS/FastCGI management browser checks | 26 | 26 |
| Actual XLSX downloads / A4 PDF print artifacts | 3 / 2 | 3 / 2 |

Express: **290 passed, zero failures** with bounded test concurrency 2. Original
Express implementation/tests were not changed. React: **190 tests in 26 files passed**,
including the two new expense-heading tests. React build and ESLint passed. The
existing private management bundle >500 kB build warning remains informational.
Pint and diff whitespace checks passed. UAT preparation scripts pass syntax checks;
the new owner-only random-credential preparation command was not executed as UAT.
Additional real-kernel smoke checks on both runtimes verify the source defaults
(five attempts/ten minutes and a 15-second deadline) and exclusive-lock cleanup of a
stopped writer's temporary journal file before a successful synthetic delivery.

The inquiry suite compares the real Express handlers against a newly booted real
Laravel kernel in separate PHP processes. It covers normalization/case/trim, category
mapping, every length boundary, Unicode/UTF-16 including lone surrogate code-unit
identity and replacement-character conflict, JSON null/type/syntax/BOM/depth/byte
limits, honeypot, origin/cross-site/content/key errors, no private-session dependency,
rate windows/Retry-After across requests, replay/conflict, full/corrupt/unavailable
journal, expiry and abandoned handoffs. SMTP tests use only isolated synthetic
authenticated TLS servers: STARTTLS and TLS-on-connect, accepted, 550/535 rejected,
uncertain reply, timeout (including slow-but-responsive SMTP), untrusted certificate and post-DATA disconnect. Eight
concurrent independent PHP workers produce one SMTP message; another eight-worker
race produces one private outbox message. The exact plain-text body/reference is
compared with the source builder. No certificate verification is disabled for SMTP.

Only generated correlation IDs/references are normalized in public comparisons;
management runners retain their previously reviewed timestamp/error-reference and
winning-command normalization. No financial values, source IDs or amounts are
normalized away. The full regressions include posting/cancellation/corrections,
concurrent commands, lost-COMMIT acknowledgements, complete state comparison, session
and CSRF checks, permissions, expense isolation and all-kind corruption probes.

PHP-7-EVIDENCE.json records the machine summaries and artifact hashes. Detailed HTTP,
SQL, certificates, credentials, mail and browser artifacts remain private under ignored
`tmp/php-runtime`; they are not a release package. The two browser runs use independent
fresh synthetic schemas. Each differential runner provisions independent Express/PHP
schemas on the dedicated 127.0.0.1:3330 MariaDB engine. PHPUnit uses a separate fresh
schema on the dedicated 127.0.0.1:3328 engine. The owner database was never contacted.

## Website and browser results

Public acceptance covers ten routes at desktop/mobile sizes, mobile navigation,
product inquiry preselection, validation, approved WhatsApp/address/map links,
metadata/canonical policy, visible loaded images and no horizontal overflow. Actual
browser submissions use DevelopmentFile and truthfully say no email was sent, with
one saved message on replay and no login, cookie or CSRF dependency. Public/private
origins and routing are separate; public access to the private UI/API is rejected.
SMTP outcomes are separately proven through isolated verified-TLS tests.

Management acceptance covers masters/openings, stock, challan/return/receipt/reversal,
purchase/vendor payment, paid-only expenses, filter/report/ledger/reconciliation reads,
three actual XLSX downloads and print rendering. PDFs and an expense screenshot were
produced; the corrected `Expense <id>` heading is verified without changing totals.
Native desktop Excel and physical printers remain owner-UAT checks.

All **111** public build files have identical SHA256 values to PHP-6. No public page,
CSS, logo, product image, metadata or asset was replaced. The intentional asset
difference is limited to the private management JS/HTML build caused by the authorized
heading copy fix; this is excluded from the public manifest. Owner source assets,
including conflicting unused identities, were preserved and not staged/published.
See PHP-7-PUBLIC-WEBSITE-ACCEPTANCE.md and PHP-7-PUBLIC-ASSETS.json.

## Review risks and remaining prerequisites

- Journal persistence survives PHP requests/workers; expiry extends by the delivery
  budget plus three seconds. Cache-Control adds private. Configured public host gating
  enforces separation. A post-DATA disconnect is conservatively Unknown, while the
  Nodemailer source can classify ECONNECTION as Unavailable. These explicit differences
  and operating requirements are in PHP-7-INQUIRY-PARITY.md.
- SMTP requires working process supervision and matching CLI/extensions. FPM may need
  an explicit INQUIRY_PHP_BINARY. Single-host local file locks/atomic replacement,
  private NTFS ACLs or Unix permissions, disk quotas/outbox retention, correct approved
  origins and CA trust must be verified on the eventual hosting account. No hosting
  resource/load or distributed-filesystem acceptance is inferred from these tests.
- PHP-5-REVERSAL-REVIEW.md remains open: crafted raw reversal partySnapshot can differ
  despite a correct posted party/journal. No silent reversal-policy fix was made.
- PHP-6-RECONCILIATION-FINDINGS.md retains four blind spots: raw expense payload partyId,
  SQL/payload date disagreement, saved-command fingerprint and same-value numeric amount
  evidence. Reconciliation is observational, not a repair or proof against those cases.
- FULL-SYSTEM-UAT-PLAN.md requires a newly prepared separate schema, private random
  credentials, local HTTPS, all thirteen kinds with expected balances, browser/export/
  security/concurrency tests, a real restore rehearsal and owner go/no-go. These remain
  separate PHP-7.5 work after the PHP-7.1 findings review.

No owner admin was recreated, owner schema/counter changed, legacy ERP activated,
accounting model introduced, hosting/DNS/live file changed, deployment performed or
release archive generated. Stop for review before PHP-7.1 and PHP-7.5.
