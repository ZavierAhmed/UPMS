# P2.3B recovery verification

**Verified recovery and owner-approved development handoff completed. P2.3 is locally test-accepted with operational activation pending.**

Owner P2.3B authorization superseded the earlier specialist-only decision for investigation and isolated recovery. It did not authorize changing UPMS's main endpoint or replacing the original directory. The later conditional owner approval authorized the reversible endpoint handoff; the original directory was not replaced.

## Preservation

The P2.3A offline snapshot's 1,037 file hashes were reverified before recovery. The original data directory still contains the same 1,037 files and every original hash matched again at 16:04:24 Pakistan time on 22 October 2026. No original files or redo logs were deleted, replaced or repaired. All failed recovery copies and all existing synthetic schemas remain preserved. Logical-backup checksums matched their original verification receipts. At the recovery checkpoint source was uncommitted on feature/upms-p2-3-inventory-operations at HEAD 4154efa3d80a3d4d3039e83f2d27d6ba25754e08.

Private evidence/configuration/process records are under server/.local/p23b, protected by current-user/SYSTEM ACL. Scripts and retained diagnostics contain no committed passwords. DPAPI profiles supply secrets through temporary process environments; no passwords were placed in arguments or public reports.

## Diagnosis

The physical snapshot reproducibly contains InnoDB pages with LSNs ahead of its system redo LSN. This establishes inconsistency, not the historical event that caused it. The inspected alternate XAMPP backup redo/tablespace files date from 2019; they are not a validated matching generation for the 2026 data and were never mixed into recovery.

Fresh physical-copy normal startup failed. Low-level extraction copies at recovery modes 1, 2 and 3 did not yield readable SQL endpoints; their outcomes/logs are retained. Additional risks were written before levels 2/3. Levels 4–6 were not attempted.

Console-mode diagnostics exposed another concrete failure: mysql.roles_mapping had incorrect file format and prevented privilege-table initialization. Standalone launches also failed to complete the ready/clean-shutdown lifecycle; an empty console-mode probe completed both. This launch-mode observation does not prove the original corruption's cause. One fresh logical candidate separately encountered mysql.db Aria corruption, and another failed clean shutdown; neither is certified or adopted. They remain preserved, and only their precisely recorded disposable processes were stopped after normal shutdown failed. No original XAMPP process was terminated in P2.3B.

A fresh physical copy started for extraction with force recovery **0**, read_only=ON and skip-grant-tables, bound only to loopback port 3307. This bypassed the corrupt server privilege tables without editing them. It received no application traffic and was shut down after extraction. No bypass/recovery process remains running. The physical copy itself is not healthy or approved for operational use.

## Data preservation assessment

All 38 upms tables were readable from that physical copy. Using a UTC SQL session, all 38 table-content fingerprints, engines and collations matched the verified pre-P2.3 checkpoint exactly. Missing tables: 0. Missing rows: 0. Additional/changed rows: 0. Initial migration-tracking differences were session-timezone presentation of TIMESTAMP values; a separate retained UTC extraction resolved them exactly.

This includes the existing administrator and password hash, user-role assignment, 16 identity audit rows, 10 sessions, login history, all role/permission rows, four categories, business foundation and both migration records. No newer legitimate UPMS records were found in the readable physical data. No extracted rows were merged or silently discarded. This is not a forensic guarantee about unreferenced/unreadable orphan pages, but no expected UPMS table/row was unreadable or missing.

Unrelated data was also retained: emabot had 37 readable tables and a complete streaming logical export of 134,006,057 bytes; phpmyadmin had 19 readable tables and a complete 14,505-byte export; test had no tables and a complete empty-schema export. An earlier buffer-limited emabot dump is explicitly marked incomplete and preserved separately; it was superseded by the complete streaming export, never treated as complete. These exports have not been restored/accepted into UPMS. All original unrelated databases and synthetic test schemas remain in the unchanged original directory and offline snapshot. Corrupt original server privilege tables are not being adopted into the recovery candidate.

