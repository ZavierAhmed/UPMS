# W02 verification and delivery

Baseline and branch audit was written before implementation in [W02-audit.md](W02-audit.md). Starting SHA: `7a696c5c5fd5cef8abb4c8963f769467ee459f3a`. Branch: `feature/upms-w02-public-pages`. Final SHA is supplied in the delivery message and Git history (not embedded in its own commit).

## Implemented corrections

Removed the inactive hero counter. Renamed Our Clients to Industries We Serve. Replaced the duplicate Custom Packaging image with a labeled design illustration and gave Industrial Containers its own page-5 brochure crop. Replaced previews with complete public pages and five category detail views. Added path routing, breadcrumb links, category-specific titles/descriptions, client-side sharing metadata, route focus handling and consistent unknown-route views. Legacy root hash links continue working on initial load.

The catalog has meaningful text search and two packaging-type groups across the five available categories. It publishes supported bucket capacities only, with other specifications discussed by inquiry. Contact provides working destinations and an address map search; no form or backend workflow is simulated.

## Commands and outcomes

Environment: Windows; Node 26.4.0; .NET SDK 10.0.401. Commands below are actual runs.

| Working directory | Command | Final result |
| --- | --- | --- |
| Root | `git fetch --all` | Passed; W01 remote baseline unchanged. |
| `upms.client` | `npm ci` | Passed; 210 packages added, 211 audited, zero reported vulnerabilities. |
| `upms.client` | `npm run build` | Passed; Vite 8.3.4. Main JS 299.60 kB / gzip 92.77 kB, CSS 20.69 kB / gzip 4.81 kB. |
| `upms.client` | `npm run lint` | Passed. |
| `upms.client` | `npm test` | Passed; 28 tests in one suite. |
| Root | `dotnet restore` | Passed; projects up to date. |
| Root | `dotnet build` | Passed; zero warnings and errors. |
| Root | `dotnet publish UPMS.Server -c Release -o tmp/w02/publish` | Passed; existing SDK packaged the frontend into wwwroot. No backend/publish source changes needed. |
| Published directory | `dotnet UPMS.Server.dll --urls http://localhost:5182` | Started in Production; used for browser and Lighthouse checks. |
| `upms.client` | `npm run dev` | Started on original HTTPS port 58500 after verification. |

Resolved verification interruptions: npm ci initially hit EPERM because an existing Vite process held the native bundler DLL; the identified repository server was restarted and clean installation passed. A font-import edit was caught by the build and corrected. A publish overlapping a frontend build hit a shared-output file lock; sequential publishing passed. These are not unresolved failures.

## Automated test coverage

28 Vitest/jsdom tests cover the six main routes; five category selections/titles/capacities/inquiry destinations; catalog links, filtering, shared query state, empty-state recovery and input focus; unknown and extra-segment routes including case mismatches; mobile menu toggle/Escape/route selection; main focus, skip navigation, metadata, active-page indication and real contact links. Layout/IntersectionObserver are not simulated as proof of browser behavior.

Dependencies added: runtime `react-router` 8.5.0 for conventional URLs/history; dev `vitest` 5.0.5, `jsdom` 30.1.3 and `@testing-library/react` 16.3.3 for a single focused frontend testing stack. No animation, global-state or backend dependency was added.

## Actual browser checks

The final published build was exercised through the connected in-app browser using the repeatable harness `upms.client/scripts/browser-smoke.mjs`:

```javascript
const checks = await import('file:///ABSOLUTE_REPO_PATH/upms.client/scripts/browser-smoke.mjs');
const layout = await checks.runBrowserSmoke({tab, viewport, baseURL:'http://localhost:5182'});
const interactions = await checks.runBrowserInteractions({tab, viewport, baseURL:'http://localhost:5182'});
```

`tab` is a CUA browser tab and `viewport` is that browser's documented viewport capability. The harness deliberately does not install a second browser driver or claim to run under npm test.

