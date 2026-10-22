# Unique Plastic Industry — UPMS

W05 migrates the public website backend to Node.js 24 LTS and Express. The W04 React/Vite design, public routes, approved assets, accessibility and build-time prerendering remain intact. Unique Plastic Industry is the only represented company. The opt-in private workspace now includes identity, business masters and gated inventory, purchasing and vendor-account workflows.


P2.1A adopts the existing XAMPP MariaDB engine for local development. Current restricted-account provisioning and acceptance gates are recorded in [the P2.1A summary](docs/phase2/P2-1A-executive-summary.md).

## Run locally

Use Node 24 LTS and npm. From the repository root:

```sh
npm ci
npm ci --prefix upms.client
npm run build
npm start
```

Open http://localhost:3000. Delivery is Disabled by default. An unconfigured public origin deliberately disables indexing; sitemap returns 503 until the real HTTPS origin is configured. No .NET runtime or Visual Studio is needed.

For frontend hot reload, run `npm run dev` in the root and `npm run dev --prefix upms.client` in another terminal. Vite listens on http://localhost:58500 and proxies API requests to port 3000. Export `INQUIRY_MODE=DevelopmentFile` only in local development to save synthetic inquiries privately under `server/.local/inquiry-outbox`; no external email is sent. Environment files are not loaded implicitly.

## Build and verify

```sh
npm run install:all
npm run build
npm run test:backend
npm run test:frontend
npm run verify
npm run test:browser
```

Browser/Lighthouse verification requires installed Chrome and a local TLS certificate/key supplied as TEST_TLS_CERT and TEST_TLS_KEY. CHROME_PATH overrides the Windows Chrome default. The harness uses only loopback ports 7445/7446, a reserved synthetic example.test canonical origin and synthetic inquiry data. It never invokes a live sender. It writes summaries under docs and full Lighthouse reports under ignored tmp/w05. The fallback certificate path is the existing developer certificate location; creating/trusting local certificates is a developer setup task, not a production requirement. `test:parity` requires an isolated running W04 baseline, described in the parity report.

Before SQL integration or an explicitly authorized migration, run `npm run database:preflight` with the intended private connection profile in the environment. The SQL suites and migration service also enforce preflight. It rejects unavailable endpoints, nonzero InnoDB recovery mode, read-only servers, unexpected engine/schema/history and invalid runtime grants. It never starts XAMPP, restores a backup or resets database files. Runtime credentials cannot read migration tracking; the separate operator check verifies that history without granting runtime extra rights. See [the preflight workflow](docs/phase2/P2-3A-database-preflight.md). The owner-approved recovered development endpoint is 127.0.0.1:3309/upms; [P2.4 delivery status](docs/phase2/P2-4-executive-summary.md) and [handoff/rollback](docs/phase2/P2-3B-main-handoff-plan.md). Operational stock, purchasing and financial activation remains pending explicit owner policies and verified starting states.

## Architecture

- `server/src/app.js` composes Express without opening a listener; `index.js` validates startup, binds PORT on 0.0.0.0 and handles shutdown.
- `config`, `middleware`, `inquiries` and `website` separate configuration, host/proxy/security, delivery/retries and prerender/static serving.
- Root package.json/lockfile own backend runtime and test dependencies. `upms.client` retains its own package/lockfile and all existing frontend tests.
- `upms.client/src/data/publicRoutes.js` and `scripts/prerender.mjs` generate eleven page documents plus a 404 page. A production request never requires React SSR or another Node process.
- APIs and assets share one application origin. Only approved static prefixes/files are served. Unknown public URLs return real 404s; API unknowns return structured JSON.

## Operations and milestone records

[W05 deployment/environment guide](docs/W05-hostinger-deployment.md), [migration audit](docs/W05-migration-audit.md), [parity gate](docs/W05-node-parity.md), and [verification](docs/W05-verification.md) record architecture, commands, security, SMTP, future MySQL guidance, rollback and remaining blockers.

W06 adds [current hosting compatibility](docs/W06-hosting-compatibility.md), a [GitHub/ZIP deployment checklist](docs/W06-deployment-checklist.md), [MySQL foundation planning](docs/W06-mysql-readiness.md) and [regression evidence](docs/W06-verification.md). `npm run build:hosting` installs the frontend build tools explicitly; `npm run package:deployment` creates a private prebuilt ZIP under ignored `artifacts/`. `npm run test:browser:w06` records fresh W06 evidence without replacing W05 results. No running database connection or management feature is added.

