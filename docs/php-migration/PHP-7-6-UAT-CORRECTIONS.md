# PHP-7.6 owner UAT corrections

Starting branch: feature/upms-php-7-5-full-system-uat.
Verified/fetched start: `2ad31e4f0e5ca4cf7abab0fca74b20b7d4ce0ab6`.
Delivery branch: feature/upms-php-7-6-uat-corrections. The delivery message reports
the final commit SHA; a commit cannot contain its own hash.

The centralized website address is now:
**F-260/A, Wali Road, Metroville, S.I.T.E., Karachi 75700, Pakistan**.
Contact, footer and address-derived metadata use the same company data. Phones,
email, WhatsApp, supplied Maps link, coordinates, directions, canonical settings
and approved Unique Plastic identity remain unchanged. See the old/new public
asset manifest for every affected build file.

The active Simple V1 bottle editor now defaults to the item selling price and
allows a positive per-challan rate. It shows Item default rate, Custom rate when
different, and an explicit Use default price action. Quantity/client edits and
draft reload preserve the chosen rate. Changing the selected item initializes
that item's default. Draft review, posting confirmation and challan print show
the effective rate and exact subtotal/discount/net. Purchase pricing is unchanged.

Laravel and Express calculate with the chosen string rate using existing exact
integer-cent arithmetic. Master price and item version are not updated by an
override. Posting still checks item/version, stock, authorization, CSRF, document
versions, idempotency and atomic effects. No migration, table, grant definition,
price-list feature, mandatory override reason or posted-document editing was added.

New drafts store server-derived defaultRateSnapshot, pricingVersion and rateSource
in the existing payload. The optional reviewedItemVersion request field rejects
stale client review context. Old clients may omit it: an explicit draft save
derives current context server-side, as before. Posting stale saved drafts remains
blocked. In React, Save draft stays disabled for stale item context until Review
current item details (keeps custom rates) or Use default price (explicit reset).
Historical drafts with current existing version context remain compatible without
inventing missing provenance. Historical returns keep original posted rates and
the unchanged cumulative discount/final-cent allocation algorithm.

## Retained and revised local environments

The original owner's services on 9443/9444/9084 were not stopped. Their wrapper
loaded PHP directly from the checkout, so before source edits their PHP-7.5
backend was copied privately and the wrappers atomically retargeted to that
snapshot. Public/private static builds, credentials, configuration, schema and
posted data were preserved. Wrapper backups are outside served roots.

At the start of PHP-7.6 the owner had already added entries: the retained synthetic
schema had 18 documents and X stock 23. These were not reset to the old 123-bottle
worksheet. Preservation compares the current owner's ten business-table hashes.
The canonical 123 / 200.00 / 80.00 / payable 185.00 / expenses 18.00 worksheet was
replayed through actual page controls in a separate fresh schema; manual-rate
tests use additional isolated items/clients and do not change its baseline values.

Revised public: https://127.0.0.1:9453
Revised management: https://127.0.0.1:9454/management/

Use username php-admin and open the new private credentials file locally:
`tmp/php-runtime/php6-browser-1793223331976/credentials.json`.
Do not print/share/commit the password. The original credentials remain unchanged.
Only owner/SYSTEM/Administrators can read the private fixture directory. The local
certificate is self-signed and short-lived; accept only this isolated loopback
certificate. SMTP certificate checks remain enabled.

Use a separate disposable browser profile for the revised ports. Cookies are
host-scoped; ports alone do not isolate the PHP session cookie. Our automated
browsers used independent disposable profiles. Keep the original owner browser
profile separate so signing into the revised database does not replace its cookie.

Restart ONLY the revised fixture:

```powershell
& ./scripts/php-7-6-services.ps1 -Action Stop
& ./scripts/php-7-6-services.ps1 -Php 84
$env:PHP_UAT_SETUP='tmp/php-runtime/php76-uat-latest.json'
$env:PHP_UAT_ORIGIN='https://127.0.0.1:9454'
$env:PHP_PUBLIC_ORIGIN='https://127.0.0.1:9453'
& ./tmp/production-readiness/node22/node_modules/node/bin/node.exe scripts/php-7-5-health.mjs --basic
```

The revised helper records/verifies its own process identities and refuses occupied
ports or a wrong synthetic host/port/schema. It never targets the original service
record. A new blank revised fixture may be prepared with php-7-6-prepare.mjs only
after stopping the revised fixture; it always creates a fresh schema and password.
Never reset a previous schema. Original service restarts must continue using the
original environment and frozen wrappers, not the revised config.

## Owner verification — PENDING OWNER

1. Open revised Contact/footer and confirm F-260/A, unchanged maps and company identity.
2. Select owner practice item 6 with default 50.00 and 500 bottles. Use new
   zero-opening synthetic clients to keep your manual expected balances clear.
   On separate challans use
   100 bottles at 45.00 and 100 at 55.00; verify 4,500.00 / 5,500.00, quantity-based
   stock and unchanged item price/version. Use separate synthetic clients if needed.
3. Edit quantity/client, reopen the draft, try Use default price and set a custom
   rate again. Confirm raw decimals are easy to type, totals/discounts recalculate
   and mobile entry is usable. No second price field or reason is required.
4. On a separate test item, save a custom-rate draft, change its master, verify
   posting is blocked, explicitly review while keeping custom price, save and post.
5. Inspect print/PDF, ledger, company register, partial/full returns and reconciliation.
   Review authenticityVerified separately; it remains false by design limitation.

Owner feedback/sign-off, native Excel and real Windows printing remain PENDING
OWNER. Existing dependency/header/style/strict-validation and SQL/authenticity
decisions remain blockers. Production is NO-GO. No deployment, live SMTP, DNS,
production migration, real financial posting or release package occurred.
