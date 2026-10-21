# P2.1A test results

Current evidence, 2026-10-21:

| Check | Result |
| --- | --- |
| Backend suite including six new hardening checks | 113 passed, zero failed |
| Frontend suite | 95 passed in six files |
| Build and lint | Passed; npm run verify exited zero |
| Fresh MariaDB read-only inspection | Passed; 10.4.32, InnoDB, utf8mb4, strict session mode, UTC, REPEATABLE READ |
| Main database objects/migrations | Eleven verified tables; unchanged migration applied once |
| Main provisioning | Passed under approved preserving forward plan; exact localhost accounts verified |
| Test provisioning | Passed after owner saved TestRuntime; dedicated schema/account created |
| Current restricted SQL integration, original 17 checks | 17 passed |
| Current management browser acceptance | 10 checks passed; zero page errors |
| Extracted deployment package regression | Passed; 57 files, eleven public routes, seven private probes, production-only install and integrity rejection |
| Public browser/Lighthouse | Passed: 66 route/viewport checks, 22 interactions; Lighthouse performance 96/97/97/98 and accessibility/best practices/SEO all 100 |
| Bounded identity guard load | 40 requests, concurrency 4, zero errors; median 27 ms, p95 38 ms, maximum 46 ms |
| Owner administrator bootstrap and automated login/logout | Passed through supported service/API; rotation remains an owner first-login action |

Ignored verification log: `tmp/w06/p21a-verify.log`. Private metadata checkpoint: `server/.local/p21a/preflight-2026-10-21T17-38-00-048Z.json`. No owner passwords, application credentials or business records belong in test reports. Historical P2.1 results do not satisfy the pending current acceptance checks.

Eight actual SQL privilege-denial probes passed, including DDL, audit mutation, catalog mutation, protected system schema access and delegation. These measurements describe a bounded local synthetic run, not production capacity. Evidence: tmp/w06/p21a/restricted-runtime.json and tmp/w06/p21a-browser/results.json. No fixtures were inserted into upms.

Dependency audits: zero reported vulnerabilities for root production dependencies and the frontend dependency tree. Operator scripts passed Node syntax checks after the approved forward-plan change; actual main provisioning/migration/grants also passed.

## Automated setup follow-up — 2026-10-21

The owner authorized generated temporary credentials and automated bootstrap. Real upms API checks passed for login, missing-CSRF rejection, HttpOnly/SameSite cookie, authenticated profile, first-login restriction, logout, old-session rejection, atomic bootstrap/login/logout audit and public homepage. Private reports: server/.local/p21a/automated-setup-*.json. A repeated setup preserved the same administrator and password. No DDL or grant operation was repeated.

New synthetic browser rotation check passed: forced profile, administration denied before rotation, password changed through supported UI/API, old session rejected, new password login, administration available after change and durable audit. Evidence: tmp/w06/p21a/first-login-rotation.json. No owner credentials entered test fixtures. Current full verify log: tmp/w06/p21a-automation-final-verify.log.

Final automation build public regression also passed: 66 route/viewport combinations, 22 interactions, four Lighthouse pages (performance 96/97/97/98; accessibility/best practices/SEO all 100). The final extracted deployment archive passed all smoke assertions after production-only install. Evidence: tmp/w06/p21a-automation-public-browser/, tmp/w06/p21a/automation-package-results.json. Existing 17-check destructive-fault test evidence was preserved rather than resetting/reusing its occupied schema; follow-up changes were covered by current unit/UI verification and the append-only synthetic rotation browser test.

Final local readiness check returned HTTP 200 and confirmed one user, one enabled administrator and one bootstrap event on upms. Both generated handoff and database DPAPI profile paths are Git-ignored. Starting HEAD: a8169ca68623d58cfcbc4514e42cc94fa56609c7. No merge or deployment.
