# Unique Plastic Industry — UPMS

W05 migrates the public website backend to Node.js 24 LTS and Express. The W04 React/Vite design, public routes, approved assets, accessibility and build-time prerendering remain intact. Unique Plastic Industry is the only represented company. No Phase 2 management system, database or authentication is implemented.

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

## Architecture

- `server/src/app.js` composes Express without opening a listener; `index.js` validates startup, binds PORT on 0.0.0.0 and handles shutdown.
- `config`, `middleware`, `inquiries` and `website` separate configuration, host/proxy/security, delivery/retries and prerender/static serving.
- Root package.json/lockfile own backend runtime and test dependencies. `upms.client` retains its own package/lockfile and all existing frontend tests.
- `upms.client/src/data/publicRoutes.js` and `scripts/prerender.mjs` generate eleven page documents plus a 404 page. A production request never requires React SSR or another Node process.
- APIs and assets share one application origin. Only approved static prefixes/files are served. Unknown public URLs return real 404s; API unknowns return structured JSON.

## Operations and milestone records

[W05 deployment/environment guide](docs/W05-hostinger-deployment.md), [migration audit](docs/W05-migration-audit.md), [parity gate](docs/W05-node-parity.md), and [verification](docs/W05-verification.md) record architecture, commands, security, SMTP, future MySQL guidance, rollback and remaining blockers.

**Hostinger Premium is not verified as eligible:** official documentation currently lists managed Node apps on Business/Unlimited and Cloud. Account eligibility, proxy behavior and SMTP connectivity must be resolved before deployment. No external deployment, live credentials or sender activation was performed. Production requires explicit ALLOWED_HOSTS and NODE_ENV=production; consult `.env.example` and the deployment guide.

Historical W01–W04 documents and screenshots remain under `docs`. The complete old backend remains at W04 commit `bfb28d318939b33e1edd2d76613cc2f4353ba8ba` for rollback/reference; those historical .NET setup instructions no longer describe the current application. User-provided brochures and unused logos remain source material and are not publication approval.
