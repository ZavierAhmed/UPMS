# W06 MySQL foundation planning

Planning only, researched 2026-10-21. No driver/ORM, connection module, schema, migration, authentication or sales/stock/vendor/client/payment entity was added. The public inquiry API retains its process-local delivery protection and does not write inquiries to MySQL. No database/account was accessed or created.

## Hosting and connection prerequisites

The [official managed Node MySQL guide](https://www.hostinger.com/support/connecting-a-hostinger-mysql-database-to-a-node-js-application/) describes creating a database/user in Websites → Dashboard → Databases → Management, retaining the full prefixed names, supplying credentials through environment settings and restarting the app. It recommends **127.0.0.1:3306**, because localhost can resolve to ::1, for which those users may lack access. A remote hostname is for external connections, not a substitute for the managed local endpoint.

That recommendation describes the eligible managed Node environment generally. It has **not been verified for the selected account**: Premium is documented as lacking Express hosting, no eligible account/version is supplied, and no network test was authorized/performed. Before Phase 2, establish account eligibility, assigned database host, actual server version/distribution, InnoDB support, collation/timezone/TLS capabilities and permissions. A future private connectivity test should use synthetic data on a nonproduction database after authorization. Never infer connectivity from a MySQL control-panel entitlement alone.

Future secret names (documentation only): DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME. Use dashboard secrets, full prefixed names and a dedicated least-privilege runtime user. Reserve schema-changing privileges for the approved migration role where the plan allows separate grants. Do not place passwords/connection URLs in source, public frontend variables, logs, ZIPs or inquiry errors. External database access should use approved network rules and verified TLS; do not open a public wildcard remote-access rule. No need to add those variables to W06's running website.

## Capacity and connection budget

The [current resource table](https://www.hostinger.com/support/6976044-parameters-and-limits-of-hosting-plans-in-hostinger/) documents the following comparison; purchased plan/version and dashboard limits take precedence:

| Plan | Database size | Per-user connections | Database count | Managed Express |
| --- | ---: | ---: | ---: | --- |
| Web Premium | 3 GB | 50 | 10 | Not available |
| Business / current Unlimited offer | 3 GB | 75 | 150 | Listed as eligible; existing Business limits may differ |
| Cloud Startup | 6 GB | 100 | 300 | Listed as eligible |

The web table also lists a shared global connection ceiling of 500, 200 MB imports and 16 MB packets; these are limits, not resources reserved for UPMS. Cloud has different import/query budgets. Overall disk, inodes, RAM and other sites also consume the plan budget. Confirm real limits before capacity decisions, especially for historical accounts. The [connection-rate article](https://www.hostinger.com/support/how-to-fix-mysql-operation-not-permitted-error/) reports 20 new connections/second per account; its PHP examples are not Node setup instructions. Apply the general lesson by reusing a bounded pool rather than opening per-request connections.

Proposed future pool: one shared mysql2/promise pool per app process, initially at most five connections with a finite waiting queue and measured acquisition/query deadlines. This is a design starting point, not a benchmark or provider guarantee. Budget total pool capacity across apex/www processes, other websites, maintenance and migration sessions; do not set each pool to the entire per-user cap. Acquire lazily when needed, release in finally, reset session state, bound retries with backoff, avoid reconnect storms and close the pool during shutdown. Parameterize values, allowlist dynamic identifiers, and log only safe error codes/timing. A query timeout must release or destroy the connection safely; don't leave an uncertain transaction in the pool. Reassess pool/backpressure/load with synthetic staging traffic before production.

## Transactions and migrations

[MySQL documents transactional statements](https://dev.mysql.com/doc/refman/8.4/en/commit.html) and the [InnoDB locking/transaction model](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-transaction-model.html). A future coordinated write must use one acquired connection throughout begin/commit/rollback, short transactions and a chosen isolation policy. Do not hold locks while sending email or waiting on external services. Test rollback/deadlock/constraint paths; retry a whole logical transaction only when the operation is designed to be safely retried. These engine capabilities do not verify Hostinger's actual installed engine, version or durability settings.

Choose migration tooling only with Phase 2 requirements. Use reviewed ordered versioned migrations, track their application in the chosen future tooling, apply on a disposable restored copy first, and run one authorized migration job rather than auto-migrating on every web-process startup. Prefer backward-compatible expand/contract changes. MySQL DDL can cause implicit commits; a SQL rollback is not a general migration undo strategy. Preserve an approved recovery backup and a tested forward-fix/restore procedure. No migration files or business schema are supplied in W06.

## Backup, restore testing and retention

The [managed web/cloud backup download guide](https://www.hostinger.com/support/5981435-how-to-download-backups-at-hostinger/) documents weekly backups, daily backups for Business or higher, six-week weekly retention and seven-day daily retention, with database downloads as .sql.gz. Account entitlement, coverage of the actual database/release files, completed backup dates, encryption and restore permissions still need confirmation. Application versions retained by deployment are **not database backups**; overwritten build folders are not durable storage. Keep encrypted off-host copies with access control and checksum records where approved, and verify downloaded backups rather than assuming their presence means recoverability.

[Hostinger's restore guide](https://www.hostinger.com/support/4283700-how-to-restore-backups-at-hostinger/) supports selecting database backups/date and restoring the database; restoration replaces subsequent data. Its one-click whole-website workflow is WordPress-specific and is not the UPMS Express rollback procedure. Database restore must be separately authorized and scoped to the correct database. No restore was run for W06.

Proposed future restore drill:

1. Agree business recovery objectives and identify an encrypted known backup with timestamp/checksum/version notes. Suggested discussion targets are 24-hour RPO and four-hour RTO, not guarantees or measured results.
2. Restore into a new isolated nonproduction database/account with separate credentials and outbound integrations disabled. Do not overwrite the live database for a drill.
3. Verify schema/migration version, row counts, constraints and representative synthetic workflows; validate character encoding/timezone and check that deleted/retained records meet the approved policy. Test transaction rollback and connection exhaustion without real customer traffic.
4. Record elapsed recovery time, recoverable cutoff, errors and responsible reviewer; compare with agreed RPO/RTO. Repeat after material schema/engine changes and on an agreed schedule.
5. Document cutover/reconciliation and preserve the current state before any later authorized real restore. Reapply approved deletions after an old backup is restored; prevent duplicate external delivery.

Retention decisions remain owner approval items:

| Data class | W06 state / future decision |
| --- | --- |
| Public inquiry payloads | No database persistence. Ordinary logs omit customer payloads. Development outbox is private test material, not a customer record system. |
| Future management records | Define purpose, access roles, archive/deletion periods and applicable recordkeeping requirements before schema design; no invented retention duration is enforced. |
| Logs | Choose a short bounded operational retention period; exclude secrets/customer messages, limit access and avoid copying payloads into monitoring tools. |
| Backups | Provider retention above is a documented service window, not a complete business policy. Approve off-host retention, encryption/key custody, deletion propagation and restore access separately. |

Remaining readiness gates: eligible account, measured connection/storage budget, actual server/engine/version/collation, least-privilege grants, verified local hostname/TLS behavior, migration/tool selection, backup coverage, successful isolated restore drill and owner-approved retention/recovery objectives. W06 does not implement any of these database features.
