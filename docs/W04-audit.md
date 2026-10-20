# W04 — Existing architecture audit and decisions

## Baseline recorded before implementation

Verified starting commit: `2e9431813ad9f5337c3c445117ad0281168175fc`.

React 19 / React Router 8 / Vite 8 render all public pages in the browser using `createRoot`. `index.html` contains one generic title, description and social metadata; route-specific metadata is installed by `RouteEffects` after JavaScript runs. Eleven public paths are supported: homepage, About, Products, five product details, Manufacturing, Industries and Contact. Query parameters on Contact select the inquiry category. No production origin or canonical domain is configured.

ASP.NET Core .NET 10 maps static assets, controllers and the inquiry API, then `MapFallbackToFile("/index.html")` returns the SPA shell for otherwise unmatched paths. Unknown API paths have a dedicated JSON 404 boundary, but unknown frontend paths return HTTP 200. Publishing runs the frontend production build through the JavaScript project reference and includes `dist` assets. Debug builds do not rebuild the frontend. There is no runtime Node service.

Baseline frontend output: main JS 309.58 KB / gzip 96.36 KB, CSS 23.76 KB / gzip 5.54 KB. All page components are eagerly imported. Brochure JPEG assets are already modest (about 9–28 KB each); hero is 15.56 KB. Images have explicit dimensions and lazy loading except the eager high-priority homepage hero and product detail visual. Google Fonts loads two families with multiple weights and display=swap. No route splitting or server-side rendered page content exists. Scroll-reveal CSS depends on the browser effect to expose some content. W03.1 local lab Lighthouse measured Home 90 / Contact 91 performance; these historical scores are context, not W04 production measurements.

Production config permits all hosts and redirects HTTPS but has no explicit trusted-proxy configuration, HSTS setup or global security headers. Static delivery uses .NET static assets. No CORS expansion exists. W03 enforces same-origin JSON inquiry submission, bounded input, validation, throttling, process-local idempotency, safe logs and disabled-by-default production SMTP. Development file delivery refuses production. These controls must be retained.

## Rendering options

| Option | Fit and trade-off |
| --- | --- |
| Build-time prerendering of the supported route list | Reuses React components and existing .NET hosting, produces meaningful static HTML without a Node production runtime. New public routes need registration and a rebuild. Preferred for the finite corporate site. |
| Runtime SSR | Would add a rendering runtime/service and request-time integration for pages with little dynamic content. More deployment and operational complexity than this site requires. |
| Keep client rendering with metadata improvements | Least build change, but leaves meaningful initial content dependent on JavaScript and cannot satisfy initial-response metadata/content as well. |

Implementation decision and measured results will be appended after checking current official APIs and validating the build. No framework migration or management system is planned.

## Chosen implementation and measured bottlenecks

A fresh unchanged baseline publish on local Kestrel scored **90 Performance / 100 Accessibility / 100 Best Practices / 100 SEO**, with CLS 0. Lighthouse identified about **1,590 ms** render-blocking savings and **43 KiB** unused JavaScript. The external Google Fonts stylesheet took about 400 ms in the recorded network trace, followed by about 61 KB of two font files. The implementation self-hosts the exact font binaries used by that trace, preloads them, keeps display=swap, and includes both OFL licenses. Existing Latin typography is preserved and third-party font requests are eliminated.

Build-time React `renderToString` reuses the existing synchronous route tree through `StaticRouter`. Vite builds a temporary server entry solely for the generation step; only static pages, client assets and a public route manifest are published. Normal no-query pages hydrate. Query-bearing URLs mount from their live URL to preserve Contact preselection without hydration mismatches. That exception trades a small mount cost for correct query-driven content without request-time SSR. Initial HTTP content describes the base Contact page, with a query-free canonical URL. No customer data is rendered into initial HTML.

Prerendered inquiry controls are disabled until client activation, with a POST action and a no-JavaScript contact notice; this prevents accidental GET submission of customer fields without JavaScript. Reveal content is visible without JavaScript. Route changes update metadata and configured canonical/social URLs.

Route splitting was evaluated against a finite set of synchronous small marketing pages, shared catalog data and an approximately 97 KB gzip main bundle (much is React/Router runtime). It is deferred in this milestone: asynchronous routes would require streaming prerender and additional transition/hydration handling, while initial crawlable HTML and eliminating the measured blocking fonts provide the larger direct gain. JPEGs are already 9–28 KB, visually sourced from a low-resolution brochure; originals and existing quality are preserved rather than introducing a new image toolchain for marginal byte savings. No image enlargement or unsupported source-quality claims were added. Image dimensions, high-priority hero/detail loading and lazy lower images are retained. Baseline unused-CSS audit passed, so no broad CSS removal was attempted.

The .NET host dispatches only manifest-listed pages as HTML 200; unknown routes return a prerendered HTML 404, while assets, API and reserved management/admin paths never get the public HTML fallback. A future endpoint/controller takes precedence over this fallback. Canonical/social URL injection and sitemap generation use only validated Website:PublicOrigin, never the request Host. Without it, pages/robots are non-indexable and sitemap returns 503. Production defaults permit only local hosts until explicit launch configuration is supplied.

Security additions include HTTPS redirection before content, HSTS over HTTPS, a same-origin CSP compatible with local fonts and normal external anchor navigation, nosniff/frame/referrer/permissions headers, explicit optional trusted proxy IPs with one hop and no forwarded-host trust, and rejection of the trust-all environment shortcut. Compression excludes inquiry API responses; versioned assets get immutable caching, HTML is revalidated. Existing W03 API controls and disabled SMTP defaults remain intact.

Official references consulted: [Vite SSG](https://vite.dev/guide/ssr#pre-rendering-ssg), [React renderToString](https://react.dev/reference/react-dom/server/renderToString), [ASP.NET trusted proxies](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer?view=aspnetcore-10.0). Rendering and hosting behavior is verified below by build, HTTP tests and actual browser checks, rather than assumed from these references.

## Final local measurements and asset provenance

Final mobile Lighthouse 13.5.0 runs on the published HTTPS artifact score 98 Performance for Home and 99 for catalog, bucket detail and Contact, with 100 Accessibility / Best Practices / SEO throughout, with CLS 0 on all four. These are local lab results. The first catalog audit identified a skipped heading level; a visually hidden section h2 fixes the semantic hierarchy without changing the layout. Main JS is 311.22 KB / gzip 96.87 KB (about 0.5 KB gzip above baseline for activation/SEO logic), CSS 24.11 KB / gzip 5.65 KB. Initial content and font discovery, rather than a claimed bundle-size reduction, account for the measured gain.

Font binaries match the baseline Google Fonts network URLs: [DM Sans](https://fonts.gstatic.com/s/dmsans/v17/rP2Yp2ywxg089UriI5-g4vlH9VoD8Cmcqbu0-K6z9mXg.woff2), [Manrope](https://fonts.gstatic.com/s/manrope/v20/xn7gYHE41ni1AdIRggexSvfedN4.woff2). Their [DM Sans OFL](https://github.com/google/fonts/blob/main/ofl/dmsans/OFL.txt) and [Manrope OFL](https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt) notices are preserved in public/licenses and shipped with the artifact. No font/image package was added.

The existing floating SpaProxy tooling dependency is pinned to **10.0.13**, the exact version resolved and tested during W04, so a later clean restore cannot silently select another 10.x prerelease. No new runtime package was introduced.
