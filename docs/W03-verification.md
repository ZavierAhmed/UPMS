# W03 verification and delivery

Verified baseline after `git fetch --all`: local and remote W02 tip `d10e990da41619c2b2cd7834c4bfa7ec2e875633`. Branch: `feature/upms-w03-customer-inquiries`. `AGENTS.md` branding constraints were read and preserved. The nine pre-existing untracked alternative logo assets remain untouched. Master was not modified or merged.

## Scope completed

Contact now includes the real inquiry form, supported by `POST /api/v1/public/inquiries`. Product-detail CTAs preselect the category through the existing Contact query parameter. Required/optional fields, accessible errors, loading, confirmed handoff, failure-state drafts and duplicate-attempt protection are implemented. Phone/email alternatives remain available.

The backend provides typed contracts, validation, bounded request parsing, rate limiting, honeypot/origin checks, safe structured errors, correlation identifiers and a replaceable delivery interface. Production defaults to Disabled. MailKit supplies authenticated encrypted SMTP when configured; Development explicitly uses a private file outbox. No database, queue, login, customer account, purchasing, inventory, accounting or management module was added.

Detailed contract and operations: [W03-inquiries.md](W03-inquiries.md). All changed files: [W03-files.txt](W03-files.txt).

## Required commands actually run

| Directory | Command | Final result |
| --- | --- | --- |
| Root | `git fetch --all` | Passed; baseline verified. |
| `upms.client` | `npm ci` | Passed; 210 packages added, 211 audited, 0 reported vulnerabilities. Existing repository Vite process was stopped to release its Windows native-module lock and development was restarted afterward. |
| `upms.client` | `npm run build` | Passed; Vite 8.3.4. Main JS 307.06 kB / gzip 95.33 kB; CSS 22.67 kB / gzip 5.26 kB. |
| `upms.client` | `npm run lint` | Passed. |
| `upms.client` | `npm test` | Passed; 52 tests in 2 files. |
| Root | `dotnet restore` | Passed; final dependency set restored without vulnerability warnings. |
| Root | `dotnet build` | Passed; 0 warnings, 0 errors. |
| Root | `dotnet test UPMS.Server.Tests --logger 'console;verbosity=minimal'` | Passed; 34 backend tests. |
| Root | `dotnet publish UPMS.Server -c Release -o tmp/w03/publish` | Passed; includes the SPA and API in the published server. |

Initial frontend test runs caught a JSX closing-tag edit, control-character regex lint errors and old mailto-only test expectations; these were corrected before the final green runs. NuGet reported vulnerabilities in MailKit's transitive System.Security.Cryptography.Pkcs dependency. The Microsoft advisories identified 10.0.13 as patched; this is now explicitly pinned. No vulnerability warnings remain in the final restore/build. No automated test sent an external email.

Added dependencies: MailKit 4.18.1 for SMTP; System.Security.Cryptography.Pkcs 10.0.13 as its patched transitive override; xUnit 2.9.3, xunit.runner.visualstudio 3.1.4, Microsoft.NET.Test.Sdk 17.14.1 and Microsoft.AspNetCore.Mvc.Testing 10.0.12 for backend tests. The existing frontend test stack was reused; no new frontend dependency or lockfile change was required.

## Automated coverage

Frontend tests include the existing route/catalog/navigation suite plus field validation, category preselection and unknown query handling, API payload, loading, duplicate-click protection, explicit development handoff, editable drafts after known failure, server field errors, network retry-key reuse, rate-limit handling after uncertainty, refusal of changed uncertain retries, bounded client timeout, rejection of unrecognized success payloads and hiding raw server exceptions.

Backend tests use WebApplicationFactory with a fake delivery registered only in explicitly configured test hosts. Production-mode tests clear SMTP settings and prove Disabled/DevelopmentFile/incomplete SMTP cannot report success. Other cases cover required/invalid fields, all allowed categories, lengths, CRLF/header-style input, plain-text notification composition, rate limiting/Retry-After, simultaneous duplicate keys, changed-key conflicts, rejected/unavailable/unknown delivery, server timeouts, ordinary-log privacy, oversized/chunked bodies, malformed JSON, media/encoding/key errors, same-origin/CORS boundaries, trailing-slash and case variations, unknown API routes and precise SMTP acceptance wording. The privacy test confirms ordinary handoff logging is captured without contact details or messages.