**Hostinger Premium is not verified as eligible:** official documentation currently lists managed Node apps on Business/Unlimited and Cloud. Account eligibility, proxy behavior and SMTP connectivity must be resolved before deployment. No external deployment, live credentials or sender activation was performed. Production requires explicit ALLOWED_HOSTS and NODE_ENV=production; consult `.env.example` and the deployment guide.

Historical W01–W04 documents and screenshots remain under `docs`. The complete old backend remains at W04 commit `bfb28d318939b33e1edd2d76613cc2f4353ba8ba` for rollback/reference; those historical .NET setup instructions no longer describe the current application. User-provided brochures and unused logos remain source material and are not publication approval.

## P2.1 private management identity foundation

Management is disabled by default. The separate built React entry is `/management`; protected identity APIs use `/api/v1/management`. No management scripts or records are inserted into the eleven public prerendered pages, and public inquiries retain their existing contract and disabled live-delivery configuration.

**Local development acceptance:** P2.1A provisioning and owner password rotation are complete. P2.2 adds business masters and shared transaction infrastructure through an explicit backed-up additive migration. MariaDB remains local-development-only; see the current P2.2 records below.

Read [implementation](docs/phase2/P2-1-implementation.md), [local MySQL setup and masked bootstrap](docs/phase2/P2-1-mysql-setup.md), [schema/migration recovery](docs/phase2/P2-1-schema-and-migrations.md), [authentication security](docs/phase2/P2-1-authentication-security.md), [permission/API matrix](docs/phase2/P2-1-authorization-matrix.md), [verification](docs/phase2/P2-1-verification.md) and [open risks](docs/phase2/P2-1-open-risks.md) before enabling it.

Explicit operator commands are `npm run identity:inspect`, `npm run identity:migrate`, `npm run identity:bootstrap` and `npm run identity:benchmark`. Migrations/bootstrap never run on startup. Supply private DB environment variables and exact target confirmation as documented. `npm run test:mysql` requires a separately provisioned empty `upms_test_<suffix>` schema and fails instead of silently mocking an unavailable database. `node server/tests/verify-identity-browser.mjs` uses a separate fresh test schema, installed Chrome and local TLS certificate. Existing `npm run verify` includes identity unit/UI tests and all public regressions.

The five private business references were moved outside the repository only after owner approval, with matching hashes and overwrite refusal. Unused source logos remain preserved and untracked. Local ZIP packaging includes only exact management build paths alongside the existing public runtime; it does not package operator provisioning tools, secrets or private evidence. No merge, public deployment, live email activation or P2.2 implementation was performed.

For the configured local P2.1A workspace, run `.\server\tools\Complete-UPMSLocalSetup.ps1 -ShowCredentials` to reuse setup and open the private initial-credential handoff. See [administrator setup](docs/phase2/P2-1A-administrator-bootstrap.md). The temporary password must be changed at first login.

## P2.2 business foundation

The existing private Master data workspace manages canonical inventory records, customer/vendor contacts, configurable money accounts and expense categories, document-type prefixes, periods and policy proposals with backend department permissions, audit history, optimistic versions and durable command keys. No actual stock/money posting, opening balances, historical import or automatic conversion is enabled. Existing owner credentials and sessions are preserved.

Read [P2.2 summary](docs/phase2/P2-2-executive-summary.md), [schema](docs/phase2/P2-2-business-schema.md), [migration and private backup verification](docs/phase2/P2-2-migration-verification.md), [permissions](docs/phase2/P2-2-permission-matrix.md), [tests](docs/phase2/P2-2-test-results.md) and [open decisions](docs/phase2/P2-2-open-risks.md). Operator commands in server/tools/Invoke-UPMSBusiness.ps1 are explicit and guarded; never rerun completed provisioning or restore over upms. No migration runs on application startup. Independent review is required before P2.3, merge or deployment.

## Purchasing and vendor accounts (P2.4)

The private workspace supports separate receiving/invoice evidence, vendor payables, atomic immediate payments, deferred settlements and exact money-account journals. Main remains unactivated; synthetic acceptance is not company policy approval. Read [the P2.4 summary](docs/phase2/P2-4-executive-summary.md), [migration and rollback](docs/phase2/P2-4-migration-verification.md), [acceptance results](docs/phase2/P2-4-test-results.md) and [owner decisions](docs/phase2/P2-4-open-decisions-and-risks.md). Do not reuse populated acceptance schemas or run migration/activation from startup. Independent review is required before any next milestone, merge or deployment.
