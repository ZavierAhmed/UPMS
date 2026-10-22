# Operational decisions and remaining risks

1. **Activation pending:** owner must explicitly accept cutoff, open period, four distinct prefixes and justified item starting states. Main inventory, periods and policy acceptance remain empty. Synthetic acceptance does not activate owner stock.
2. **Original environment unhealthy:** development now uses verified upms on port 3309. Original data/configuration/snapshots remain preserved. Rollback preserves later candidate data and leaves the app offline while port 3306 is unhealthy; never switch a running app blindly.
3. **Historical cause uncertain:** future-LSN inconsistency and corrupt server privilege tables were reproduced. Console launch completed normal lifecycle where standalone attempts did not; that observation does not prove the original cause. All 38 readable UPMS fingerprints matched; no identified UPMS loss. Unreferenced/unreadable orphan pages cannot be ruled out forensically.
4. **Historical openings deferred:** NEW_ITEM_ZERO applies only to a genuinely new item with explicit no-history attestation. Reconciled historical imports/cutover remain P2.8. Missing balances are unverified.
5. **Condition disposition unresolved:** quarantined/damaged stock stays separate. Inspection/release/reuse/transfers/returns actions remain disabled; no automatic availability conversion.
6. **Correction scope:** partial/full inverse production/consumption corrections are supported. Replacement variants, additional quantities and corrections of corrections require reviewed rules.
7. **Guards retained:** small local benchmark does not establish production throughput or justify removing serialization. Production workloads require separate review.
8. **Local engine/operations:** MariaDB 10.4.32 acceptance is development only. Candidate uses explicit private configuration and console launch, no service/production changes. No automatic MariaDB repair/startup was added to the app/preflight.
9. **Independent review next:** inspect this milestone and recovery/handoff evidence before further work. Failed schemas and original source assets remain preserved. No merge, deployment or P2.4.
