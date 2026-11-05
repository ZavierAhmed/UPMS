# UAT-2A cheque clearance and workflow correction

The verified local and remote starting commit was `8a4d78823c9bc376e7ed091d7a144b531af3d6b1` on `feature/upms-uat2-cheque-management`. Work is on `feature/upms-uat2a-cheque-ux-clearance`.

The active PHP Simple V1 path now provides useful clearance rejection messages, a read-only readiness panel, server-generated business references, protected live identity checks, searchable issuing banks, an audited bank popup and optional encrypted lifecycle attachments. The customer credit and bank credit still arise together only on complete clearance.

Boundary acceptance also found a register aggregation error after multiple individually valid large instruments. Totals now accumulate the existing exact integer cents and format the sum once. Individual cheque validation and the existing output overflow bound remain in force. The full-register HTTP test independently recomputes every status total.

## Clearance diagnosis

Verified baseline HTTP reproductions expose two independent blockers. Missing exceptional self-approval justification returns 403 without a business message. Supplying justification exposes the postdated-cheque rejection as a vague 409. The corrected responses explain the approval requirement or the cheque date and preserve a diagnostic reference. The historical owner's exact first rejection cannot be certified because that request reference was unavailable. Full evidence and the investigation matrix are in [the root-cause report](CLEARANCE-FAILURE-ROOT-CAUSE.md).

## Versioned extension

| Item | Existing owner workspace | UAT-2A extension |
| --- | --- | --- |
| Tables | 44 | 47 |
| Guards | 124 | 133 |
| Base cheque version | uat2-v1 | uat2-v1 retained |
| Extension receipt | Absent | uat2a-v1 |
| Recovery format | UPMS_INCOMING_CHEQUE_CLEARANCE_SNAPSHOT_V1 | UPMS_CHEQUE_EVIDENCE_SNAPSHOT_V2 |

The three additive tables are `cheque_extra_receipts`, `cheque_bank_creations` and `cheque_attachments`. Nine new native guards protect these tables. The original issuing-bank INSERT guard is replaced with a requirement for a matching immutable creation claim. All 123 other original guard definitions remain identical. Runtime retains database-scoped CRUD and receives no DDL privileges.

The original 44-table paths remain available with `UPMS_CHEQUE_EXTRAS_ENABLED=false`. The enabled extension requires its exact schema hashes, receipt, complete guard set and target-bound runtime proof. Existing financial numbering, instrument IDs, references, journal sources and posted receipts are retained. Original records without attachments continue to reconcile.

The actual authenticated connection initially exposed inherited PUBLIC administrative privileges on the local sample `test` and `test\_%` scopes. Both scopes had zero tables. The local-only hardening operation revoked those two sample grants after verifying the pinned engine, preserving every account-specific grant and all three owner workspaces' row fingerprints. The new UAT-2A readiness check consumes the authenticated connection's complete `SHOW GRANTS` output and requires only its exact database CRUD grant plus global USAGE. Native CREATE denial and a fresh effective-grant check then passed. PUBLIC privileges apply to all users and are included in their own SHOW GRANTS output. [MariaDB's official PUBLIC-role explanation](https://mariadb.org/grant-to-public-in-mariadb/)

## Existing owner data

The fixed port 5196 binding is `upms_test_php_money_1793855531203`. Its encrypted pre-upgrade backup authenticated and independently restored all 127 source rows. A restore-copy rehearsal reached 47 tables and 133 guards, preserved every original row and verified all 123 unaffected guard definitions. The protected environment and recipient use Windows DPAPI CurrentUser. Source row fingerprints and sensitive recovery material remain in the protected local workspace.

The existing owner database has not been migrated. Section 10 of the UAT-2A request requires separate explicit UAT-only authorization. [The generated SQL review plan](OWNER-UPGRADE-PLAN.sql) targets that local schema. Fresh backup, restore, source-fingerprint verification, a maintenance window, approved DDL execution, exact guard verification and publication of the matching local configuration are the remaining owner upgrade steps.

A separate manual preview is provided on port 5197. It has its own binding, credentials and assets. Its setup page asks the owner to choose a new synthetic password. It must not be described as an upgrade of the data on 5196. The launcher's real Chrome first-setup and restart results are recorded in `evidence/browser/startup.json`.

## Verification

The supported PHP runner regenerated the date-sensitive synthetic contracts and used the pinned port 3330 engine. It passed 169 tests and 1,912 assertions. React passed 308 tests across 43 files. Management lint and build passed. The first direct PHPUnit invocation had stale date contracts and the default security-test port, so that invocation failed. Its environment was corrected through the established runner before reporting the passing result.

The extension HTTP suite covers bank concurrency, normalization, encrypted PDF/JPEG/PNG evidence, malformed and active-content rejection, authorized downloads, native mutation rejection, same-instrument concurrency, optional file absence and a late SQL failure after canonical payment writes. Separate HTTP tests changed the customer and bank balances after readiness, verified current-balance posting and blocked stale receivable coverage. Concurrent normalized identity registration accepts one same-account instrument and permits separate accounts. The temporary fault was injected only into an isolated fixture's attachment trigger. The exact original definition was restored and verified afterward. Recovery tests cover altered metadata, missing evidence, wrong keys, incompatible formats and ciphertext tampering.

Prior cheque, legacy, bank-opening, session, CSRF, password-change, stock, money, expense, Hafta, refund, reconciliation, fault and recovery suites passed. Their outputs use `evidence/prior-uat2` and preserve previous milestone evidence. Real Chrome exercised five screen widths, popup draft preservation, browser Back, duplicate disabling, actual HTTP interruption and protected binary downloads. Final PDFs were rendered and inspected. [UI acceptance](UI-ACCEPTANCE.md) identifies the artifacts and remaining limits.

## Operational limits

Operational attachment activation remains blocked because malware scanning is unavailable. Content, MIME and structure checks are recorded accurately as validation. The application encryption key must accompany protected recovery through separate key custody. Windows profile loss and a separately operated recovery identity require an approved recovery arrangement before operational use.

Application authorization remains distinct from the native UPDATE/DELETE protections. Shared runtime SQL credentials still allow fabricating permitted INSERT workflows and actor identities. Physical bank clearance is a human evidence and authorization decision. Existing operational owner/accountant approval remains pending. Production deployment and hosted migration are outside this release.

Changed files are listed in [the release inventory](CHANGED-FILES.txt). Test commands are in [the owner retest guide](OWNER-RETEST-GUIDE.md). The final completion message reports the commit and independently verified remote HEAD.
