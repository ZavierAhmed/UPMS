# P2.3 restore failure: forward verification plan

The approved restore attempt into `upms_restore_p23_20261022` stopped before main migration or runtime grants. Read-only verification at 2026-10-22 09:49 UTC confirmed all 38 main tables readable and every main table snapshot identical to the private pre-backup snapshot. No main table changed. The saved private SQL backup is 45,989 bytes; no backup verification receipt was issued.

The failed restore has one unreadable InnoDB table (error 1932) and 37 missing tables (error 1146). This is a partial restore, not a successful content comparison. Its cause is not established. XAMPP was found stopped during diagnosis and restarted with its existing configuration. That fact does not establish the cause of the restore failure.

## Proposed additional authorization

1. Preserve the failed schema, SQL backup, private diagnostic and original checkpoint unchanged. Do not DROP, TRUNCATE, repair tablespaces, replace InnoDB files, reset accounts, or import into that schema again.
2. Validate the existing private backup checksum against the original checkpoint and verify its 38 CREATE TABLE statements. Confirm main snapshots still match the original checkpoint and both historical migration sources retain their approved hashes.
3. Create only a new isolated schema `upms_restore_p23_20261022_02`, refusing an existing schema. Import the existing saved backup once using the saved Owner profile. Do not create another database account or change server configuration. Use an explicit client error exit status, retain stderr privately, and report only sanitized error codes and the failed stage.
4. Verify all 38 tables are readable, use InnoDB and expected collations, and exactly match the original table counts and row fingerprints. Verify the two original migration records. Close the verification connections, reconnect, and repeat readability and fingerprint checks before issuing a new private verification receipt identifying this exact schema and backup checksum.
5. If import, engine readability or fingerprints fail, stop again and preserve all evidence. No main migration is permitted on a failed restore check. Investigate the XAMPP/InnoDB issue separately; do not attempt destructive recovery.
6. Only a successful verification permits continuation of the already approved additive P2.3 migration and bounded test plan. This plan does not authorize additional test names, owner stock activation, policy activation, server reconfiguration, deployment or merge.

This is an approval checkpoint because the P2.3 brief explicitly says: “If a migration fails after partial DDL, stop and provide a reviewed forward-recovery plan.” The failed restore is treated conservatively as partial DDL. The original approved restore name will not be reused.
