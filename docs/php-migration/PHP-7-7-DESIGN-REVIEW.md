# PHP-7.7 design review

Starting SHA: `07a45ec5d3d5b91d49ce514bf84bd1aaa57c51b1`.
Branch: `feature/upms-php-7-7-design-enhancements`. The final commit SHA is in the
delivery message. This is a local design preview, never deployment approval.

## Public design

The obsolete 0342-2743901 / tel:+923422743901 contact is removed from company data,
the repeated contact section and contact metadata. Contact/footer now share the
single retained 0314-2113472 destination. WhatsApp, email, F-260/A address, map pin,
directions, company identity and canonical configuration are preserved. Historical
party contact records are untouched.

Mobile product cards now use one column: full-width copy, a comfortable action
target, then illustration/photography. The concept illustration no longer repeats
the card's descriptive text. Cards grow naturally rather than forcing narrow
side-by-side text and art. Shared content gutters are centered; the old forced
right-side WhatsApp rail is removed. Below 1200px the same accessible WhatsApp
action has an in-flow position after the footer; at larger widths its 44px fixed
button fits outside the centered content. It does not cover form controls or
reserve a strip through every section. No blanket overflow-x:hidden was added.

The approved blue bucket/green jerrycan image is unchanged byte-for-byte, including
its real white pixels. Its entire media frame is deliberately white, with subtle
border, balanced padding, correct 4:3 proportions and responsive sizing. No product
was recolored, distorted, cut out, regenerated or replaced. Other galleries retain
approved assets, responsive sources, image dimensions and truthful alternative text.

## Management design

Only the active Simple V1 presentation changes. A white grouped sidebar, orange
active-page marker, aligned icons, neutral surfaces, quieter status treatment,
consistent fields/buttons/tables and balanced spacing apply across the existing
workspaces. The mobile drawer has explicit close controls, focus containment,
Escape support and focus restoration. Routes, roles and permissions are unchanged.
Editable rates, explicit default reset/stale review, posting confirmations, native
validation and all existing financial actions are retained without new approvals.

The operational dashboard has six existing current/today KPIs, date-covered
sales/return/net series, active verified inventory bars, posted-type counts,
net payment/expense/return summaries, recent document links and attention panels.
Every chart has exact textual values or a table. No chart library or dependency
was added. See DASHBOARD-ANALYTICS for source/coverage definitions and performance.

Screen styling is isolated in operations.css under @media screen; existing A4
financial rules remain independent. Dashboard/navigation are not financial print
content. Actual PDF/XLSX checks are recorded in TEST-RESULTS and visual evidence.

## Preservation and owner preview

The PHP-7.5 and PHP-7.6 web roots, services, credentials, schemas and posted records
are retained. Their ten business tables are hashed before/after this milestone.
No PHP or Express business implementation, schema, posting rule, authentication,
runtime grant, dependency or document-counter logic is changed.

New public: https://127.0.0.1:9463
New management: https://127.0.0.1:9464/management/

Username php-admin; open this private file locally for its random password:
`tmp/php-runtime/php6-browser-1793227278216/credentials.json`.
Use a separate disposable browser profile: ports do not isolate host cookies.
The self-signed loopback certificate is local-only and short-lived. Never weaken
SMTP certificate validation. No customer mail is sent; inquiries use DevelopmentFile.

From the repository, operate ONLY the new preview:

```powershell
& ./scripts/php-7-7-services.ps1 -Action Stop
& ./scripts/php-7-7-services.ps1 -Php 84
$env:PHP_UAT_SETUP='tmp/php-runtime/php77-uat-latest.json'
$env:PHP_UAT_ORIGIN='https://127.0.0.1:9464'
$env:PHP_PUBLIC_ORIGIN='https://127.0.0.1:9463'
& ./tmp/production-readiness/node22/node_modules/node/bin/node.exe scripts/php-7-5-health.mjs --basic
```

The helper has its own process record, checks executable/PID/creation time, and
requires 9463/9464/9284 plus the verified loopback 3330 synthetic engine. It refuses
old owner configurations and occupied ports. It does not stop an installed Apache
service or either earlier preview. php-7-7-prepare.mjs makes a new empty synthetic
schema only when new preview ports are free; never reset an existing schema.

Owner design acceptance, native Excel/Windows printing and production-risk decisions
remain **PENDING OWNER**. Existing Symfony Mime, management-header, Pint/strict
validation, authenticity and SQL row-grant blockers remain. Production is **NO-GO**.
No GoDaddy/owner database, live posting, SMTP delivery, DNS, deployment or release
package was used. Stop for owner review before further work.
