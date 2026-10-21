# MariaDB local-development acceptance policy

**Owner-approved:** P2.1A selects the existing XAMPP MariaDB server and existing `upms` database for local UPMS development. Installing Oracle MySQL, Docker or another database is not a prerequisite. **Separate evidence:** no Oracle MySQL test result is claimed. P2.1's earlier compatibility results remain historical MariaDB results.

The fresh authenticated inspection on 2026-10-21 identified `10.4.32-MariaDB` at `127.0.0.1:3306/upms`, InnoDB, utf8mb4/utf8mb4_general_ci, UTC application sessions, strict session SQL mode and REPEATABLE READ. These facts were re-inspected rather than inferred from P2.1. The initial preflight found zero tables/views/migration records; subsequent outcomes are recorded in the [provisioning report](P2-1A-database-provisioning.md).

## Explicit compatibility and version gates

`DB_ALLOW_MARIADB_COMPATIBILITY=true` remains mandatory. A new shared `validateEngine()` is used by explicit migrations and by every newly created SQL connection. It rejects malformed versions, MariaDB older than the reviewed 10.4.32 baseline, absent opt-in and MariaDB with `NODE_ENV=production`. The separate pre-existing Oracle MySQL minimum remains 8.0.16. No blanket version bypass or automatic schema migration is introduced.

This is an application compatibility floor, **not a maintenance/security support claim**. Newer MariaDB versions need their own acceptance run; the production block remains until a separately authorized deployment/security decision changes it. HTTPS browser cookie tests use an isolated local TLS server with production-strength cookie settings while the test database configuration remains explicitly local development.

## Maintenance and production limitations

MariaDB Foundation lists the 10.4 series' community maintenance end as **18 June 2024**. The final 10.4 community release was 10.4.34, so XAMPP's installed 10.4.32 is both below that final patch and on an end-of-life series. Passing authentication/integration checks cannot establish production suitability or demonstrate that untested vulnerabilities are absent. Sources: [MariaDB Foundation maintenance table](https://mariadb.org/about/), [official 10.4.34 release notes](https://mariadb.com/docs/release-notes/community-server/old-releases/10.4/10.4.34).

**Production-blocked:** no public listener/deployment, no production SMTP activation, no database upgrade and no hosting-readiness assertion is authorized. XAMPP remains the owner's local development installation. The local management helper binds only to 127.0.0.1 and disables inquiry delivery.

Recommend a separate owner-reviewed upgrade to a supported MariaDB series after assessing XAMPP compatibility, application/migration behavior, backups, restore rehearsal, authentication plugins and grants. Take a verified private backup first; stage the upgrade and compatibility suite on separate infrastructure, define rollback/recovery and obtain explicit approval. This milestone does not perform an upgrade or install another server.

## SQL and grant considerations

InnoDB transactions, unique keys, foreign keys and locking reads are used; DDL/account creation/grants are not assumed transactional. UTC is set through `+00:00` rather than relying on named timezone tables. Session SQL mode is strict; no permissive compatibility SQL mode is enabled. The unchanged reviewed migration creates identity/support/tracking tables only.

The actual restricted runtime must pass both grant inspection and real SQL permission rejection tests. [MariaDB GRANT documentation](https://mariadb.com/docs/server/reference/sql-statements/account-management-sql-statements/grant) documents table-level grants and the need for delegation authority when provisioning. No broad account, wildcard host, audit mutation right or application fallback is allowed.
