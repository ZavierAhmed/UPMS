# P2.3A recovery decision

**Owner decision:** use a database specialist to recover newer or unrelated data first. The isolated logical-recovery option below was presented and is not authorized for execution. See [current handoff/status](P2-3A-recovery-status.md).

## Preserved state

Branch `feature/upms-p2-3-inventory-operations`; HEAD `4154efa3d80a3d4d3039e83f2d27d6ba25754e08`. All uncommitted P2.3 work remains in place. No migrations or SQL acceptance writes have run in P2.3A.

At inspection no mysqld/mariadbd process, matching Windows service or listener on configured port 3306 was found. Actual configured data directory is `C:/xampp/mysql/data`; the data-local my.ini agrees. No configuration includes force recovery. Free space was approximately 18.7 GB. No disk/Ntfs/storage warnings or errors were returned from the inspected two-day Windows System-event window. This does not prove the filesystem has no defects; no repair/chkdsk was run.

A complete offline copy was created at `server/.local/p23a/offline-20261022T102555Z/data`, with configuration, manifest and receipt in its parent. All 1,037 source files (386,257,068 bytes) matched copy SHA-256 hashes. Process absence was checked before and after copying. The parent permits the current Windows user and SYSTEM only. A separate uncommitted-work copy preserves 43 files, including original untracked source assets. Original logical backups and private evidence remain in their ignored folders.

## Diagnosis and uncertainty

The complete 8,422-line error log was read. It contains 3,777 future-LSN messages. The first is 22 October 2026 15:04:27 Pakistan time: page LSN 462394838 versus system LSN 454621927. Later examples also show system-tablespace and per-table pages ahead of redo. Numerous subsequent startup attempts are logged. The last attempt at 15:15 did not establish a healthy running server. The first future-LSN event follows the earlier stalled isolated DDL.

This is observed InnoDB tablespace/redo inconsistency. A stopped service or port conflict alone does not explain it. Abrupt shutdown/restarts are evidenced; incomplete restoration, copying/replacement of redo or tablespaces, underlying storage faults and engine corruption remain possible causes. File timestamps alone cannot distinguish them. The log's copying warning is a possible explanation, not proof that anyone copied files. No original redo/data file was deleted, regenerated, moved or edited by this recovery task.

Normal startup failure is already evidenced by the supplied situation and recent logs. Repeated startup attempts on the original are not a recovery strategy. No new original-server startup or force-recovery attempt has been made in P2.3A.

## Recommended option: verified logical backup in a separate instance

The newest verified logical backup is `server/.local/p23/upms-before-p23.sql`, 45,989 bytes, SHA-256 `84bee25565e081b6de39f4e71881281820b28120bdfae98a3325ac7cedac6fc5`. It contains the complete 38-table P2.2 owner schema and two migration records. Prior isolated restoration matched all table fingerprints twice at 14:51:45 Pakistan time. The earlier pre-P2.2 backup contains only 11 identity tables and is an older fallback, not an equivalent replacement.

Proposed authorization boundary:

1. Recheck saved backup checksum and checkpoint. Preserve original data directory, offline copy and all failed schemas unchanged.
2. Initialize a NEW empty private instance directory `server/.local/p23a/logical-recovery-01` using the installed MariaDB 10.4.32 binaries. Refuse an existing directory. Use a separate explicit configuration: loopback 127.0.0.1, unused port 3307, all data/redo/log/temp paths within that new directory, no inherited XAMPP data paths, force recovery 0. No service registration or original configuration changes.
3. Start only this explicitly authorized isolated instance for the recovery operation. Restore the verified logical backup into its own `upms` schema once; do not import original table files or original redo. Do not use force recovery. Create private instance-local operator credentials without exposing secrets. No application or acceptance-test writes.
4. Verify normal engine state, all 38 table accessibility/consistency checks, exact row fingerprints, schema/collations/foreign keys, administrator/password/role/session/audit preservation and exact migration history. Stop on any mismatch or engine error. Review new instance logs, make a new consistent logical dump and verify restoration in a new isolated verification schema there. Verify another clean normal restart and repeat checks with force recovery 0.
5. Report what was recovered and what was not. The backup covers `upms` at its checkpoint; it does not reconstruct unrelated databases, later unbacked changes or server accounts. Preserve original data for separate extraction if needed. Do not recreate the administrator or silently discard newer records.
6. Do not change application profiles, switch endpoints, grant main runtime/migrator rights, run P2.3 migration or resume tests until the owner reviews recovery completeness and explicitly approves a forward endpoint/resumption plan. Existing local credentials must not be redirected silently.

This option needs an owner decision because Phase C says to stop and present recovery options after normal startup failure. It is not an authorization to overwrite the original data directory.

## Other options

- Database specialist examines a working copy of the full offline snapshot and storage history to recover newer/unrelated data. This is preferable if records after the logical-backup checkpoint may exist.
- Emergency extraction from a disposable copy under explicitly approved force-recovery settings, only if the verified logical backup is insufficient. No such authorization is present. No application writes, migrations or acceptance tests are permitted there. Any extracted data must be restored and verified on a clean instance running normally before use.

MariaDB documents that recovery mode does not repair corruption and is intended for emergency access/extraction: [official recovery modes](https://mariadb.com/docs/server/server-usage/storage-engines/innodb/innodb-troubleshooting/innodb-recovery-modes). This project deliberately excludes destructive repair recipes, original-log deletion and automatic force recovery.
