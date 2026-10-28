# PHP-7.1 financial integrity hardening — results

Starting branch: `feature/upms-php-7-public-integration`.
Fetched/verified starting SHA: `91549079beedc4cee8f04199865ec5ad0dc41132`.
Delivery branch: `feature/upms-php-7-1-integrity-hardening`.
The handoff reports the exact final commit containing this document; its own hash
cannot be embedded in its contents. Stop for review before PHP-7.5.

## Disposition and behavior

Safe corrections are implemented in both Express and Laravel. Expense party identity,
all-kind SQL/payload dates, persisted monetary representations, supported receipt
consistency and source-derived reversal snapshots now have observational controls.
The original calculation paths, thirteen document kinds, transaction/rollback protocol,
unique reversal protection and PHP-7 inquiries remain functional.

The four formerly matched-true corruption cases now produce HTTP 200/matched false
with structured integrityFindings. Zero expense/receipt evidence changes intentionally
from 400 INVALID_AMOUNT to a 200 diagnostic mismatch. New reversal draft/detail partyId
and partySnapshot derive from the original payment; the same ignored string amount
hint "999" still yields its actual 12.34 opposite journal. Historical posted records
are not rewritten. Existing contradictory drafts are corrected only as mutable drafts
are saved/posted. See PHP-7-1-INTEGRITY-REVIEW.md for exact policy and representation limits.

Command authenticity is **not fixed or claimed**: canonical operation/input is absent.
Format/actor/audit/result checks mitigate observable inconsistencies. Well-formed
replacement hashes remain unauthenticated. Missing receipts and consistent future
posted dates require historical/import provenance review. The separate forward-only
design is documented but no migration, trigger, procedure or privilege redesign is applied.

## Executed totals

| Check | PHP 8.3.36 | PHP 8.4.27 |
| --- | ---: | ---: |
| PHPUnit tests / assertions | 73 / 1,304 | 73 / 1,304 |
| PHP-2 HTTP / complete SQL-state comparisons | 144 / 13 | 144 / 13 |
| PHP-3 HTTP / complete SQL-state comparisons | 223 / 12 | 223 / 12 |
| PHP-4 HTTP / complete SQL-state comparisons | 265 / 14 | 265 / 14 |
| PHP-5 HTTP / complete SQL-state comparisons | 276 / 13 | 276 / 13 |
| Final PHP-6 + corrective HTTP / SQL-state comparisons | 345 / 11 | 345 / 11 |
| Combined management HTTP / SQL-state comparisons | 1,253 / 63 | 1,253 / 63 |
| Reversible evidence probes within the corrective suite | 126 | 126 |
| Runtime denied operations/constraint checks | 26 | 26 |
| Allowed no-op privilege probes, rolled back | 4 | 4 |
| PHP-7 inquiry HTTP comparisons / recorded checks | 66 / 78 | 66 / 78 |
| Actual HTTPS management browser checks | 26 + 9 | 26 + 9 |
| Actual HTTPS public browser checks | 28 | 28 |
| Actual XLSX downloads / A4 PDF artifacts | 3 / 2 | 3 / 2 |

All 33 original corruption probes remain, with **93 additional corrective/compatibility
controls**. Every probe checks all ten business tables before/after the read in both
databases and restores only the deliberate synthetic injection. The original PHP-6
baseline ran before edits: 250 HTTP comparisons, 11 SQL-state comparisons, 33 probes.
The original PHP-5 baseline also passed: 270 HTTP comparisons and 13 state comparisons,
retaining the actual contradictory snapshot described in the corrective evidence.

The complete ten-run PHP-2–6 matrix passed. Final expanded PHP-6 reruns supersede its
earlier intermediate counts as corrective controls were added. The PHP-5 extension
checks source-derived identity, an old contradictory draft and source immutability.
Financial concurrency, same-key replay/conflict, stale versions, repeated reversals,
rollback, interrupted transactions and real lost-COMMIT acknowledgement tests remain.
No accepted previous probe was removed. Only documented corrupted-evidence expectations
change. Money, identifiers and fingerprints are not normalized away; existing generated
timestamp/error-reference/winning-command normalization remains unchanged.

