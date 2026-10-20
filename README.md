# Unique Plastic Industry — public website

Corporate portfolio for Unique Plastic Industry, a plastic packaging manufacturer in Karachi established in 2018. W03 adds a real inquiry API and quotation-request form to the public pages on the React 19 / Vite 8 / ASP.NET Core (.NET 10) foundation. No management system, authentication, database or payment features are included. Production inquiry delivery requires configuration; see [W03 inquiry operations](docs/W03-inquiries.md).

## Setup and local development

Prerequisites: Node compatible with Vite 8 and Vitest 5 (verified with Node 26.4.0), npm, .NET 10 SDK. Visual Studio can use the existing JavaScript/ASP.NET workloads and `UPMS.slnx` launcher.

From `upms.client`:

```powershell
npm ci
npm run dev
```

Development uses `https://localhost:58500` with the existing .NET development certificate export. If needed, trust your own developer certificate with `dotnet dev-certs https --trust`. The existing weather proxy defaults to `https://localhost:7081`. Stop Vite before running `npm ci` on Windows to avoid locked native modules, then restart it.

From the repository root:

```powershell
dotnet restore
dotnet run --project UPMS.Server --launch-profile https
```

The existing Visual Studio SPA proxy and development HTTPS configuration are preserved. W03 adds `/api/v1/public/inquiries`, protected delivery handling and a development file outbox; the existing SPA integration remains in place.

## Build, test and publish

From `upms.client`:

```powershell
npm run build
npm run lint
npm test
npm run test:watch
npm run preview
```

From the root:

```powershell
dotnet restore
dotnet build
dotnet test UPMS.Server.Tests
dotnet publish UPMS.Server -c Release -o ./artifacts/publish
```

The existing JavaScript SDK project reference builds and packages `upms.client/dist` into the published server's `wwwroot`. No manual copy or new publish target is required. Run frontend builds and publishing sequentially because they share the same output. Serve the published app with ASP.NET Core; its existing `MapFallbackToFile` handles extensionless page routes. Other static hosting must rewrite page requests to `index.html` while serving asset/API paths normally. Deploy at the domain root unless a basename and Vite base are configured together.

## Routes and architecture

- `/`: established homepage with corrected category presentation and navigation.
- `/about`: company history, capabilities, quality approach and values.
- `/products`: five-category catalog, text search, packaging-type filter and empty-state recovery. Search/filter state is kept in query parameters for sharing and history restoration.
- `/products/buckets`, `/products/cans`, `/products/jars`, `/products/containers`, `/products/custom`: category details, supported metadata, inquiry brief and category-specific email links.
- `/manufacturing`: molding, design, raw materials, samples, delivery and service.
- `/industries`: lubricant/oil, chemical and industrial/commercial applications, without customer logos or endorsements.
- `/contact`: validated quotation-request form with category preselection, backend-confirmed handoff, accessible failure states, and direct phone/email/map alternatives. Production delivery is disabled until SMTP is configured.
- Unknown page/category paths: consistent 404 view and `noindex,follow` metadata. URLs use lowercase paths; path matches are case-sensitive. The SPA fallback returns HTTP 200 for extensionless unknown URLs; the 404 is rendered client-side.

React Router declarative BrowserRouter provides path URLs and browser history. Already-shared W01 root hash links (`/#/products/cans`) are converted to path URLs on initial load. Vite development/preview and a real local .NET publish were checked for nested-route support.

- `src/components/layout`: shared header, responsive keyboard navigation and footer.
- `src/components/ui`: breadcrumbs/page hero, reusable product card/visual and icons.
- `src/components/sections`: shared contact CTA.
- `src/pages`: complete public page components and 404.
- `src/data/company.js`, `src/data/pages.js`: business details, category metadata, page descriptions, process and industry content.
- `src/styles/site.css`: W01 design tokens/layouts. `pages.css`: internal-page layouts and mobile refinements.
- `src/App.jsx`: route definitions, page metadata, route focus/scroll and lightweight reveals. Query-only filter updates preserve input focus. Reduced-motion preferences remain respected.

## Testing and evidence

