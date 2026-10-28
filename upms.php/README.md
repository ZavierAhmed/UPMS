# Unique Plastic Industry PHP API

Laravel **13.39.0**, PHP **8.3+**, MariaDB **10.11**, native PDO prepared statements.
This first migration milestone is for isolated testing and review. It cannot connect
to the owner schema. No hosting release or financial-write cutover is authorized here.

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
dashboard remain unchanged. Simple V1 financial/master-data write routes return an
explicit pending-review error. See [the migration reports](../docs/php-migration/).

## Deployment review

`deployment/*.example` files are review templates, **not an installable release**.
Keep the source tree outside every document root. Only the reviewed backend entry and
locally built approved React assets belong in web roots. There is no reason to run
Composer, Node, Vite, migrations or an administrator bootstrap on an HTTP request.
Account-specific hosting verification and a reviewed production database profile are
still required; see the hosting report and deployment checklist before any release.
