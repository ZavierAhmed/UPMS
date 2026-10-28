# Shared-hosting compatibility — 28 October 2026

**Decision: retain Laravel 13; conditionally suitable, not approved for deployment.**
Laravel 13.39.0 is installed and tested locally on PHP 8.3.36 and MariaDB 10.11.19.
No demonstrated provider incompatibility justifies a framework switch. Account-specific
PHP settings and Apache routing have not been authenticated/verified in cPanel. No
software was installed on hosting and no DNS, document roots or live files changed.

## Evidence and outstanding checks

| Requirement | Evidence / proposed handling | Actual account status |
| --- | --- | --- |
| PHP 8.3+ | Laravel 13 requires PHP 8.3+. Provider supports version selection. | Selected version/build unverified; do not change it during this milestone. |
| MariaDB 10.11.19 | Owner endpoint directly inspected; synthetic contract instance uses 10.11.19. Laravel documents MariaDB 10.3+; UPMS uses native PDO against existing schema. | Existing schema is compatible; PHP production connection is intentionally disabled. |
| Required extensions | ctype, curl, dom, fileinfo, filter, hash, mbstring, openssl, pcre, PDO, session, tokenizer, xml; UPMS additionally requires pdo_mysql and sodium, plus password_algos() containing argon2id. | Local checks pass; web-SAPI account checks pending. |
| Apache/mod_rewrite | Front-controller rewrite plus separate React fallback templates prepared. No Apache proxy or Node process. | Actual AllowOverride, rewrite module and rule behavior unverified. |
| Document roots/subdomain | GoDaddy documents custom subdomain document roots. Only entry files and approved static builds go in roots. | Separate app root availability/location must be confirmed in this account. |
| Economy resources | Provider lists 1 CPU core, 512 MB RAM, 20 entry processes, 35 processes, 250,000 inodes and 30 concurrent MySQL connections. One PDO connection per PHP request; at most two simultaneous Argon2 operations through DB advisory locks. | These are published plan limits, not measured remaining capacity. PHP memory_limit and max_execution_time are still unknown. |
| Memory/time | PHP suite peaks at 44 MB on Windows CLI, not a hosting benchmark. Host-side measurements required under concurrent login/read/export traffic. | Do not infer hosting limits from GoDaddy's example ini values or local CLI's 512M/unlimited time. |
| Composer | Build vendor locally/on a matching Linux PHP image using the committed lockfile; deploy production dependencies only. No server-side Composer required. | Validate Linux PHP platform requirements before packaging; Windows vendor is test evidence only. SSH/Composer availability not assumed. |
| Private writable directories | storage and bootstrap/cache outside web roots, owner-writable only; no 0777. File cache, array Laravel sessions, synchronous operations. UPMS sessions use existing database table. | Local writable checks pass; host ownership/permissions pending. |
| Database hostname | GoDaddy explicitly specifies **localhost** for cPanel. Confirm actual account socket/host in cPanel before adding a production profile. | Public documentation confirms provider-local default; no PHP connection from this account has been performed. External allowlisted IP is not the hosting DB configuration. |
| Private logs | Only correlation ID and exception class recorded; no SQL bindings, request bodies, credentials or tokens. Source/vendor/logs/backups remain private. | Layout pending validation. |
| Runtime | Apache/PHP requests, no Node server, Vite dev server, daemon, Redis or queue worker requirement. | No hosting release generated or installed. |

The default PHP environment is disabled and only accepts a local `upms_test_php_*`
database. This is a deliberate milestone boundary, not a production configuration.

## Database inspection

The TLS-only preflight returned `TLS_NOT_ADVERTISED`. The earlier owner-approved
plaintext development exception is documented in the starting branch's
[remote results](../development/REMOTE-MARIADB-RESULTS.md). A separate inspection
used that existing endpoint inside `START TRANSACTION READ ONLY`, issued SELECTs
only and rolled back. It did not create application sessions or change account data.
The session's default tx_read_only value is 0; that default is distinct from the
explicit transaction's READ ONLY access mode. This exception is not production
approval. Hosting must use the independently confirmed local database connection.

## Primary sources consulted

- [Laravel 13 deployment requirements](https://laravel.com/docs/13.x/deployment)
- [Laravel 13 database support](https://laravel.com/docs/13.x/database)
- [GoDaddy Economy resource limits](https://www.godaddy.com/help/resource-limits-12001)
- [GoDaddy PHP version selection](https://www.godaddy.com/help/view-or-change-the-php-version-for-my-web-hosting-cpanel-16090)
- [GoDaddy PHP settings](https://www.godaddy.com/help/change-php-settings-for-my-hosting-account-26379) — example values are not account measurements.
- [GoDaddy database hostname](https://www.godaddy.com/help/find-your-database-hostname-23889)
- [GoDaddy custom subdomain roots](https://www.godaddy.com/help/create-addon-domains-or-subdomains-in-web-hosting-cpanel-8877)

If the account cannot provide PHP 8.3+, the extensions, private directories or the
separate safe web root, stop deployment and document the exact restriction. If a
framework alternative is truly required, propose a small PSR-7/15 router with the
same guarded PDO/domain adapters for review; do not switch architecture automatically.
