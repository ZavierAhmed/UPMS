# PHP-7.9 visual acceptance

Owner sign-off: **PENDING OWNER**. Actual before/after screenshots are private local artifacts, not fabricated mockups or CSS-test substitutes. Before captures use the retained PHP-7.8 preview on 9473/9474; after uses the isolated PHP-7.9 preview on 9483/9484. Viewport/height match at 390 × 1000 and 1440 × 1000.

| Page | Before | After |
| --- | --- | --- |
| Products, 390 | tmp/php-runtime/php79/before/390-products.png | tmp/php-runtime/php79/after/390-products.png |
| Stickers, 390 | tmp/php-runtime/php79/before/390-stickers.png | tmp/php-runtime/php79/after/390-stickers.png |
| Cartons, 390 | tmp/php-runtime/php79/before/390-cartons.png | tmp/php-runtime/php79/after/390-cartons.png |
| Login, 390 | tmp/php-runtime/php79/before/390-login.png | tmp/php-runtime/php79/after/390-login.png |
| Dashboard, 390 | tmp/php-runtime/php79/before/390-dashboard.png | tmp/php-runtime/php79/after/390-dashboard.png |
| Products, 1440 | tmp/php-runtime/php79/before/1440-products.png | tmp/php-runtime/php79/after/1440-products.png |
| Stickers, 1440 | tmp/php-runtime/php79/before/1440-stickers.png | tmp/php-runtime/php79/after/1440-stickers.png |
| Cartons, 1440 | tmp/php-runtime/php79/before/1440-cartons.png | tmp/php-runtime/php79/after/1440-cartons.png |
| Login, 1440 | tmp/php-runtime/php79/before/1440-login.png | tmp/php-runtime/php79/after/1440-login.png |
| Dashboard, 1440 | tmp/php-runtime/php79/before/1440-dashboard.png | tmp/php-runtime/php79/after/1440-dashboard.png |

The two new category routes did not exist before, so their before captures truthfully show the old NotFound screen. Management screenshots use independently populated synthetic fixtures; their values need not match and are not a before/after financial comparison. Regression assertions and four-schema business-table hashes establish preservation separately.

Focused actual-browser image crops are `after/390-stickers-illustration.png`, `after/390-cartons-illustration.png`, `after/1440-stickers-illustration.png` and `after/1440-cartons-illustration.png`. Agent inspection confirmed distinguishable original illustrations, meaningful captions, proportional framing and no false product photograph/brand/specification claim.

The final desktop login has a balanced branded panel and vertically stacked form with orange submit. Mobile keeps a compact branded header and one form panel. Final browser captures supersede the initial inherited-CSS form/button appearance. Actual keyboard sequence, password visibility, incorrect credentials, pending real login, successful login and logout are tested. No false Loading records banner appears in signed-out or pending-authentication states.

Public browser measurements cover eleven routes × seven required widths (77 views); dashboard measures eight widths and three date ranges; login measures the seven required widths; management forms measure 27 views. Tested screens have no horizontal overflow. Selected login text contrast is at least 5.57:1 and dashboard/KPI text at least 5.31:1. Both values are bounded checks, not a full accessibility certification. Expected frame-denial security messages are distinguished from unexpected application CSP errors.

Seven financial PDFs / eight rendered pages are separately inspected in `tmp/php-runtime/php79/print-contact-sheet.png`; six Excel files pass CRC/XML checks. Screen color CSS is @media screen only and does not rewrite print styles. Native Excel and actual Windows printing remain PENDING OWNER.

Owner review should record name/date/final SHA, viewport, expected/actual and PASS/FAIL for all five categories, retired link handling, category inquiry/WhatsApp, temporary imagery, login states, palette/status meanings, dashboard ranges, business forms, custom rates/returns and prints/exports. No acceptance field is automatically signed. Production remains NO-GO.
