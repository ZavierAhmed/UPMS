# Official GoDaddy deployment requirements audit

Review date: 2026-10-26. Baseline: `d2e4fdf991aaf4bd35655fc8a1abff48e365f641`; fetched remote baseline matches. Untracked owner assets are preserved.

Source: [GoDaddy's official ZIP deployment guide](https://www.godaddy.com/en-ph/help/upload-my-ai-generated-app-to-godaddy-nodejs-hosting-42987), retrieved 2026-10-26. The seven categories below are assessed against the actual packaged release. Documentation is a requirement source, not proof that UPMS has executed on GoDaddy.

## Artifacts inspected

- Latest existing management ZIP: `upms-godaddy-cpanel-node22.zip`, source `8f8ec76350c7b11f91091bd8928ecfd49196f315`, 1,796,759 bytes / 232 files. Root package is valid ESM, main/start target the persistent blocked Express preview, and build verifies release hashes. It also contains all 111 public website build files, includes migration tooling, and rejects injected DB_PASSWORD at startup.
- `upms-godaddy-db-diagnostic-node22.zip` is CLI-only and its start refuses a server. It is **not applicable as a management upload**.
- Latest one-shot artifact, `upms-godaddy-controlled-diagnostic-node22.zip`, source baseline above, is an exiting diagnostic. It is **not a persistent management deployment**. It remains blocked on a supported private one-time execution contract; its startup is not reused here.
- The repository root's development/build project is not the uploaded artifact. Its source build scripts remain unchanged.

## Seven-category decision

| Requirement | Classification | UPMS result / correction |
| --- | --- | --- |
| 1. Root package metadata and entry | Already satisfied in prior management release; entry changed | Valid `upms` / `1.0.0`, ESM, Node `^22.23.4`, main points to existing `server/src/godaddy/management-index.js`. Package is at ZIP root, not nested. |
| 2. Production build/start | Changed | Build retains packaged hash verification and supports a management-only manifest. Start launches a persistent production Express disabled-preview server, not Vite, development mode or diagnostics. |
| 3. Assigned port | Changed | New fixed entry requires canonical PORT 1–65535, binds 0.0.0.0, supports restart and graceful shutdown. No development-port fallback. Health truthfully reports blocked/unconnected/operational false. Local lifecycle checks are not hosted acceptance. |
| 4. Production dependencies | Already satisfied; packaging tightened | Runtime dependencies stay in dependencies. Dev dependencies and exclusively dev lock entries are omitted; retained type-peer metadata is normalized without version/integrity changes so the provider install preserves the hashed lockfile. Clean Node 22 production install, native Argon2 fixture and runtime import verification are required; no node_modules upload. |
| 5. Private environment | Changed for disabled startup; operational DB still blocked | New disabled mode tolerates but never uses injected DB values. Exact origins/hosts and proxy checks remain; no DB adapter, sessions, queries or diagnostics are activated. Existing operational hostname/schema/identity/TLS/grant gates are unchanged. |
| 6. Vite | Prebuilt interface already satisfied; dev/preview host rewriting not applicable | Built management HTML/JS/CSS is included. No Vite runtime. Express's explicit hostname policy stays strict. Only known management deep links serve the disabled shell. Public website build files are excluded. |
| 7. Artifact size/exclusions | Already under limit; scope corrected | New ZIP must remain below 100,000,000 bytes. Deterministic manifest/SHA256; no caches, databases, logs, credentials, fixtures, PDFs, recovery archives or unrelated artifacts. |

Actual ZIP size, exact package.json, checksum, source SHA and machine verification are recorded in the adjacent release receipt. [Verification results](GODADDY-DEPLOYMENT-COMPLIANCE-TESTS.md) distinguish local success from provider observations.

## Persistent server and database decisions are separate

The new artifact is **DISABLED MANAGEMENT PREVIEW — NOT PRODUCTION READY**. It serves no business data or usable posting interface. It contains the unchanged management bundle/backend source so accepted returns, inventory, ledgers, payments, exports and authentication implementation are preserved for future reviewed activation; it does not expose those operations now. There are no public website pages/assets, migration tools, one-shot runners or HTTP diagnostics in this artifact.

The provider-injected five database variables do not prove compatibility. Authenticated database TLS, accepted engine/version, observed identity, restricted grants, independent staging, migration authorization, restoration, openings and cutover all remain blocked pending review. A successful HTTP startup only verifies the disabled process. See [remaining blockers](GODADDY-REMAINING-BLOCKERS.md).

The guide's optional persistence location must not be used for private run markers, logs, backups or credentials. No such files are written by this release. One-shot diagnostics remain separately blocked; no listener disguise, automatic migration, sleep loop or restart workaround was introduced. No GoDaddy deployment, publication or DNS change was performed.
