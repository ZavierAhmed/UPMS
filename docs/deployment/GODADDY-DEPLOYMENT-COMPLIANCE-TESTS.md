# Deployment compliance verification

Date: 2026-10-26. Starting SHA: `d2e4fdf991aaf4bd35655fc8a1abff48e365f641`.

All results below are local. No GoDaddy Preview upload, platform install/build, application log, database diagnostic or business transaction was executed. The exact final source SHA/ZIP SHA256/size and verification fields are recorded in `artifacts/upms-godaddy-management-compliance-receipt.json`.

| Check | Result |
| --- | --- |
| Remote fetch/baseline | Fetched origin; requested baseline and remote branch matched |
| Node | Actual Node 22.23.4, local Windows x64 |
| Clean production install | Explicit Node 22 executable drove npm 11.17.0; npm ci --omit=dev succeeded with no engine mismatch |
| Provider-style npm install | Node 22 npm install --omit=dev also passes, preserving package/lock bytes and the subsequent integrity build |
| Native Argon2 | 0.45.1 install hook exited 0; native Argon2id hash/verify succeeded, salts differed, incorrect password rejected; randomly generated in-memory fixture, no account/credentials output |
| Runtime dependencies | All declared runtime imports load from the clean ZIP install; Vite, supertest, puppeteer-core and lighthouse absent |
| Packaged build | Existing hash verification passes for management-only manifest; deliberate asset corruption is rejected, then local fixture restored |
| Persistent start/PORT | Actual Node 22 process binds assigned test PORT on 0.0.0.0 and remains running; no hardcoded-port fallback |
| Lifecycle | Same process SIGTERM handler shuts down gracefully; separate process restart on the assigned port returns the same disabled state; occupied/invalid/missing PORT fail with safe nonzero outcomes |
| Routes/hosts | Management root/known deep links and built assets served; public website pages, source/config/manifest/private files and unknown assets denied; unknown Host rejected; untrusted/non-HTTPS request handling preserved |
| Blocked mode | Disabled form, business scripts removed from response, no session cookie; management API including finalize returns 503; no records/posting exposed |
| Health | Returns blocked / operational false / database unconnected; liveness only, no claim of database readiness |
| Credential redaction / no connection | Synthetic injected DB password/schema/URI canaries absent from logs/responses; zero connections to dummy database endpoint across startup, requests and restart |
| Backend | 258 passed, 0 failed, including existing diagnostic, security, idempotency, auth and Delivery Challan Returns tests |
| Frontend | 24 files / 185 tests passed |
| Existing V1.2B SQL payment suite | 16 passed, 0 failed |
| Existing V1.2 stock/discount/challan SQL suite | 20 passed, 0 failed |
| Frontend build / lint | Passed; existing management chunk-size warning remains |
| Public website preservation | All 111 public build files byte-identical to the prior approved public release |
| Archive | Root ESM package/main/scripts, declared production imports, CRCs, sorted SHA256 manifest and <100,000,000-byte limit verified; no public website build files, credentials, fixtures, migrations/tools, caches, PDFs or diagnostics |
| Dependency audit | Package production dependencies: zero vulnerabilities; root/frontend audit results recorded in final receipt |

The SQL suites use new local MariaDB 10.4.32 synthetic schemas/users/data in a separate workspace-owned instance, never the attached GoDaddy database or existing local/demo data. They cover authenticated operator login, native password checking, stock/discount/ledger/posting effects and durable retries. Existing test files and business logic were not changed. The disposable server is stopped after testing, with its data/evidence preserved. The separate clean-install Argon2 fixture uses the packaged identity password module and actual installed native dependency, independently of the root development installation.

Windows cannot normally deliver POSIX SIGTERM to child Node processes, so lifecycle verification uses an external test-only IPC shim to emit the registered SIGTERM event. There is no test hook or diagnostic HTTP endpoint in the package. Linux/provider signal delivery, actual GoDaddy proxy peers, hostname/health probes and target-OS native installation still require private hosted evidence.

An early install attempt used npm's PowerShell launcher, which selected Node 26 despite a PATH override. That result was not accepted as Node 22 install proof. A one-off approval flag was also rejected by npm's project-install policy before installation. The accepted clean run explicitly invoked the Node 22 executable with npm-cli.js and normal project install policy; its log records Node 22.23.4 and native install exit 0. The provider-style install also exposed npm reclassifying two retained type-peer entries after dev removal. Their packaged peer metadata was normalized without changing dependency versions or integrity hashes, then both install flows and the strict build were repeated successfully. No integrity/security check was relaxed.

## Changed files and purpose

- `server/src/godaddy/preview.js`: share the disabled renderer and add a separately validated management-only factory; preserve original preview and operational gates.
- `server/src/godaddy/management-index.js`: fixed persistent production Express startup, assigned port, safe logging and graceful shutdown.
- `scripts/check-deployment.mjs`: retain original file-integrity checks and support a management-only manifest without requiring public website routes.
- `scripts/package-godaddy-management.mjs`: build the small management-only archive and exact production metadata/lock/receipt.
- `scripts/verify-godaddy-management.mjs`: archive, dependency/native authentication, routing, lifecycle, failure and redaction verification.
- `server/tests/godaddy-management-compliance.test.js`: six focused tests for disabled mode, route isolation, host/HTTPS policy, selectors and PORT.
- Four `GODADDY-*` audit/handoff/test/blocker documents: exact release contents, honest local/hosted distinction, manual Preview steps and remaining approvals.
- `.gitignore`: exclude only this task's local test/install evidence.

The public website, accepted management frontend/business functionality, database configuration/profile/identity/TLS/grant checks, authentication/CSRF/session code, transaction journals and original CLI/one-shot diagnostic entry points are unchanged. No production readiness is inferred from these results.
