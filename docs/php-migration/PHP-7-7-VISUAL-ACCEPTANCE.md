# PHP-7.7 visual acceptance

Automated and agent visual review: **PASS** for the recorded local checks.
Owner design sign-off: **PENDING OWNER**. No human feedback is invented.

Private artifacts are retained locally, outside Git. Public before/after captures
use identical viewport widths/section bounds and the retained/revised sites.
Management captures use independent actual synthetic fixtures; record values
may differ and are not a financial before/after comparison. Financial preservation
is separately established by owner-table hashes and the regression suites.

Repository-relative artifacts (open locally):

| Review | Before | After |
| --- | --- | --- |
| Custom card, 390px | tmp/php-runtime/php77/before/390-custom-card.png | tmp/php-runtime/php77/after/390-custom-card.png |
| Capabilities photo, 390px | tmp/php-runtime/php77/before/390-capabilities.png | tmp/php-runtime/php77/after/390-capabilities.png |
| Full Products page, 390px | tmp/php-runtime/php77/before/390-_products.png | tmp/php-runtime/php77/after/390-_products.png |
| About page, 1440px | tmp/php-runtime/php77/before/1440-_about.png | tmp/php-runtime/php77/after/1440-_about.png |
| Dashboard, 1440px | tmp/php-runtime/php77/before/1440-dashboard.png | tmp/php-runtime/php77/after/1440-dashboard.png |
| Dashboard, 390px | tmp/php-runtime/php77/before/390-dashboard.png | tmp/php-runtime/php77/after/390-dashboard.png |

The same public Home/About/Products/Custom captures and focused card/media sections
also exist at 320, 768 and 1440px. Public metrics cover all eight requested widths;
dashboard metrics cover all eight too. Agent image inspection confirmed readable
stacked cards, coherent white imagery, centered content, desktop dashboard hierarchy
and a natural mobile stack. No product photograph pixels changed.

The actual six financial print PDFs/four worksheet XLSX exports are in the private
preview directory identified by php77-uat-latest.json. Further custom-rate PDFs and
downloads are from the preserved pricing acceptance script. Print and workbook
format checks are separate from screen screenshots; dashboards/navigation must not
appear in financial printouts. Native Excel and a real Windows print destination
remain **PENDING OWNER**.

Owner review: inspect the new phone/footer, Custom Packaging card, About media,
contact form, all management workspaces, mobile drawer, dashboard ranges/units,
custom-rate entry, prints and exports at the new HTTPS URLs in DESIGN-REVIEW.
Record name/date/tested SHA, viewport, expected/actual result and PASS/FAIL comments.
All such manual fields remain **PENDING OWNER**. Production remains **NO-GO**.
