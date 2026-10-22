# P2.5 executed acceptance evidence

Executed2026-10-22 on Node24.22.0 and isolated MariaDB10.4.32 schemas at127.0.0.1:3309, normal recovery0. No mocked fallback, skipped assertions or owner business fixtures count as passing.

| Check | Actual result |
|---|---|
| Backend |131 passed,0 failed/skipped |
| Frontend |107 passed across10 files,0 failed/skipped |
| Original identity SQL |17 passed, regression01 |
| Original business SQL |16 passed, regression01 |
| Full inventory SQL/browser |20 passed, inventory01 |
| Full purchasing SQL/browser |29 passed, purchasing01 |
| Sales SQL/browser |23 passed (22 cases plus parent), final sales04 |
| Build/lint | Passed |
| Backend/client full security audits |0 vulnerabilities each |
| Public regression |66 route/viewport combinations,22 interactions |
| Lighthouse performance | Home96, catalog97, detail97, contact98 |
| Lighthouse accessibility/best practices/SEO |100 on all four pages |
| Production package |79 files; clean production-only install; integrity/corruption detection and native Argon2 verified |
| Packaged runtime | All11 public routes200, asset200, seven private probes blocked; SMTP Disabled |

The105 database-suite totals include parent tests, matching Node's actual reports. Browser actions are included, not counted again. Business's16 assertions retain legacy uniqueness through an explicit isolated metadata fixture while replacing automatic classification expectations with the owner's superseding single-ledger rule. Other prior-suite changes adapt schema/history/connection/evidence metadata; no assertions removed or historical migrations edited.

Sales proves direct posting without approval; exact rates/per-line tie rounding; repeated-line aggregation; exact-zero stock; dispatch/production competition; purchased finished-goods compatibility; quarantined/damaged exclusion; category/unit/version/date/period/currency/opening gates; source immutability; duplicate corrections; original/request hash binding; revoked approval authority; blocked credits/returns; actual stock/customer/audit failures; durable replay/restart; real deadlock/lock timeout; lost TCP COMMIT acknowledgement; API/CSRF/privacy; bounded ledger filters/pagination; and reconciliation with tamper detection and no repair.

Browser proves create/edit/direct post, visible AVAILABLE quantities, exact live totals, official preview, customer ledger, Sales correction request and Administrator review, Accounts read-only, Inventory financial denial and mobile. Final run had no page/unexpected console errors. Sales01 failed browser input replacement, with SQL passing; sales02 failed missing favicon console noise. The harness now replaces/verifies values; private HTML embeds the approved existing SVG. Both failed schemas survive. Sales03 passed23; final04 reverified current code and additional money/hash gates. Retries are not extra accepted cases.

Backup restored exactly across59 tables before main migration. Main now has68 physical/66 runtime tables/five migrations; all original rows remain, nine sales tables remain empty, policy/period/stock/customer activation remains absent. One administrator, encrypted profiles and session key are preserved. Stock/customer reconciliation matched in isolated acceptance; main empty journals/caches have no balance to repair. All1037 original XAMPP files and offline copies remained unchanged.

Ignored private evidence: `tmp/w06/p25` and `server/.local/p25`. Includes successful/failed logs, SQL/browser receipts, backup/restore/migration/grant/preservation receipts and production-package proof. No credentials, backup dumps or private evidence enter Git/package. Final committed package is regenerated to embed the milestone SHA. No deployment or merge.
