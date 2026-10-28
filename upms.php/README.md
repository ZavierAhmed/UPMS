# Unique Plastic Industry PHP API

Laravel **13.39.0**, PHP **8.3+**, MariaDB **10.11**, native PDO prepared statements.
PHP-1 through PHP-3 are for isolated testing and review. The backend cannot connect to the
owner schema. PHP-3 adds production, purchases, challans and supported draft cancellation
to the item/party writes and explicit openings.
No hosting release or other financial-write cutover is authorized here.

Install the exact dependency tree with `composer install --no-interaction`. The lockfile
is committed. There are no npm scripts, Node server, default Laravel migrations,
demo seeders, database cache/session tables, or automatic bootstrap hooks. Laravel's
default database connections are disabled. UPMS accesses existing tables only through
`App\Upms\Database` and the explicit `Schema` mapping.

## Local tests

1. Provision a **fresh standalone MariaDB 10.11.19 instance**, bound to loopback port
   `3328`, with its own data directory. Never reuse the owner's instance or data.
2. Set `PHP_TEST_ADMIN_PASSWORD` privately for that isolated instance, then from the
   repository root run `node scripts/php-migration-fixtures.mjs`. It refuses another
   engine/port, creates a new `upms_test_php_<timestamp>` database and a least-privilege
   runtime account, uses the existing Node migrations/services to construct synthetic
   evidence, captures real Express responses, and writes ignored `.env.testing` plus
   `tmp/php-runtime/contracts.json`. This Node command is local test tooling only.
3. From the repository root, run `node scripts/php-reconciliation-contracts.mjs` to
   capture six reversible synthetic corruption cases against the reference service.
4. In `upms.php`, run `php vendor/bin/phpunit`. The same isolated admin environment
   variable is required for tests that simulate disabled accounts/permission changes.
5. Run `php vendor/bin/pint --test` and `php bin/preflight.php`.

Fixtures refuse overwrite and never drop a schema. Retain previous synthetic schemas
for evidence. The test admin credential is never passed to the PHP application config.
Tests fail if fixtures are missing rather than silently passing without database coverage.

HTTPS is mandatory, including local HTTP contract requests simulated inside Laravel's
test kernel. Forwarded scheme headers are not trusted. Sessions use a separate host-only
`__Host-upms-php` cookie; existing credentials work but Node cookies are not imported.
Tokens are random and stored only as SHA256 digests. CSRF tokens are protected with the
Laravel application key in session JSON. Keep APP_KEY private and stable.

The public inquiry endpoint is inventoried but not converted. The React website and
dashboard remain unchanged. Returns, standalone payments, expenses and corrections return an
explicit pending-review error. See [the migration reports](../docs/php-migration/).

## PHP-2 differential acceptance

Use a separate local MariaDB 10.11.19 test instance on port **3330**, with a new data
directory. Set `PHP_TEST_ADMIN_USER`, `PHP_TEST_ADMIN_PASSWORD` and `PHP2_BINARY` for
that isolated instance/runtime. Optional `PHP2_ARGS` is a JSON array of CLI flags
(for example `["-d","extension=sodium"]`). From the repository root run
`node scripts/php-2-differential.mjs`. Every run creates two new synthetic schemas,
uses the original migrations unchanged, grants a narrowly scoped PHP runtime account,
and executes equivalent Express/Laravel HTTP operations. It never reads owner env files.

The CLI-only `tests/Support/http-bridge.php` executes the actual Laravel HTTP kernel;
it is not a public route or deployment entry point. Fresh PHP processes exercise
restart/replay behavior and concurrency. Fault-injection triggers exist only in the
synthetic schemas and are not application migrations or production requirements.

Browser acceptance uses `scripts/php-2-browser-setup.mjs` to create another fresh schema
and private test config. Start PHP FastCGI on loopback 9084 with its generated env path
in `UPMS_PHP2_ENV`, and a separate Apache TLS listener on loopback 9444 using that test
config and an ephemeral localhost certificate. Then run `node scripts/php-2-browser.mjs`.
No installed Apache/PHP settings, certificates or live website files need changing.

## Deployment review

PHP-3 uses `scripts/php-3-differential.mjs` with `PHP3_BINARY` and optional `PHP3_ARGS`
on the same isolated port 3330. Each run provisions independent Express/PHP schemas.
`php-3-browser-setup.mjs` and `php-3-browser.mjs` exercise actual HTTPS/FastCGI and
the existing React print action. The private wrapper retains `UPMS_PHP2_ENV` as its
test-only environment variable. PHP 8.4.27 requires sodium explicitly enabled
(`-d extension=sodium` on this machine); the installed php.ini was not changed.
See [PHP-3 results](../docs/php-migration/PHP-3-TEST-RESULTS.md).

`deployment/*.example` files are review templates, **not an installable release**.
Keep the source tree outside every document root. Only the reviewed backend entry and
locally built approved React assets belong in web roots. There is no reason to run
Composer, Node, Vite, migrations or an administrator bootstrap on an HTTP request.
Account-specific hosting verification and a reviewed production database profile are
still required; see the hosting report and deployment checklist before any release.
