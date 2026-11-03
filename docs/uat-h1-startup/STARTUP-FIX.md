# Employee Hafta local startup correction

Base: `25889014a61229098c7826757cfbe01ef06f29b8`. Correction branch: `feature/upms-uath1-startup-403-fix`. No production deployment or business-rule changes.

## Exact failure

The active port 5180 listener was PID **19644**, Node running the untracked `tmp/php-runtime/uath1-browser-setup.mjs`, not the committed PHP preview. Its response set `Referrer-Policy: no-referrer`. A genuine Chrome form submission sent **POST http://127.0.0.1:5180/setup**, **Origin: null**, and received **HTTP 403** from that Node setup listener's strict Origin check. PHP, session authentication and PHP CSRF were not reached. `legacy-403.json` records the real request metadata without its password or body.

The setup state was WAITING and the fixed `uath1-owner-binding.json` did not exist. That rejected POST did not create an administrator or complete setup. Earlier independent local provisioning/test attempts left unbound synthetic schemas; they were preserved and were not adopted, reset or deleted. The original owner workspace remained separately bound on port 5173. No administrator password hash was extracted or reused by this correction.

The old launcher also had a second race: it returned READY before closing its server and asynchronously spawning the PHP preview. A redirect could reach the wrong server or a port without a listener; child failure was discarded. The original PowerShell script similarly printed a URL before checking dashboard readiness.

## Correction

- A committed `uath1-launcher.mjs` owns the same loopback listener through setup, PHP verification and dashboard serving. There is no subprocess port handoff.
- Setup uses `Referrer-Policy: same-origin`, a same-origin form action and a random CSRF token. Null/missing/foreign Origins are still rejected. Passwords stay only in request/process memory; neither request bodies nor passwords enter logs or files.
- `uath1-workspace.mjs` creates an empty, explicitly isolated 34-table/88-guard UAT workspace. It does not run the full financial acceptance fixture or overwrite old milestone evidence. Only its own newly created synthetic administrator receives the newly chosen password.
- Durable checkpoints prevent repeated database initialization and duplicate administrators. A retry after administrator creation requires the same original setup password; a different password is rejected without resetting it. A process crash or failed nontransactional DDL step with uncertain completion is marked for review rather than blindly replayed. No database cleanup/reset is performed.
- A successful candidate is published to a fixed private binding. Restarts reuse that binding and records. An invalid existing binding fails visibly; it is never replaced with a new database.
- The real PHP `/readyz` check validates the isolated schema and existing readiness rules. Then a request over the actual listening socket to the dashboard must return HTTP 200 with the Employee Hafta adapter marker. Only afterward does setup report READY. The browser independently checks the same response before redirecting to exactly **http://127.0.0.1:5180/management**.
- Failures show a stage/error and preserve protected `startup-events.jsonl`, progress and native helper diagnostic codes. Secrets and raw SQL exceptions are not copied into public diagnostics. The setup remains available for safe retries.
- The local adapter retains PHP authentication and CSRF, a distinct HttpOnly/SameSite=Strict cookie and explicit logout expiry. Its local HTTP cookie is intentionally separate from the real production HTTPS `__Host-` cookie. Production configuration is unchanged.

## Host / Origin behavior

| Request | Expected |
|---|---|
| GET canonical 127.0.0.1 dashboard/setup | Setup page or real dashboard, HTTP 200 |
| GET localhost alias | HTTP 303 to canonical 127.0.0.1 |
| Foreign Host | HTTP 403 |
| POST setup from canonical same Origin + valid CSRF | HTTP 202 while provisioning |
| Null/missing/foreign Origin; cross-alias setup POST | HTTP 403 |
| Invalid setup CSRF | HTTP 403 |
| Password outside 14–128 characters | HTTP 400; no database initialized |
| Duplicate setup after completion | HTTP 409; no reinitialization |
| Anonymous management API | HTTP 401 |
| Invalid PHP CSRF after login | HTTP 403 |
| Logout | Existing PHP contract HTTP 204; cookie removed; session becomes unauthorized |

## Run locally

From the repository root, use PowerShell 7:

```powershell
& 'C:/Users/zasah/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe' -NoProfile -File scripts/start-uath1-preview.ps1
```

If there is no fixed Employee Hafta binding, the browser opens a secure-entry local setup form. Choose a NEW synthetic password, wait for verification, then sign in as `php-admin` with that password. The launcher does not print “dashboard ready” for a setup page. Subsequent runs reuse the fixed database and credentials without requesting another password. `-NoBrowser` checks/starts the listener without opening a browser. An unidentified process on port 5180 is preserved and reported, never terminated by this script.

Existing original UAT remains at `http://127.0.0.1:5173/management` with its existing records and login. The Employee Hafta feature is not activated there. No production connection, SMTP, operational backup, guards, financial transactions, historical records or public website changes are included.

## Validation

`evidence/browser.json` contains actual Chrome request statuses and checks for first-time setup, injected failure after administrator creation, wrong-password retry rejection, successful same-password retry, exact redirect, real login, Production employee selection/editable labor rate, Hafta sidebar, fixed-binding restart, CSRF and logout. Tests use separate fresh databases and create only a synthetic item and employee, no posted business transactions. Screenshots accompany both scenarios.

`scripts/uath1-startup-regressions.mjs` runs the existing complete PHP/security and financial harnesses with a correction-specific evidence destination. The four pre-existing modified UAT-H1 evidence files and unrelated untracked owner assets remain intact. `validation.json` summarizes final observed results; owner-table hashes are compared before and after. Failed development attempts are not recorded as passes: readiness-path/evidence assembly issues and test-only unsaved-draft/logout-contract assumptions were corrected before the final successful run.

This is local startup acceptance, not production readiness or permission to deploy.

## Final observed results

- Full PHP/security suite: **160 tests, 1,894 assertions passed** (PHP 8.3.36).
- React: **272 tests / 38 files passed**; ESLint and management build passed.
- Foundation, documents, expenses and refunds regressions passed; security/pricing differential **83 HTTP comparisons / 4 snapshots passed**.
- Final real Chrome startup run: **248 browser HTTP requests**, seven scenario groups, no page errors; negative responses are expected boundary tests, not hidden failures.
- Original owner UAT table fingerprints unchanged. The four already-modified milestone evidence files remain byte-for-byte unchanged.
- Corrected owner listener verified on **127.0.0.1:5180**, running `scripts/uath1-launcher.mjs`; setup page returns **HTTP 200**. The owner's fixed Employee Hafta binding is still absent, so its honest state is **WAITING for the owner to choose a NEW password**. The real dashboard was successfully exercised in isolated automated fixtures; the owner's fresh workspace is not falsely reported as already initialized.

Earlier unbound synthetic fixture metadata was inspected without reading administrator credentials: it already contains an enabled synthetic php-admin, but has no fixed owner binding and was neither adopted nor changed. No old password hash was copied. The user can now complete the corrected browser setup to create the dedicated fixed workspace.
