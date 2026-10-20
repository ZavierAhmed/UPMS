# W04 verification and production-readiness checklist

Starting SHA: `2e9431813ad9f5337c3c445117ad0281168175fc` (remote W03.3 tip fetched and verified).
Branch: `feature/upms-w04-production-readiness`. No merge, external deployment, DNS changes, real SMTP activation or management-system work.

## Architecture and scope

The [audit](W04-audit.md) records the existing architecture before implementation and compares SSG, runtime SSR and client-only rendering. W04 uses build-time prerendering of existing React components; no new runtime or framework migration. Eleven route-specific HTML pages, a 404 page and a generated manifest are included in the ASP.NET artifact. The manifest drives public status handling and sitemap URLs. Query-driven pages and legacy links mount from their actual URL; ordinary registered pages hydrate only when the root marker matches their path. Development shells, preview fallbacks and unknown pages mount normally. New public routes require a React route plus metadata/product registration and a rebuild. Runtime API data remains separate.

The full confirmed address, sole Unique Plastic identity, all five product categories, existing WhatsApp number/drafts, supplied Maps URL and directions coordinates are preserved. No original or untracked source image was removed. No backend inquiry contract, validation, throttling, SMTP mode or retry semantics changed. Forms use POST and prerendered controls are disabled until activation; this prevents a no-JavaScript browser from putting customer fields in a GET URL.

## Automated checks

| Command/check | Result |
| --- | --- |
| npm ci | Passed after stopping a verified repository Vite lock; 0 vulnerabilities |
| npm run build | Passed; 11 pages + 404 generated; temporary server renderer not published |
| npm run lint | Passed |
| npm test | 89 passed across 5 files; all 85 prior tests retained |
| dotnet restore | Passed |
| dotnet build | Passed, 0 warnings / 0 errors |
| dotnet test | 74 passed (34 prior inquiry tests plus 40 hosting/HTTP checks) |
| dotnet publish UPMS.Server -c Release | Passed; complete artifact verified locally |
| dotnet list UPMS.Server package --vulnerable --include-transitive | No vulnerable packages reported by configured sources |
| git diff --check | Passed |

HTTP tests exercise each route's initial title/description/social metadata/h1, safe configured canonical URLs, address/WhatsApp/Maps destinations, query refresh, HEAD, invalid methods, trailing slash, unknown paths/assets, API JSON 404 and validation, correct asset MIME/cache/compression, sitemap/robots, noindex when unconfigured, explicit host validation, HSTS, HTTPS redirection, proxy trust limits and unchanged production inquiry restrictions. A test-only future management controller proves explicit endpoints outrank the fallback; it is not part of the published application. Development HTTPS discovery has separate regression coverage.

The actual locally published HTTPS host was inspected for all eleven pages and five error classes: [HTTP results](W04-http-results.json). This confirms metadata/content in the response body, not only the browser DOM. The published output includes hashed images/scripts/styles/local fonts, eleven static pages, 404, manifest, font license notices and the generated IIS web.config. Private `.local`, `.prerender`, node_modules and unused source brochures/logos are absent. License resources are text/plain and noindex. Development-only outbox delivery cannot report success in Production (existing real-delivery tests retained).

## Browser verification

The final published artifact ran as Production on local HTTPS `https://localhost:7443`, using the already installed development certificate and explicit test-only canonical origin `https://www.example.test`. No certificate warning was bypassed. The test-only hostname is not a proposed company domain. HTTP on localhost:5190 redirected to HTTPS; no live server/DNS/SMTP was configured.

Actual CUA browser checks passed at 360, 390, 768, 1024, 1440 and 1920 CSS pixels across all eleven routes (66 checks). Checks include actual viewport width, one h1, focus, no horizontal overflow, no broken images and valid internal links. Twelve interaction checks passed: mobile menu/Escape/navigation, catalog search/clear/filter, direct detail refresh, history back/forward, 404 display and shared W01 hash links. The smoke harness now waits for the actual filter-status transition rather than racing React's scheduled update.

