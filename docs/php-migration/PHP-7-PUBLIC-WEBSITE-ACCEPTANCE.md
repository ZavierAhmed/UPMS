# PHP-7 public website acceptance

The existing React/Vite public site is preserved. There are **zero public source or
approved public build differences**: all 111 files in PHP-6-PUBLIC-ASSETS.json retain
their SHA256 values. PHP-7-PUBLIC-ASSETS.json records the comparison. Owner-supplied
untracked assets were excluded from staging/build imports and remain in place.

The only React change is in the private management application: a posted EXPENSE
without an official number now displays `Expense <id>` instead of `Draft <id>` in its
detail/print heading. Draft headings remain unchanged. No expense number, accounting
field or business mutation was added. Two specific React tests and an actual browser
heading assertion protect this correction. Private management JS/HTML build hashes
change accordingly; these are excluded from the 111 public-file manifest by design.

Actual Apache HTTPS/FastCGI acceptance passed on PHP 8.3.36 and 8.4.27, with separate
fresh synthetic management schemas. Public https://127.0.0.1:9443 and private
https://127.0.0.1:9444 are distinct origins. Twenty route/viewport checks cover Home,
About, Products, all four product categories, Manufacturing, Industries and Contact at
1440px and 390px. Checks verify headings, descriptions/title, canonical policy, loaded
visible images, no horizontal overflow and approved WhatsApp destinations. Existing
canonical behavior is preserved: the local build emits no canonical when site-origin
is unset; a configured site-origin must agree with its route. No domain was invented
or canonical changed to a localhost address.

Eight further checks cover mobile-menu routing, all four product-specific inquiry
preselections, approved address/maps/directions, client-side validation before a network
request, real form submission without management login/cookie/CSRF, success text and
private outbox contents, matching-key HTTP replay with one saved message, private UI/API
denial from the public origin and the 111-file hash manifest. Each runtime passed 28
checks with zero JavaScript errors. SMTP outcomes use the separate isolated verified-TLS
differential fixture; browser submissions deliberately use DevelopmentFile and say no
email was sent. No customer mailbox, live page or hosting configuration was touched.

Branding remains Unique Plastic Industry only, in the approved graphite/orange/warm-white
design. Lubricant Cans is the existing packaging category. The source assets mentioning
other companies are not publication approval and were not imported. Public navigation,
copy, metadata, images/alternative text and downloadable built assets remain the
baseline approved files. Browser screenshots and printed expense detail were visually
inspected; full-page mobile capture includes Chrome's fixed-header positioning.

Management browser regression also passed 26 checks per runtime: login, masters and
verified openings, stock, sale/return/receipt/cheque reversal, credit purchase/vendor
payment, both paid-only expense methods, no expense stock/party-ledger effect, errors
and cancellation, register filters, client/vendor ledgers, stock report and reconciliation.
Three real XLSX downloads and two A4 PDF print views were produced per runtime. The
XLSX signatures, worksheet data and exact expected values were checked. Native desktop
Excel and physical printers were not exercised; owner UAT still must check them.

Broader security/session expiry, all thirteen kinds, correction paths and unchanged
business effects are covered by the full PHP-2–6/Unit/Express/React suites, not claimed
as thirteen separate manually completed browser transactions. PHP-7.5 remains a separate
owner-operated acceptance exercise defined in FULL-SYSTEM-UAT-PLAN.md.