Vitest, jsdom and React Testing Library provide route, catalog, product-selection, unknown-route, menu, metadata and basic focus/semantic tests. `npm test` is a single-run command; no second unit-test framework was added.

`upms.client/scripts/browser-smoke.mjs` exports `runBrowserSmoke` and `runBrowserInteractions` for the Codex CUA browser runtime. Pass a connected tab, its browser viewport capability and the local base URL. These repeatable tests cover six widths, all public routes, internal targets, mobile navigation, search/filter recovery, refresh, legacy links and history. They require the connected browser tool and are separate from the jsdom tests; there is no claimed headless-browser CI job.

See [W02 audit](docs/W02-audit.md), [verification](docs/W02-verification.md), [browser results](docs/W02-browser-results.json) and [Lighthouse summary](docs/W02-lighthouse-summary.json). Completed-page screenshots are under `docs/screenshots/w02`. W01 evidence remains under `docs/W01-verification.md` and the original screenshot paths.

## Assets and content provenance

Supplied brochure: `upms.client/src/assets/UNIQUE COMPANY MOCKUP.pdf`. Official extracted logo: `src/assets/unique_plastic_logos_hd/unique_plastic.svg`. Alternative supplied logos remain untouched locally. Unique Plastic Industry is the only company represented by the website. Z.A Khan Packages and Unique Lubricants must not appear as affiliated companies, subsidiaries, sister companies, independent website brands or alternate identities. Lubricant packaging remains a manufactured-product category. This mandatory constraint applies to all future milestones; see `AGENTS.md`.

JPEG derivatives in `src/assets/products`:

- `hero.jpg`: page 5, cans and bucket; company/hero illustration.
- `buckets.jpg`, `cans.jpg`: page 3.
- `jars.jpg`: page 2, smaller containers.
- `containers.jpg`: page 5, grey/yellow/black bucket group; added in W02 to distinguish the category card from the hero.
- `manufacturing.jpg`: page 4, machinery illustration, explicitly labeled as brochure imagery.

Custom Packaging has a labeled CSS/SVG design treatment rather than duplicated photography. Brochure illustrations do not establish factory ownership or current product availability. Only 8L/10L/14L/20L bucket capacities are published. Small-container weight labels are not converted into capacities. No material grades, color availability, prices, certifications, workforce/facility sizes or numerical achievements are inferred.

## SEO and remaining publication inputs

Page and category titles, descriptions and Open Graph text are updated client-side. Native headings, breadcrumbs, image alternatives, visible focus and a skip link support accessibility. Google Fonts supplies Manrope and DM Sans with system fallbacks; early stylesheet discovery and preconnect hints reduce the font request chain.

The current SPA is sufficient for interactive navigation but client-rendered metadata is not a guarantee of indexing or social-preview rendering. Non-JavaScript crawlers receive the shared HTML metadata. Consider static prerendering or SSR before a broader search/social launch; neither is implemented or verified here. Unknown routes are client-side soft 404s. No canonical production domain or social-sharing image is fabricated.

Still needed: high-resolution product originals, verified factory photography, approved client branding/permission if a showcase is desired, verified specifications for non-bucket categories, and production domain/social assets. Brochure crops remain provisional. W03 provides a validated inquiry backend with configurable SMTP; production relay credentials, approved sender/recipient and delivery verification remain deployment dependencies.

## Milestone boundaries

W03 completes customer inquiry intake on the public company portfolio. Future sales, inventory, vendor/customer records, authentication, accounting and ledger workflows must remain separate from public website components. Stop after W03 until reviewed; do not begin W04 automatically.

## W03 inquiry workflow

The contact form posts to the same-origin `/api/v1/public/inquiries` endpoint. Development explicitly saves to a private local file outbox; Production defaults to disabled and cannot report a simulated success. SMTP handoff is replaceable via `IInquiryDelivery`. Successful SMTP acceptance is distinguished from inbox receipt. No durable production queue or management database was introduced.

See [API/configuration/security documentation](docs/W03-inquiries.md), [verification](docs/W03-verification.md), [changed-file manifest](docs/W03-files.txt) and `UPMS.Server.Tests` for backend coverage. Frontend tests also cover duplicate protection, failure-state drafts, category preselection and timeouts.
