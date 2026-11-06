# P4.0 release gates

Assessment date: 2026-11-05. **Release BLOCKED. No deployment or activation authorized.** Evidence is under `evidence/`; a local PASS is not a hosted acceptance PASS.

| Gate | State | Evidence / required action |
|---|---|---|
| Owner cheque accounting policy | PASS | `cheque-policy-approval.json`; owner approved policy only. No accountant signoff claimed. |
| Production runtime CRUD identity and original guards | PASS | `host-inventory.json`: authenticated runtime, exact four database CRUD grants; original 20 tables / 45 guards. |
| Existing release integrity | PASS | `host-release.json`: 6070 backend and 120 published files match existing manifests. |
| Fresh protected production backup | PASS | `production-backup.json`, authenticated ciphertext; 20 tables / 45 guards. |
| Original-operator local restore | PASS | `production-restore-local.json`: 140 rows restored and compared; protected mutation probes rejected. |
| Independent operator / offline USB recovery | BLOCKED | Actual production key custody and restore on separate account/computer have not been demonstrated. Synthetic capsule tests do not satisfy this gate. |
| Retention policy | PASS | Owner approved 48-hour hourly, 35-day daily, 12-week weekly and 12-month monthly points; existing archives protected. |
| Automated retention deletion | NOT APPLICABLE | Dry-run only. No deletion executor or retroactive deletion authorized. |
| Structural transition rehearsal | PASS | `ddl-rehearsal.json`: 47 tables / 133 guards, interruption/resume, 140 original rows unchanged; new tables empty. |
| Operational production migration | BLOCKED | Production profile/schema contracts, authentic migration receipts, permissions and historical allocations/openings need reviewed implementation and owner/accountant decisions. Structural plan is not a production migrator. |
| Public Node hosting | BLOCKED | Actual CloudLinux selector disabled, no available Node versions; accepted Node architecture cannot currently be demonstrated on this account. |
| Trusted HTTPS | PASS | Certificates verified without bypass. This does not prove correct application responses. |
| Current hosted route denial / application identity | FAIL | Latest `host-https.json` fails asset identification, redirects and private/API denial checks. No secret-content disclosure is asserted from these checks. |
| Current hosted Symfony dependencies | FAIL | Existing hosted 7.4.21 packages correspond to fresh advisory findings. Candidate lock patched to 7.4.23; live host unchanged. |
| Candidate dependency audit | PASS | `composer-audit-after.json` and `npm-runtime-audit.json`; no reported advisories. |
| Isolated regressions | PASS | PHP 169 tests / 1912 assertions, React 324 tests, final Node 304 tests; financial scenario evidence includes failures retained and successful retries. |
| Real hosted isolated staging | BLOCKED | Distinct HTTPS staging, runtime lifecycle and separate reviewed secrets/database not established. Local browser evidence cannot substitute. |
| Operational attachments | BLOCKED | No approved operational malware scanner or independently recovered attachment application key. Keep disabled. |
| SMTP | NOT APPLICABLE | Disabled; no inquiry-delivery acceptance or enablement authorized. |
| New production activation | BLOCKED | Requires all applicable gates and a separate explicit owner approval. Existing active deployment left unchanged. |

Browser, PDF, Excel and package checks must be assessed from their actual final receipts. Incomplete or failed checks remain incomplete or failed; this matrix does not override them.