All five product-detail WhatsApp messages and inquiry category selections passed. On the published HTTPS site, blank validation worked and one synthetic valid submission returned the expected disabled-delivery response, explicitly stated it was not sent, and preserved its draft. Canonical/social URLs update on SPA navigation without category/search query strings. Final browser error/warning log was empty; the legacy hash activation case was specifically rechecked after fixing a hydration mismatch found during validation. No real WhatsApp message or external email was sent.

[Browser results](W04-browser-results.json) · [Desktop home](screenshots/w04/home-desktop.jpg) · [Mobile product detail](screenshots/w04/product-mobile.jpg) · [Mobile Contact](screenshots/w04/contact-mobile.jpg).

## Lighthouse local lab measurements

Mobile Lighthouse 13.5.0 on the published HTTPS host, after the catalog heading-order correction:

| Page | Performance | Accessibility | Best Practices | SEO | CLS |
| --- | ---: | ---: | ---: | ---: | ---: |
| Home | 98 | 100 | 100 | 100 | 0 |
| Product catalog | 99 | 100 | 100 | 100 | 0 |
| Plastic Buckets detail | 99 | 100 | 100 | 100 | 0 |
| Contact | 99 | 100 | 100 | 100 | 0 |

The unchanged W03.3 local baseline Home scored 90/100/100/100 with CLS 0. Prerendered content and self-hosted preloaded fonts remove the measured discovery/render-blocking chain. JS is about 96.87 KB gzip versus 96.36 KB baseline: this milestone does not claim bundle reduction. Images retain existing compressed JPEGs and quality; route splitting and new image tooling were deferred based on scope and observed results. Scores are local synthetic measurements with normal run-to-run variation; they are not real-world production performance. [Scores, times and metrics](W04-lighthouse-summary.json). Full local reports remain ignored under tmp/w04.

## Security findings and readiness checklist

**Implemented and verified**

- [x] Meaningful initial content and per-page metadata; real public/API/asset status handling.
- [x] Shared route registry, generated sitemap and safe unconfigured robots/noindex behavior.
- [x] HTTPS before content, public-host HSTS, explicit production host validation and optional one-hop trusted proxy configuration. No forwarded-host or trust-all shortcut.
- [x] Compatible same-origin CSP, nosniff/frame/referrer/permissions headers, local licensed fonts and safe external anchors. No CORS expansion.
- [x] Immutable hashed-asset caching, revalidated HTML, compression excluding the inquiry API, stable layout and preserved visuals.
- [x] All existing inquiry protections and disabled production delivery preserved; no sensitive payload logging added.
- [x] Local ASP.NET publish/runtime verification and documented IIS/generic-host deployment/rollback steps. Temporary verification servers stopped after use; Debug output left unlocked.

**Implemented but requiring live configuration/validation**

- [ ] Real approved Website__PublicOrigin and exact AllowedHosts; verify canonical, sitemap and robots on that domain.
- [ ] Production host, valid TLS certificate, DNS/bindings, private backend listener and verified proxy peer settings (if used). Actual IIS/nginx/service installation was not performed.
- [ ] Live-host browser/HTTP/security checks, Lighthouse and real-user measurements after authorized deployment.

**Blocked by unavailable company assets or credentials**

- [ ] SMTP relay credentials, approved sender/recipient and provider authentication/delivery verification. Delivery remains Disabled; the form reports unavailability honestly until a separately authorized configuration/activation.
- [ ] Approved production social-sharing image/domain inputs for richer image previews. Title/description/type/url metadata is present, but no unapproved image or domain was invented.

**Deferred enhancements**

- [ ] Route-level JS splitting/streaming rendering and additional image formats if future measurements justify the complexity.
- [ ] High-resolution product/factory photography; current approved brochure imagery remains provisional and un-enlarged.
- [ ] Durable/multi-instance inquiry delivery/idempotency, broader proxy-chain support and real-user monitoring.
- [ ] Management system/authentication/database, which remain outside this public milestone.

See [deployment guide](W04-deployment.md) for exact prerequisites, settings, checks and rollback considerations. [Changed-file manifest](W04-files.txt).
