# P2.3A specialist handoff and status

Historical checkpoint: P2.3B subsequently superseded the specialist-only decision for isolated work. See [verified recovery result](P2-3B-recovery-results.md) and [approved main handoff](P2-3B-main-handoff-plan.md). The owner later approved handoff; the main application now uses the verified port-3309 environment. Original text below records the earlier P2.3A checkpoint.

**Database unhealthy/offline; recovery and P2.3 resumption blocked.** The owner selected “Use a database specialist to recover newer or unrelated data first” after reviewing the isolated logical recovery option. No separate instance was created, no application endpoint changed and no forced recovery was enabled. Do not proceed with the proposed port-3307 option without a new owner decision.

## Evidence preserved for the specialist

- Original `C:/xampp/mysql/data` remains intact. Configuration: `C:/xampp/mysql/bin/my.ini`, data-local my.ini; port 3306; MariaDB 10.4.32. No active MariaDB process, matching service or listener was found in P2.3A checks.
- Full offline snapshot: `server/.local/p23a/offline-20261022T102555Z/`. Data subfolder contains all 1,037 files / 386,257,068 bytes, including system tablespace, both redo files, all table/system files, error log and crash dump. Per-file SHA-256 equality was verified while offline. Configuration and uncommitted source work were copied separately. Current-user/SYSTEM ACL protects the copy. This is a byte-verified safety/evidence copy of unhealthy data, not a certified healthy physical backup.
- Verified logical backups and private evidence from p22/p23 were duplicated under the snapshot's logical-backups-and-evidence folder, with their original checksums confirmed. The pre-P2.3 backup contains 38 P2.2 tables, two migration records and preserved identity/business data. The older pre-P2.2 backup has 11 identity tables. The newer backup's original restore verification was at 14:51:45 Pakistan time on 22 October. It cannot prove preservation of later unbacked or unrelated data.
- Full log diagnosis and safe options: [recovery decision](P2-3A-recovery-plan.md). First future-LSN message: 15:04:27 Pakistan time, page LSN 462394838 versus system LSN 454621927. Times and file metadata are evidence, not proof of a specific copying/deletion event. Windows storage-event review returned no relevant warnings/errors over two days; no filesystem repair was attempted.

No files, backups, private rows or credentials have been transmitted to a specialist or any other recipient. The owner controls access and any extraction authorization. Do not publish the private snapshot or dumps.

## Work and verification

Branch remains `feature/upms-p2-3-inventory-operations`, HEAD `4154efa3d80a3d4d3039e83f2d27d6ba25754e08`. Uncommitted P2.3 implementation and all nine original source assets are preserved. New fail-fast preflight is documented [here](P2-3A-database-preflight.md). The two historical migration files are unchanged.

P2.3A: 125 backend tests passed, zero failed/skipped, including three new preflight unit checks. Real unavailable-endpoint refusal passed with ECONNREFUSED/exit 1. **No positive SQL regressions or inventory browser checks ran in P2.3A.** Previous P2.3 evidence remains 18 inventory SQL checks passed, 101 frontend checks passed and public/build/lint/audit/package checks passed; it is historical evidence, not post-recovery acceptance. Original 17 identity and 16 business SQL regressions remain pending.

Main P2.3 migration and new runtime grants have not run. No administrator recreation, password reset, stock activation, period/cutoff/prefix activation, commit, push, merge or deployment occurred. There is no P2.3 final completion SHA. P2.4 has not started.

## Required specialist outcome before resumption

1. Preserve the original/offline evidence; document actions and any changed/copy sources. Obtain explicit owner authorization before emergency extraction/force recovery. Extraction mode must never host application writes, migrations or acceptance tests.
2. Produce a recovered instance that starts normally with innodb_force_recovery=0. Inspect logs and all table accessibility/consistency; verify exact schema/migration history and identity/business fingerprints against saved baseline. Resolve any missing/newer/unrelated data with the owner; do not silently substitute a smaller dataset.
3. Take a new consistent logical backup and validate isolated restoration, then verify clean normal restart. Report the recovered endpoint and preservation evidence privately. Do not redirect profiles implicitly.
4. Review current migration/grant/test-schema state and approve any required forward endpoint/partial-DDL plan. Preserve failed regression 01; use only fresh approved test targets. Complete original SQL regressions, new inventory SQL/browser checks and reconciliation, then refresh backend/frontend/build/lint/public checks before the requested commit/push. No merge/deployment.
