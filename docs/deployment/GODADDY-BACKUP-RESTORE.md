# GoDaddy backup and recovery acceptance

Status: **unverified and blocked**. Dashboard import availability does not prove consistent export, independent restoration, private storage or recoverability. No GoDaddy backup or restore has been performed.

Before accepting staging, obtain exact controls for consistent InnoDB logical export, schema/triggers/routines, charset/timezone, private export delivery, encryption, scheduled backups, retention and restoration into a **different new database**. Do not store private SQL or credentials under the documented public-assets persistence location. Do not assume shell access, mysqldump, cron or arbitrary external database networking exists.

After separate provider and target approval:

1. Record the staging resource ID, actual MySQL UUID/schema/account/TLS identity and table/migration fingerprints. Use only synthetic data. Pause staging writes for the opening acceptance snapshot.
2. Create a consistent logical export using the verified provider mechanism or a reviewed dedicated backup account. Record SHA256, row counts, migration names, source/journal reconciliation and canonical UTC fingerprints for every table, including identity, permissions and immutable audit evidence. Save the receipt privately; never commit SQL or credentials.
3. Request a NEW isolated restore resource/schema and dedicated restore credentials. Confirm its resource identity differs from source and from all live targets before import. Restore the verified bytes once. If a partial import fails, preserve it and request a forward plan; never reset, drop or repeatedly import into it.
4. Independently inspect the restored engine, table set, migration history, administrator/permissions and all table fingerprints, then run ledger/stock reconciliation. Verify the restore runtime account cannot access source/live schemas. Use UTC comparison sessions to avoid false timestamp differences.
5. Record the source/restore identities, backup hash, fingerprint match, reconciliation, access-denial proof, retention location and reviewer reference. Only a fully verified receipt can support later opening review. Restoration does not itself enable operational posting.
6. Test daily scheduling and alerting on the actual service. Obtain owner retention approval and an encrypted off-host copy. If those controls are unavailable, retain the compatibility-blocked verdict.

Historical source milestone evidence: a separate local Oracle MySQL 8.4.13 staging backup was restored and all 22 table snapshots matched after UTC comparison correction. This is historical **local** evidence, not a new GoDaddy recovery test. Its databases and credentials were not reused by this milestone.

Rollback of this release: keep the previous ZIP, package receipt and Preview settings; restore only that management app's previous code/settings. The diagnostic app makes no SQL writes. Future operational rollback must preserve subsequent transactions and restore into a fresh reviewed target first. Do not invoke destructive migration down, replace a live database with old staging data, or alter the existing public website.