## Verified candidate

| Property | Verified result |
|---|---|
| Endpoint/database | 127.0.0.1:3309 / upms |
| Instance directory | server/.local/p23b/console-probe-03 |
| Version | MariaDB 10.4.32, local development only |
| Launch | Explicit isolated configuration, --console, hidden process and retained stdout/stderr |
| Recovery/bypass settings | innodb_force_recovery=0; no skip-grant-tables |
| Owner tables/history | 38 tables; original two migration records |
| Table checks after clean restart | 68 UPMS and system tables passed extended checks |
| Relationships | 54 foreign keys checked; 0 orphan rows |
| Baseline/physical comparison | All 38 table fingerprints matched both sources |
| Administrator | Original single administrator preserved; no bootstrap/reset |
| Runtime grants | Exact baseline 36-table rights; no global/DDL/delegation rights |
| Migrator | Dedicated localhost account, schema-scoped rights |
| Consistent logical backup | Complete; isolated restoration matched all 38 fingerprints |
| Normal restart | Clean shutdown and normal restart passed; new startup has no corruption/error entries |
| Main profiles | At certification, all still pointed to 3306; after explicit approval all three use 3309 |

After restart, both saved dedicated Runtime and Migrator credentials authenticated directly to the expected localhost accounts on port 3309 and read the preserved administrator count. These were database-account checks, not UPMS application logins or milestone SQL acceptance tests.

The candidate was created by mysql_install_db.exe into a new directory, never by replacing the original tablespace/redo. Its successful backup SHA-256 is 84bee25565e081b6de39f4e71881281820b28120bdfae98a3325ac7cedac6fc5. Fresh dedicated server accounts were configured from saved private profiles; existing UPMS application user records/passwords were restored unchanged. Original wildcard server accounts remain untouched in the original environment and are not recreated broadly in the candidate.

## Commands and reproducibility

Exact instance configs, recorded PIDs, startup logs, per-table extraction outcomes, fingerprint receipts, grant/relationship proof and certification.json are retained in the private recovery folders. Recovery helper scripts are retained privately with checksums. Commands used the installed C:/xampp/mysql/bin binaries. New-instance initialization supplied only --datadir, --port and --silent, with no service registration/password arguments. Each launch supplied its exact --defaults-file; the successful launch used --console with separate per-start output logs. SQL imports/dumps used explicit loopback endpoints, private MYSQL_PWD, single-transaction dumps and no destructive import/schema-switch statements. Password changes concerned only newly initialized instance-local root accounts; the UPMS administrator password was never changed.

Official guidance consulted: [InnoDB recovery modes](https://mariadb.com/docs/server/server-usage/storage-engines/innodb/innodb-troubleshooting/innodb-recovery-modes) and [REPAIR TABLE](https://mariadb.com/docs/server/reference/sql-statements/table-statements/repair-table). No REPAIR statement was executed. Forced recovery does not repair corruption; candidate certification requires normal mode and independent verification.

## Resumption outcome

The owner conditionally approved the documented handoff. Main profiles now use port 3309, with old encrypted profiles preserved for rollback. A new consistent backup restored exactly before additive migration. Main now has 44 tables/three migrations; all previous rows remain and all six inventory tables remain empty. The original administrator/password and signing key are preserved. Runtime authenticates with the exact 42-table restricted allowlist; local UI serves loopback port 3000.

Final acceptance: 125 backend, 101 frontend, original 17 identity SQL, original 16 business SQL, and 20 inventory SQL/browser tests passed with zero failures/skips in final runs. Main/synthetic reconciliation matched. Build/lint, zero-vulnerability audits, public browser/Lighthouse and package integrity checks passed. Historical failed attempts and supplemental approval are recorded in the concurrency/test report.

No owner stock, cutoff, periods or prefixes were activated. No merge, deployment or P2.4. See the final P2.3 executive summary for delivery and remaining operational decisions.
