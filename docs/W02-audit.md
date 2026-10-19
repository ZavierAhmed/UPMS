# W02 — baseline audit

Audited before implementation on 2026-10-19. Fetched all remotes. Both local W01 and origin W01 resolve to `7a696c5c5fd5cef8abb4c8963f769467ee459f3a`. W02 starts from this commit on `feature/upms-w02-public-pages`, not master. Nine pre-existing untracked alternative logo files remain untouched.

## W01 deviations and W02 corrections planned

- Home hero displays `01 / 05` without a carousel: remove it.
- Our Clients links to industries without an approved client showcase: rename navigation to Industries We Serve.
- Custom Packaging duplicates the buckets image; Industrial Containers repeats the hero montage: use distinct brochure crops for evidenced categories and an explicitly illustrative design treatment for customization.
- Hash-only routing lacks conventional URLs; detail titles repeat the generic product-range title: evaluate BrowserRouter against Vite history fallback and ASP.NET MapFallbackToFile, then centralize route metadata and exact unknown-route handling.
- About, catalog, manufacturing and industries are preview placeholders: replace with source-grounded content and meaningful cross-links.
- Contact is only a generic CTA: provide full business details, map link, inquiry guidance and direct actions, without a submission form.
- No automated tests existed; add one focused React testing stack for routes, product selection, filtering, unknown routes, menu and focus/metadata behavior.
- Metadata is mostly static; add per-route descriptions and sharing metadata, while documenting client-rendering/SEO limitations.
- W01 browser evidence covers homepage widths and a subset of links; expand to all public pages, direct loading, history, refresh and link validation.

## Sources and boundaries

Use only the supplied `src/assets/UNIQUE COMPANY MOCKUP.pdf`, the extracted official Unique Plastic SVG and derivative brochure crops. The brochure was visually inspected during W01 (pages 2–5 for company, products, manufacturing and service; page 6 for contacts). No customer branding or lubricant product endorsements are authorized. No operational management features belong to this milestone.

## Routing evaluation

React Router declarative mode fits the existing React/Vite app. Vite provides SPA history fallback in development/preview. The server already maps extensionless paths to index.html, but deployment must actually publish the client build into wwwroot. Verify a published .NET build with direct nested-route requests before delivery. No SSR or framework migration is needed for navigation. Static prerendering/SSR remains an SEO consideration, not an implemented or tested guarantee.
