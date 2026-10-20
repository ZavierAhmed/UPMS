# UPMS W03.1 — WhatsApp contact verification

Starting SHA: `6a8d10bc2b93fa6c8cc90f3c961b010125eca1c6` (verified W03 tip after fetching origin).
Branch: `feature/upms-w03-1-whatsapp`. No merge. W04 is outside scope.

## Implementation

One canonical number in `upms.client/src/data/company.js`, one URL builder in `src/utils/whatsapp.js`, one reusable local SVG, and one shared floating anchor in `App.jsx`. All five product detail pages add an outlined secondary WhatsApp CTA with the existing data title. The original inquiry CTA and category query parameters are retained. Contact adds a WhatsApp method with the configured international number. See the frontend README for configuration and behavior.

The floating link is 56 × 56 CSS pixels, green #25D366, safe-area aware, fixed, labeled, and secured with `target="_blank"` and `rel="noopener noreferrer"`. Keyboard focus is visible; reduced motion disables its transition. A container gutter reserves the action area without changing full-bleed backgrounds. The shared component sits below the header/navigation and modal layers. No dependencies, backend code, credentials, or automatic messaging were added.

## Automated verification

- `npm ci`: passed; 0 vulnerabilities.
- `npm run build`: passed.
- `npm run lint`: passed.
- `npm test`: 71 tests passed, including 19 WhatsApp tests and existing inquiry/route regressions.
- `dotnet restore`: passed.
- `dotnet build`: passed, 0 warnings / 0 errors.
- `dotnet test UPMS.Server.Tests --no-build`: 34 passed.
- `dotnet publish UPMS.Server -c Release -o tmp/w03/w031-publish`: passed for production-host verification.
- `git diff --check`: passed.

A running Debug server was stopped to release its executable for the build. Verification used an isolated published DLL, not the Debug executable. Temporary verification servers were stopped afterward.

## Actual browser verification

The CUA browser checked the production-built frontend in Vite preview on port 5185, then the published ASP.NET host on port 5186 for inquiry behavior. All 11 established routes were checked at 360, 390, 768, 1024, 1440 and 1920 CSS pixels (66 combinations). Each check asserted the actual viewport width, no document overflow, one floating action within the viewport, and no intersecting visible control. The action stayed fixed and visible after scrolling to the Contact page bottom at all six widths, without control overlap. Desktop product actions sit side by side and mobile actions wrap. Keyboard focus was visually inspected for both actions.

All five product routes produced the exact structured-title draft and navigated through their original inquiry CTA to the correctly preselected category. On published hosting, blank-form validation worked; a synthetic valid inquiry received the expected disabled-delivery response and retained its draft. No WhatsApp destination was opened and no real WhatsApp message or external email was sent. Normal WhatsApp application/web fallback is delegated to the HTTPS wa.me link; device app handoff was not exercised.

Evidence: [browser results](W031-browser-results.json), [mobile screenshot](screenshots/w031/product-mobile.jpg), [desktop screenshot](screenshots/w031/product-desktop.jpg).

## Lighthouse

Mobile Lighthouse 13.5.0 on the published ASP.NET host:

| Page | W03 performance | W03.1 performance | Accessibility | Best practices | SEO |
| --- | ---: | ---: | ---: | ---: | ---: |
| Contact | 91 | 91 | 100 | 100 | 100 |
| Home | 87 | 90 | 100 | 100 | 100 |

No unexpected performance regression; scores vary between runs. [Structured results](W031-lighthouse-summary.json). Initial Vite-only preview scored SEO 92 because preview returns the SPA HTML for robots.txt; published ASP.NET hosting supplies the existing correct robots response and scores 100. No unrelated SEO changes were made.

## Delivery and limits

Only Unique Plastic Industry is represented. User-supplied untracked source/logo assets were preserved and excluded from the commit. No generated build outputs or credentials are included. The existing production SMTP configuration requirement remains unchanged. WhatsApp account availability and device handoff are managed by WhatsApp; visitors must review and send the draft themselves.
