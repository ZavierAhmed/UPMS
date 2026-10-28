# PHP-2 test and completion results

Baseline: `feature/upms-php-migration` at
`b992770d3a127b966580201b8ff6c4225ad6405d`, fetched and verified before branching.
Delivery branch: `feature/upms-php-2-master-data-openings`. The final pushed SHA is
reported in the completion message. [Exact changed files](PHP-2-FILES-CHANGED.txt).

## Implemented scope

| Method | Existing URL | Scope |
| --- | --- | --- |
| POST | `/api/v1/management/simple-v1/items` | Generated ITM identity, price, active flag, unverified zero stock, counter and audit |
| PATCH | `/api/v1/management/simple-v1/items/{id}` | Versioned edits; code, stock and prior snapshots preserved |
| POST | `/api/v1/management/simple-v1/parties` | CLIENT/VENDOR creation, contact fields, unverified opening, audit |
| PATCH | `/api/v1/management/simple-v1/parties/{id}` | Versioned edits; kind, verification and ledger history preserved |
| POST | `/api/v1/management/simple-v1/documents` | Draft STOCK_OPENING, CLIENT_OPENING or VENDOR_OPENING only |
| PATCH | `/api/v1/management/simple-v1/documents/{id}` | Edit supported opening drafts only |
| POST | `/api/v1/management/simple-v1/documents/{id}/post` | Atomically post supported openings only |

The shared command layer preserves UUID validation, raw-input canonical SHA256,
administrator/designated-operator checks under identity_guard, READY gating, actor-bound
result replay and conflicts. Records, journals, verification, audit, counters and saved
responses commit together. No automatic retry of an uncertain commit is introduced.

## Verified results

| Check | PHP 8.3.36 | PHP 8.4.27 |
| --- | --- | --- |
| PHPUnit regression + Node-derived canonical vectors | **67 tests / 450 assertions**, pass | **67 tests / 450 assertions**, pass |
| Independent Express/Laravel HTTP comparisons | **135**, pass | **135**, pass |
| Full ten-table state comparisons | **13**, pass | **13**, pass |
| Additional concurrency/failure/grant/scope checks | Included in **18** recorded checks | Included in **18** recorded checks |
| Existing auth/session/CSRF regression | Pass | Pass |
| Platform and style | Existing PHP 8.3 baseline retained | Composer platform requirements, preflight and Pint pass |

Both differential runs used MariaDB **10.11.19** on loopback **3330**. Each created a
new Express reference schema and an independent new Laravel schema using the original
three migrations unchanged. No owner configuration file was loaded. The earlier PHP-1
regression fixtures remained on their separate loopback-3328 synthetic instance.

The installed PHP 8.4 binary initially had sodium disabled. Tests enable the already
installed extension with `-d extension=sodium`; no system php.ini, dependency requirement
or owner runtime configuration was changed. PHP 8.4 preflight then reports all required
extensions and Argon2id available. No PHP 8.3/8.4 behavioral incompatibility was found.

## React and actual PHP browser acceptance

- **188/188 React tests**, 25 files; build and ESLint passed.
- The unchanged Express regression suite also passed **290/290 tests** on Node 22.23.4.
- **21 browser checks** passed in headless Chrome against a separate loopback HTTPS
  Apache server and the owner's **PHP 8.4.27 FastCGI** binary. This was actual web-SAPI
  integration, in addition to the differential CLI HTTP-kernel adapter.
- Checked sign-in, required fields, server fieldErrors, item creation/editing, stock
  opening draft/posting, client/vendor creation/editing, nonzero/zero party openings,
  ledger navigation, six deep links, reconciliation and logout. **0 JavaScript errors**.
- All **111 public build files are SHA256-identical**. React website/dashboard source,
  styling, navigation and approved branding are unchanged. The Simple V1 mode marker
  was added only to the private copied management test HTML, as Express normally does.

Machine-readable evidence:
[differential runs](PHP-2-DIFFERENTIAL-EVIDENCE.json),
[browser results](PHP-2-BROWSER-RESULTS.json),
[public hashes](PHP-2-PUBLIC-ASSETS.json).

## Preservation, boundaries and remaining work

No existing migration, Node implementation, administrator credential, owner asset or
live website file was changed. No owner database connection or mutation, cPanel
deployment, production posting, schema reset or hosting ZIP generation occurred.
Local schemas, test environment files and generated TLS keys remain in ignored private
test directories. Installed Apache/PHP settings and the system certificate store were
not changed.

Cancellation, production/purchase stock-in, challans, returns, payments, expenses and
reversals remain disabled with the explicit pending-review response. Stored later-kind
drafts and their saved command receipts cannot bypass the opening-only scope guard.
Legacy ERP modules remain profile-disabled. The production database profile remains
inaccessible; account-specific hosting validation is still pending from PHP-1.

PHP-2 has no unresolved local acceptance blocker. **Stop for review before PHP-3.**