## Browser and publishing evidence

Actual in-app browser checks were performed against the final locally published Production site at `http://localhost:5183` with delivery Disabled:

- Reused the repeatable `upms.client/scripts/browser-smoke.mjs` harness: **66** layout/semantic checks passed (11 routes at **360, 390, 768, 1024, 1440 and 1920px**) and **12** navigation/search/filter/history checks passed. The harness asserts the actual viewport matches each requested width. No measured horizontal overflow, no broken loaded images, one H1 per page and correct main focus. All unique internal targets resolve to the public route list.
- Required-field submit shows linked accessible errors and focuses the summary before any network handoff.
- Valid synthetic submission to Production returns the honest unavailable state, preserves all entered fields and does not claim delivery.
- Product-detail inquiry navigation preselects the correct category.
- A separately started local Development instance of the published app (`ASPNETCORE_ENVIRONMENT=Development`, port 5184) wrote a real private outbox file and showed `development_saved` with “No email was sent.” The referenced file was confirmed on disk.
- Integrated HTTPS development was verified through Vite on 58500 and .NET on 7081, using `/contact?category=custom`. A real proxied POST produced a second private development outbox file and the explicit local-testing confirmation. Git ignore coverage for that file was checked.
- The published wwwroot contains no inquiry outbox files. Development's usual source wwwroot warning appears when running the backend without published assets; Vite serves the frontend as intended.
- Email/phone fallback links were preserved. No external mail/call or SMTP relay test was performed. Browser submissions used only synthetic `example.test` data and DevelopmentFile/Disabled transport configurations.

Machine-readable checks: [W03-browser-results.json](W03-browser-results.json). Screenshots under `docs/screenshots/w03`: `contact-desktop.png`, `contact-mobile.png`, `unavailable-desktop.png`, `development-handoff.png`, `https-proxy-handoff.png`. Desktop and mobile form layout captures were visually inspected; these checks are not an exhaustive screen-reader audit.

## Lighthouse measured results

Lighthouse 13.5.0 ran with installed Chrome in mobile/simulated-throttling mode against the final local published build. Each command used CHROME_PATH pointing to the installed Chrome executable:

```powershell
npx --yes lighthouse http://localhost:5183/contact --output=json --output-path=tmp/w03/lighthouse-contact.json --only-categories=performance,accessibility,best-practices,seo --chrome-flags='--headless=new' --quiet
npx --yes lighthouse http://localhost:5183/ --output=json --output-path=tmp/w03/lighthouse-home.json --only-categories=performance,accessibility,best-practices,seo --chrome-flags='--headless=new' --quiet
```

| Page | Performance | Accessibility | Best Practices | SEO |
| --- | --- | --- | --- | --- |
| Contact | 91 | 100 | 100 | 100 |
| Homepage | 87 | 100 | 100 | 100 |

No run warnings or failed automated accessibility audits. These are local lab measurements for the two pages, not production field performance, comprehensive accessibility certification or proof of indexing. Client-rendered metadata and soft public-page 404 behavior remain as documented in W02. Summary: [W03-lighthouse-summary.json](W03-lighthouse-summary.json); raw reports remain ignored under tmp/w03.

## Remaining production dependencies and limits

Production needs a verified authenticated SMTP relay, approved From/Recipient, private credentials, HTTPS and an explicit correct public origin/host/proxy configuration. Real relay acceptance and inbox placement have not been tested; live online inquiries remain unavailable by default. No customer data is silently accepted without a handoff response.

The in-memory duplicate cache/rate limits are per process. Retry protection lasts 30 minutes and does not survive restarts, new keys, expiry or multiple independent instances. Frontend drafts/keys also do not survive reload/navigation. SMTP acceptance is not a durable application queue or an inbox guarantee; uncertain outcomes are handled conservatively. A shared durable outbox/queue would need separate design before promising stronger delivery or scaling semantics. No database was introduced.

Development outbox files contain entered details, remain private/Git-ignored and should be cleaned up locally when no longer needed. They must not be copied from a reused development publish directory into production artifacts. Original photography, approved client material and verified non-bucket product specifications remain company content inputs from W02; they are unrelated to enabling SMTP.

Stop after W03. No merge or W04 implementation is included.