- 66 layout/semantic checks passed: 11 public routes × 360/390/768/1024/1440/1920px. No measured horizontal overflow, no broken loaded images, one H1 on each page and main focus after navigation.
- All unique internal link destinations collected across those pages resolve to the public route list.
- 12 interaction checks passed: menu open/Escape/selection/close, zero search results, clear recovery, custom filter, detail refresh, back/filter restore, forward/detail restore, unknown-route view and W01 hash-link migration.
- Independently opened the real HTTPS development URL `https://localhost:58500/products/cans` and confirmed the category rendered with its title.
- Direct HTTP requests to published `/about`, `/products/cans`, `/manufacturing`, `/unknown/deep` returned the SPA shell with HTTP 200; the unknown route renders an in-app 404 and noindex metadata. Development direct-route HTTP response was also 200.
- Reviewed desktop full-page captures for all completed informational pages and the catalog; inspected mobile catalog/contact captures and viewport screenshots during responsive checks. This supplements the DOM measurements and is not an exhaustive assistive-technology audit.
- Map/email/phone destinations were inspected; no email was sent and no phone call was placed.

Machine-readable evidence: [W02-browser-results.json](W02-browser-results.json).

Screenshots in `docs/screenshots/w02`: `about-desktop.png`, `about-mobile.png`, `products-desktop.png`, `products-mobile.png`, `manufacturing-desktop.png`, `manufacturing-mobile.png`, `industries-desktop.png`, `industries-mobile.png`, `contact-desktop.png`, `contact-mobile.png`, `product-detail-desktop.png`, `home-desktop.png`.

## Lighthouse

Lighthouse 13.5.0 ran against the final locally published homepage in installed Chrome 155, mobile form factor with simulated throttling. Command from repository root (CHROME_PATH set to the installed Chrome executable):

```powershell
npx --yes lighthouse http://localhost:5182/ --output=json --output-path=tmp/w02/lighthouse-home-final.json --only-categories=performance,accessibility,best-practices,seo --chrome-flags='--headless=new' --quiet
```

Final scores: Performance **89**, Accessibility **100**, Best Practices **100**, SEO **100**. FCP 2.9s; LCP 3.1s; TBT 0ms; CLS 0; Speed Index 3.2s. No run warnings. Summary: [W02-lighthouse-summary.json](W02-lighthouse-summary.json). The raw local report is in ignored `tmp/w02`.

The first run measured 85/96/100/100 and identified the custom-card number contrast and logo accessible-name mismatch. Both were fixed; early font discovery/preconnect was also added. The final run reflects those changes. These are one-page local lab results, not production field data or proof that all accessibility/SEO needs are met. Remaining opportunities include external-font latency, unused initial JavaScript and image delivery.

## SEO, source and deployment limitations

The app updates titles/descriptions/OG text in JavaScript. Non-JavaScript/social crawlers receive shared initial HTML. Static prerendering or SSR should be evaluated before a wider search/social launch; none was implemented. Unknown routes are HTTP-200 soft 404s, with client-side noindex; server-side route-aware status/metadata is a future architectural option. No invented production domain/canonical URL is published.

Brochure crops are provisional; factory illustration is not verified facility photography. Required company inputs remain original high-resolution product/factory photos, verified non-bucket specifications, approved client material if a showcase is desired, and production-domain/social assets. There are no unresolved build blockers. W02 adds no commerce, authentication, database, inventory, accounting or management feature.

Primary documentation consulted: [React Router declarative installation](https://reactrouter.com/start/declarative/installation), [routing](https://reactrouter.com/start/declarative/routing), [Vitest guide](https://vitest.dev/guide/), [React Testing Library setup](https://testing-library.com/docs/react-testing-library/setup/), [ASP.NET Core SPA architecture](https://learn.microsoft.com/en-us/aspnet/core/client-side/spa/intro?view=aspnetcore-10.0). Actual installed API behavior was verified by builds, tests and the published application.

Stop after W02; no master merge or W03 work is included.

Complete changed-file manifest: [W02-files.txt](W02-files.txt). No generated build directories, secrets, or alternative user-supplied logo assets are staged.