Express: **290 tests passed, zero failures** (bounded concurrency 2).
React: **192 tests across 27 files passed**, including both new actual component cases
showing actionable provenance/diagnostic messages without business writes. Production
build and ESLint passed. The existing private management >500 kB chunk warning remains.
Supplemental source-party fallback/raw-input preservation checks passed, including
the matching PHP missing-snapshot semantics. No inquiry implementation change was made.

Composer normal validation is valid with exit 0 and the existing exact-version-pin
warnings. **Strict validation returns 1 for those warnings**, not a clean strict pass;
Laravel 13.39.0 and Brick Math 1.0.0 pins/lockfile are deliberately unchanged. Platform
requirements pass on both actual PHP runtimes (Sodium explicitly enabled on 8.4),
and locked Composer audit reports zero advisories/abandoned dependencies. Pint and
diff whitespace checks pass. No installed system configuration is changed.

## Runtime/browser evidence

Independent fresh Express/PHP schemas run on the dedicated MariaDB 10.11.19 loopback
3330 engine, with new restricted accounts. PHPUnit uses its own fresh schema on the
separate loopback 3328 engine. Actual Apache HTTPS/FastCGI uses independent new browser
schemas for each PHP runtime and separate public/private origins. No owner DB is used.

Management browser acceptance includes the original 26 transaction/report/export
checks plus nine focused checks: derived client snapshot; eligible vendor Cash/Bank
reversals through the existing React form; both repeated vendor reversals rejected;
reversal of reversal rejected; client Cash/Bank rejected through the cheque path; and
visible authenticity limits in clean reconciliation. The original payment payload and
failed-operation ledger state remain unchanged. All browser runs report zero JS errors.

Three actual XLSX downloads verify ZIP/worksheet content and exact expected values;
two A4 PDFs exercise register/expense printing. Hashes/byte counts are recorded in
PHP-7-1-EVIDENCE.json; private artifacts stay ignored. Native desktop Excel and physical
printers remain owner-UAT checks. No deployment archive is produced.

The public website passes desktop/mobile routing, category inquiry preselection,
validation/submission, navigation, approved identity/images, address/maps/WhatsApp,
metadata/canonical policy and isolation checks. Browser inquiries truthfully use a
private development outbox; SMTP acceptance/rejection/unavailability/uncertainty,
certificate verification, total deadlines and worker deduplication use isolated local
TLS SMTP fixtures, never a live mailbox. Conservative post-DATA Unknown is preserved.

All **111 approved public asset SHA256 values are unchanged** from PHP-7. No public
React copy, metadata, image, alternative text, navigation, style or downloadable asset
was replaced. The intentional asset difference is the private management JS/HTML build
for reconciliation diagnostics; it is outside the public manifest. Owner-supplied
untracked source assets are preserved and excluded from staging/publication.

## SQL evidence and readiness verdict

Actual restricted-account statements deny line/journal/audit/command UPDATE/DELETE,
runtime DDL, role/user-enabled/display/insert/delete changes and control operator/state
updates. Duplicate command insertion hits the primary key. Four allowed no-ops prove
counter updates and expose the existing document/password column permissions. Business
state is unchanged after probing. Grants are not inferred solely from source text and
authentication-bearing grant lines are not committed.

Column grants alone cannot protect posted rows or bind password columns to the current
actor; API predicates/identity checks remain the enforcement boundary. No stronger SQL
guarantee is claimed. Original command authenticity and stronger SQL architecture need
explicit owner disposition or separately approved work. Historical anomalies/warnings
require investigation, not automated repair. These are not marked passed integrity guarantees.

**Ready for review and isolated owner-operated UAT; production remains no-go.** The
corrected UAT plan retains the thirteen-kind worksheet balances and fixes the vendor
reversal policy. Owner risk disposition, UAT/restore/native-tool acceptance, private
credentials/ACLs, process/CLI/locking/quotas/TLS hosting verification and an approved
production profile remain prerequisites. No PHP-7.5 run, owner access/admin reset, real
financial posting, production migration, hosting/DNS change or release occurred.
