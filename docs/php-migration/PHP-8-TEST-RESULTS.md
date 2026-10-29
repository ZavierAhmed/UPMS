# PHP-8 test results — partial Phase A handoff

Starting SHA: 0a2060df79f1bfde576e814c3df61c30364aba50. Branch: feature/upms-php-8-production-deployment. Actual production readiness: BLOCKED / NO-GO, not complete.

| Executed in this phase | Actual result |
| --- | --- |
| Fetch/exact baseline verification | PASS |
| Live credential-free observer | Completes observations; intentionally exits 3 because Phase A cannot authorize production |
| Public DNS/HTTPS | unique-plastic.com -> 184.168.100.110; HTTP 200, verified certificate/TLSv1.2 |
| Proposed management HTTPS | FAIL: DEPTH_ZERO_SELF_SIGNED_CERT; validation not bypassed |
| Known remote DB greeting | TLS not advertised; version is an unauthenticated hint only; zero credential authentication and zero SQL |
| Observer contract tests | Three passed, zero failed; good transport alone cannot clear account/data/cutover gates; unknown errors do not leak messages |
| Fresh locked Composer audit | Exit 0, no advisories; patched Mime 7.4.22 unchanged |
| Fresh strict Composer validation | Exit 0 |
| Fresh full Pint | Exit 0 |
| Native/connected browser access | Tool initialization unavailable (kernel assets path not found); no authenticated cPanel inventory |

Reproduce the observer from the isolated checkout with Node 22: node scripts/php-8-hosting-preflight.mjs --observe. This reads only proposed-host DNS/HTTPS and the fixed known DB greeting; it does not read credentials, authenticate a DB, run SQL, follow redirects or upload a probe. Exit 2 is invalid CLI usage, exit 3 is the intentional non-ready Phase A outcome. Run node --test scripts/php-8-hosting-preflight.test.mjs for its three safety/contract tests.

No PHP/Express business, authentication, database guard, financial calculation, UI or dependency source changes are made. Full PHP-7.9 business/browser suites are historical baseline evidence, not rerun or relabeled as PHP-8 production acceptance. No two-admin creation/authorization/concurrency test, Linux production install/package check, real-data inventory, production backup/restore or host-matching staging has run. These remain explicit blockers.

Existing source/UAT worktrees, private credentials, synthetic histories and owner assets are preserved. No authenticated owner database access or SQL, writes, SMTP delivery, domain/file/DNS changes or cutover occurred. A vendor copy is used only for local validation; it is not a Linux release payload.

The requested remaining deliverables are gated plans with explicit NOT EXECUTED/NOT IMPLEMENTED status. No production profile was added by weakening the synthetic-only Database guard. Single-operator access is still present in Laravel/Express and must be safely changed/tested after the prerequisite account/data evidence is available.

Need authenticated cPanel/SSH access or a private access-configuration reference and an approved protected read-only DB path to continue. Do not paste passwords into chat. Once Phase A passes, prepare the actual package/account plan/backup and request final cutover approval only on that concrete evidence.
