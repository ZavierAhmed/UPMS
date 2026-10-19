# W01 verification

Baseline: local `master` and fetched `origin/master` both `12c597ac4bb69dbda9075770e3001135e5bde078`. Feature branch: `feature/upms-w01-website-foundation`. Existing untracked brochure and logo source files were preserved. No baseline advancement was found.

## Actual commands

| Command | Result |
| --- | --- |
| `git fetch origin` | Passed with elevated filesystem/network access. Initial sandbox attempt could not write FETCH_HEAD. |
| `npm ci` (upms.client) | Passed; 143 packages, 0 reported vulnerabilities. Initial sandbox attempt failed with npm registry DNS ENOTFOUND. |
| `npm run build` (upms.client) | Passed after fixing unconditional development-certificate generation in Vite config. |
| `npm run lint` (upms.client) | Passed. |
| `dotnet restore` (root) | Passed with elevated access; projects up to date. |
| `dotnet build` (root) | Passed; 0 warnings, 0 errors. |

No applicable existing automated tests were found. No test framework or runtime dependency was added.

## Browser and responsive checks

Production preview initially timed out in the sandbox. Running `npm run preview -- --host 0.0.0.0 --port 4175` outside the sandbox made it accessible to the in-app browser.

Actual browser checks:
- Viewed the homepage at 360, 390, 768, 1024, 1440 and 1920px widths. DOM measurements reported no horizontal overflow at each width and zero broken loaded images.
- Inspected the full desktop homepage screenshot and saved full-page desktop (1440px) and mobile (390px) captures under `docs/screenshots`.
- Opened the mobile menu, navigated to Products, confirmed the menu closed, and followed the Plastic Buckets category link to its preview.
- Confirmed Escape closes the mobile menu from its toggle.
- Navigated About, Manufacturing, Industries and Contact routes and confirmed their headings.
- Inspected mailto/tel destinations in the rendered DOM; did not launch external mail/phone applications or send inquiries.

No Lighthouse or full accessibility audit was run. Other keyboard behavior, reduced-motion styling and remaining category targets were checked in source; this is not a claim of exhaustive interactive testing. No existing test suites were present.

## Review limitations

Brochure-derived visuals are low resolution and need original photography in future milestones. The machinery image is labeled as brochure imagery rather than verified factory photography. Secondary informational pages are intentionally labeled previews. Hash routing preserves static-host compatibility but can be replaced with path routing in a future milestone if SEO requirements expand. Google Fonts requires network access and has system fallbacks. No production canonical URL or OG image is fabricated.
