# Website visual acceptance

## TESTED

Chrome 156.0.8078.80, Windows; widths 390, 768, 1024, 1440 and 1920, CSS pixels, DPR1.

Seven routes at every width: `/products/buckets`, `/products/cans`, `/products/containers`, `/products/stickers`, `/products/cartons`, `/manufacturing`, `/about`. 35 local Node cases + 35 extracted-package cases, with full-page screenshots and machine checks. Main/secondary photos retain aspect ratio; responsive variants load; all download actions remain available, touch-sized and in bounds. No horizontal document overflow, broken images, page exceptions or failed requests. Existing header/navigation, category cards, contact panel and footer retain the approved design.

Actual screenshots: `evidence/browser/local/*.jpg` and `evidence/browser/package/*.jpg`. JSON reports map each route and width to its screenshot and checks. Layouts reviewed as five-width page contact sheets, with targeted download bounds checked separately in all 25 category/width cases. Owner-image Next/keyboard navigation exercised on mobile. Existing automated gallery tests retain swipe/thumbnail/fallback coverage.

Five PDFs downloaded by clicking their page action and checked byte-for-byte in each of Vite, built local Node and extracted Node: 15 downloads, 15 real Chrome PDF-extension viewer opens. Captures: each runtime's `pdf-viewer-*.jpg`; metadata/headers/checksums in `results.json`. Chrome renders the viewer in an out-of-process extension, not an embed in the page DOM. Separate full-page Poppler PNGs of every final PDF are in `evidence/pdfs/` and were inspected for readability, alignment, logo, image/caption, description, sizes and contacts. PDF text extraction is an additional check, not a substitute for visual review.

Lighthouse 13.5.0 reports record their actual version/fetch time in `evidence/lighthouse.json`; raw reports retained locally in `tmp/uat3a/`.

| Page | Device | Performance | Accessibility | Best practices | SEO |
|---|---|---:|---:|---:|---:|
| home | mobile | 96 | 100 | 100 | 100 |
| products | mobile | 96 | 100 | 100 | 100 |
| contact | mobile | 99 | 100 | 100 | 100 |
| manufacturing | mobile | 99 | 100 | 100 | 100 |
| stickers | mobile | 90 | 100 | 100 | 100 |
| home | desktop | 100 | 100 | 100 | 100 |
| products | desktop | 100 | 100 | 100 | 100 |
| contact | desktop | 100 | 100 | 100 | 100 |
| manufacturing | desktop | 100 | 100 | 100 | 100 |
| stickers | desktop | 100 | 100 | 100 | 100 |

Remaining Lighthouse diagnostics include render-blocking CSS/JS and mobile image/paint opportunities; these are not hidden as a perfect mobile performance score. The lowest performance score is 90 on the sticker page. No management assets were redesigned to pursue public scores.

## OWNER APPROVAL REQUIRED

Manual preference/content retest is pending. Developer visual acceptance is not represented as owner sign-off. Pay particular attention to representative image captions and PDF content.

## BLOCKED — MISSING/UNAPPROVED SOURCE

The missing company machine photograph/inventory cannot be visually accepted as a real facility photo. The retained brochure illustration and new general process diagram are accurately labeled.
