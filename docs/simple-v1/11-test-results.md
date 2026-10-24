# V1 verification results

Evidence date:24 October2026, Asia/Karachi. MariaDB10.4.32 compatibility on recovered3309, normal recovery mode. Oracle MySQL certification is not claimed.

| Check | Result |
|---|---|
| Backend unit/regression |167 passed (162 retained +5 V1 arithmetic, numbering, cookie isolation, compressed-input and XLSX checks)|
| Frontend baseline |166 passed|
| V1 SQL target01 |22 passed|
| V1 SQL target04 |27 passed, including real lost-COMMIT replay|
| Final V1 SQL target05 |28 passed, including independent-key duplicate-reference rejection|
| Actual V1 browser target06 |25 workflow checks passed;4 download events are not additional checks|
| Additional target06 browser checks |4 passed: draft revision/cancellation, unsaved values, ledger return|
| Read-only populated browser review |14 checks; actual XLSX and printed PDF verified|
| Legacy cross-module full07 |134 passed (original133 plus Round3 browser case)|
| Legacy identity/business/inventory/purchasing |Identity17, business17 (16 original +1 metadata API), inventory20, purchasing29 passed|
| Build/lint |Passed|
| Public W06 |66 routes/viewports +22 interactions passed; Lighthouse96/97/97/98 performance, all other categories100|
| Security audits |Backend/frontend0 vulnerabilities; body-parser2.3.0→2.4.0 compatible transitive fix|
| Extracted package |Final candidate118 files passed checksums, corruption rejection, native hashing,11 public routes,7 private probes, SMTP disabled; commit-bound repeat required before push|

Private artifacts/logs: `tmp/simple-v1`, earlier verification logs in `tmp/ui-r3`; encrypted profiles, logical backup, restore fingerprints and operation receipts: `server/.local/simple-v1`. All are ignored. Source/checkpoint and required reports are in Git; private credentials and source business files are excluded.

Preservation-v2 verifies actual restore DATABASE() identity and exact111-table content/row-count fingerprints against protected main. Earlier comparison evidence is retained but superseded after an ineffective Knex connection override was discovered by the fault test. Target03 is retained as failed test evidence; corrected target04 and05 passed. Targets01–06 are never reset/reused. The owner explicitly approved05/06 and three additional legacy targets after automatic approval review rejected the earlier bounds.

No production activation, main migration, merge or deployment. Owner visual approval/manual UAT and real-company opening/numbering cutover remain pending.

Final preservation: all111 protected main-table fingerprints and eleven migration records matched the pre-V1 baseline. One original administrator,109 old runtime scopes, seven private profiles and both1037-file original/offline recovery snapshots were preserved. No V1 tables were added to main. The final demo read-only run confirms all ten V1 table fingerprints unchanged.

Legacy inventory08 and purchasing02 remain preserved after helper timing failures: clicks were attempted while read-disabled, not accounting failures. Owner-approved new inventory02 and purchasing03 passed20/29 unchanged assertions with enabled/visible waits. Earlier failed test attempts are retained and excluded from pass counts. No populated suite was reset/reused.

Actual XLSX downloads were reopened: client closing19000 and vendor−12000, with six rows per exported ledger. The non-priced delivery note was checked for one-page layout, six columns, identity, signatures and absence of Rate/Amount, then rendered and visually reviewed. Screenshot inventory: dashboard, client/vendor ledgers, mobile challans and internal challan under ignored tmp/simple-v1/demo and06. Owner visual approval/manual UAT remain pending.

Final read-only browser review also verifies the actual Settings reconciliation button and logout→Back→relogin to the retained deep link. Its14 checks exclude four download lifecycle events. CSRF/idempotency memory clears on logout/expired sessions; the V1 cookie name remains separate from legacy ports.
