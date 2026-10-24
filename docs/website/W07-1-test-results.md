# W07.1 verification — 2026-10-24

- Backend: 179/179 passed. Includes retired-category rejection, ten-page sitemap and former Jars HTTP 404.
- Frontend: 181/181 passed across 23 files; three new card/mapping/intent tests plus existing gallery behavior assertions.
- Production public/management build and frontend lint passed. Management asset filenames retain the W07 baseline; the existing management bundle size advisory is unchanged.
- Backend production and frontend security audits: zero vulnerabilities.
- Current public registry: ten routes × six viewports (360/390/768/1024/1440/1920) = 60 passing route/viewport checks; 20 public interactions passed.
- W07 gallery/browser acceptance: 55 checks passed against the new preview, with evidence stored separately from historical W07 screenshots.
- W07.1 polish acceptance: 60 checks passed at 1920/1440/768/390px.
- Extracted production-only package: clean installation, all active public routes, asset serving, corruption rejection, private-path blocking and disabled-delivery inquiry checked before commit; final package is rebuilt against the exact final commit and verified before push.

| Page | Performance | Accessibility | Best practices | SEO | CLS |
|---|---:|---:|---:|---:|---:|
| home | 94 | 100 | 100 | 100 | 0 |
| catalog | 96 | 100 | 100 | 100 | 0 |
| detail | 96 | 100 | 100 | 100 | 0 |
| contact | 98 | 100 | 100 | 100 | 0 |

Lighthouse 13.5.0 uses mobile throttling; all four pages report zero CLS and no accessibility failures. These are measured results, not guaranteed field scores.

Expected test updates reflect the approved removal: ten routes rather than eleven, four categories rather than five, and negative retired-Jars coverage instead of a positive Jars route/category assertion. The gallery's generic single-image unit assertion remains. Backend/frontend totals reduce because generated per-product cases no longer include Jars; tests were not disabled. The full-page browser scan explicitly loads offscreen lazy thumbnails before decoding them, retaining the same image-integrity assertion.

Machine-readable evidence: `docs/W07-1-browser-results.json`, `docs/W07-1-lighthouse-summary.json`, `docs/website/W07-1-verification-evidence.json`. Full logs and package receipts remain private in `tmp/w071/`. No database-write suites were run because this milestone changes no management/database behavior. The historical ASP.NET migration parity harness is unchanged and was not used as a reference for the newly approved public categories.

Fresh W07.1 package verification passed with 200 files and public asset `/assets/index-BmA9E3X6.js`. Both package guards now compare the exact ten approved route paths. An initial attempt correctly stopped at the obsolete eleven-route guard; its subsequent stale archive check was excluded as W07.1 evidence. Fresh archive creation and verification stop on every command failure. The historical W06 report was restored unchanged.

Before pointer intent, the product listing requested exactly three catalog image variants (one per photographed category), totaling 63,268 encoded bytes at desktop widths and 86,834 at tablet/mobile in these runs. No secondary hover image was mounted before intent. These are catalog-image bytes, not total-page transfer sizes.
