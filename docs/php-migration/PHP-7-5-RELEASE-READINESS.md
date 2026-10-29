# PHP-7.5 release readiness

PHP-7.9 replaces the retired public category with Stickers/Cartons and refreshes
login/palette presentation. Its only backend contract change adds two known inquiry
IDs while retaining bounded API-only custom compatibility for historical replays.
No financial posting, schema, auth, dashboard aggregation or dependency change.
PHP-7.8 audit/header/Pint/strict-validation gates remain green under fresh checks.
Four earlier UAT business schemas and services are preserved; new review uses
9483/9484. See PHP-7-9-TEST-RESULTS and VISUAL-ACCEPTANCE. Owner acceptance of the
new interface and all existing production risk/hosting/recovery decisions remain
PENDING OWNER. Production stays NO-GO; no deployment or release package authorized.

PHP-7.8 clears the four verified technical failures: dependency audit (Mime 7.4.22),
management CSP/frame/cache headers, full Pint and strict Composer validation.
Fresh runtime/browser evidence is in PHP-7-8-TEST-RESULTS and HTTP-HEADERS. The
following PHP-7.7/7.6 paragraphs are historical; PHP-7.8-RELEASE-GATES is the current
explicit disposition. Production is still NO-GO because manual acceptance and
production risk/hosting/recovery decisions remain pending. No deployment authorized.

PHP-7.7 adds public/management presentation and read-only analytics only. It changes
no backend endpoint, schema, stored balance, posting, authentication or grant.
Original owner previews and business records remain preserved; a separate design
preview runs on 9463/9464. No chart dependency was added. Existing Symfony Mime,
management-header, full Pint/strict-validation, command-authenticity, SQL row-grant,
hosting and owner-approval gates remain unresolved. Production stays NO-GO;
owner design acceptance is PENDING OWNER.

PHP-7.6 follow-up: owner-requested website address and per-challan selling rates
are implemented/tested separately; see PHP-7-6-TEST-RESULTS.md. The original running
owner fixture and all owner-added postings are preserved. New review uses separate
9453/9454 URLs and private credentials. This correction clears none of the security,
strict-validation, SQL/authenticity, hosting or owner-approval gates below. Full
Pint still fails on seven unrelated files after formatting modified Documents.php.

**Production: BLOCKED. Local UAT: available for owner review.** Stop for feedback
before PHP-8. Financial and restore test success is not production authorization.

| Gate | Status | Basis |
| --- | --- | --- |
| Local isolation / working HTTPS | PASS | Engine identity, loopback listeners, actual public/private 200 and administrator login |
| Worksheet / stock and financial invariants | PASS | 13 kinds, 16 documents, exact 123 / 200.00 / 80.00 / payable 185.00 / expenses 18.00 |
| Replay, conflicts, concurrency, rollback, lost COMMIT | PASS | Fresh disposable differential fixtures |
| Inquiry parity / strict TLS SMTP fixtures | PASS | 66 comparisons / 78 checks per runtime; no real customer mail |
| Recovery / restored restricted application | PASS | 19 tables identical, inquiry files identical, clone-only draft/cancel, original preserved |
| Dependency security | PASS | PHP-7.8 Mime 7.4.22; fresh locked audit exits 0; corrected advisory independently investigated |
| Management security headers | PASS | PHP-7.8 actual HTTPS policy on HTML/static/API/auth/rejections/errors; CSP and iframe checks |
| Full Pint / strict Composer validation | PASS | PHP-7.8 full Pint, normal validation and strict validation all exit 0 |
| All manual business workflows | PENDING OWNER | No human testing/sign-off recorded |
| Native Excel / real Windows printing | PENDING OWNER | ZIP/XML and headless PDF checks do not substitute |
| Actual cPanel process/storage/transport | BLOCKED | Hosting prerequisite unavailable in local-only scope |
| Production release | BLOCKED | Unsigned manual acceptance, hosting and production risk/recovery decisions |

## Separate production-risk disposition

| Risk | Status | Owner decision required |
| --- | --- | --- |
| Command authenticity | PENDING OWNER | Accept documented residual limit or approve forward-only redesign. Current schema cannot authenticate original command fingerprints; a well-formed replacement hash can remain undetected. matched=true is not authenticity. |
| SQL posted-row enforcement | PENDING OWNER | Accept trusted-runtime boundary or approve redesign. Column UPDATE grants permit posted document changes; SQL does not enforce posted-row immutability. |
| SQL self-user password row | PENDING OWNER | Accept application restriction or approve redesign. Password-column grants do not restrict updates to the current user's row. |
| Historical/import provenance | PENDING OWNER | Verify real histories/imports or investigate. Only synthetic provenance was examined; no owner data accessed. |
| Inquiry uncertainty | PENDING OWNER | Approve operating procedure for delivery_unknown/busy and abandoned reservations. Preserve references, inspect private evidence and verify actual outcome before retrying; never resend blindly. |
| Hosting process/storage | PENDING OWNER | Verify PHP/extensions, CLI process creation/termination, atomic rename/flock, private writable storage, quotas/retention, TLS and ACLs on actual cPanel. Local Windows success is insufficient. |
| Recovery operations | PENDING OWNER | Approve protected off-device backups, retention, restore schedule and actual production RTO/RPO. |

No pending decision has implied acceptance. No release package, deployment, DNS
change, remote production profile, owner migration, real administrator reset,
live financial posting or real customer email occurred. Express and approved
Unique Plastic identity/assets remain intact.
