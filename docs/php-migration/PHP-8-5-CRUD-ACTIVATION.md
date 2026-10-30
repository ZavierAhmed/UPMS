# PHP-8.5 — GoDaddy CRUD guards and activation approval checkpoint

Baseline: `17601a70172287a8111f7b8acb8a8eb6bb493869`. Branch: `feature/upms-php-8-5-godaddy-crud-activation`. Hosted CLI is PHP 8.3.36; PHP-8.5 is a milestone label.

**Final state: BOUND / PENDING / runtime disabled / posting disabled. Activation has NOT been approved or executed.** The owner explicitly requested a separate approval after guard deployment and verification. Public SMTP remains disabled. The Unique Plastic Industry website, dashboard design, existing administrator credentials and business records were preserved.

## Actual results, 30 October 2026

| Check | Result |
|---|---|
| Authenticated runtime identity | `upms_runtime84@localhost`, verified through the pinned Unix-socket connection and `CURRENT_USER()` |
| Runtime privileges | Exactly SELECT, INSERT, UPDATE, DELETE on escaped exact schema `upms\_v1`; no missing/unexpected privileges, grant option, global/admin, role/proxy, schema-name wildcard, table, column or other-schema grants |
| Separate definer | `upms_guard85@localhost`, independently verified SELECT + TRIGGER only on the exact production schema; runtime never received TRIGGER/DDL |
| Production guards | All **45** installed; exact names, tables, events, BEFORE timing, bodies and definer verified |
| Application data | Full before/after record digests identical; verified backup still matches all 20 tables' data; zero business rows |
| Administrators | Exactly `admin` ID 1 and `haris` ID 2, full administrator catalog, distinct Argon2id hashes, mandatory password changes still required; no recreation or password rotation |
| Actual production negative probes | **28 rejected** with trigger errors; all attempts rolled back, no financial probe rows or committed application writes. Includes existing audit/catalog/user/control/receipt mutations, REPLACE and session-variable/foreign-key disabling attempts |
| Isolated GoDaddy acceptance | **91 checks PASS**, all 45 guard events executed in `upms_security85`; real Laravel CLI HTTP kernel, cookie flags, first-change enforcement, password/session revocation, CSRF/origin, logout, revoked/non-admin roles, immutable documents, item codes, idempotency replay/conflict and valid stock opening/client opening/challan/payment/expense flows |
| Actual hosted Apache/HTTPS checks | **30/30 PASS**, trusted certificates, redirects, assets, private-path denial and public/management host isolation |
| Release integrity | **6,070** original-release/patch file checks plus **120** published files, including both gateways and Apache rules. Original manifest pinned to `059da290b1b4c9f13732daa15b958bb0c5d6db78471d797f62e32bce9ecfb037` |
| Local units | **41 tests / 1,188 assertions PASS** on PHP 8.3.36 and 8.4.27; formatting, patch-source validation and whitespace checks pass |
| Approval safety | Calling activation without an approval digest rejected before database contact; no risk approval/runtime-enable files created |

The isolated positive business transactions exist only in the explicitly separate test schema. They are not production smoke transactions. Production has no financial rows yet: empty financial-table trigger definitions were verified exactly on production, while every corresponding event was exercised against seeded rows on the same GoDaddy MariaDB engine in the isolated schema. Existing production identity/audit/control/receipt rows received actual rejection probes. This distinction is not hidden by the passing report.

Sanitized reports: `docs/php-migration/php85-evidence/`. Secret profiles, keys, SQL passwords, credential handoffs and backup snapshots remain server-private and are excluded from Git.

## Security changes and workflow review

`RuntimePrivileges` adds the separately named `godaddy_database_crud` policy. Original `strict_scoped` remains the default with its original 53 expected entries; CRUD grants do not pass it. Both policies use actual authenticated identity and metadata plus direct-grant checks, not cPanel screenshots. Schema underscores must be escaped: an unescaped wildcard grant fails. Unknown policies, extra privileges, roles/proxies and identity mismatches fail closed. The production connection verifies the selected policy on every new connection; CRUD additionally requires a private, target/digest-bound owner risk approval and verified guard evidence.

`BusinessRecords` now explicitly limits business INSERT targets and UPDATE fields to the existing reviewed write contract. It rejects journal/audit/idempotency UPDATEs, protected control fields, saved identities and unknown mappings before SQL. This supplements SQL guards; it is not represented as a substitute for them.

| Workflow | Preserved application controls and database protection |
|---|---|
| Identity/authorization | Session authorization and permissions re-read under `identity_guard`; forced rotation and version revocation preserved. Runtime cannot insert/delete users or mutate roles, permissions, memberships, identity guard or saved user identity/enabled/created fields. Password changes must increment authorization version exactly once. Public user/role administration remains disabled by existing route policy. |
| Stock/master data | Strict field mapping, generated item codes, stale versions, integer/decimal arithmetic and stock validations preserved. Saved item/party/stock identities and DELETEs protected. Mutable quantities remain writable by shared SQL credentials. |
| Challans/documents | Supported-kind validation, DRAFT-only edit/post/cancel, snapshots, price/party versions, exact totals, opening/date checks and correction-by-new-document behavior preserved. SQL rejects UPDATE of any posted/cancelled document and DELETE of every document. New document INSERT must be DRAFT. |
| Journals/financial history | Runtime UPDATE/DELETE rejected on lines, stock journals and party journals. Existing reversal/return/correction operations append new rows; no financial rules were loosened. Valid isolated postings confirm compatibility. |
| Numbering/control | Existing transaction mutex, counters and numbering logic preserved. Runtime cannot change state, operator, version, entry version or cutover evidence; counters cannot decrease. Item counter may advance across existing codes as the original algorithm requires. |
| Audit/idempotency | Existing audit actions, actor attribution, command fingerprint/actor binding, rollback and replay/conflict behavior preserved. Existing audit and command rows cannot be updated/deleted by runtime. |

There are 18 frozen catalog/receipt triggers, 12 append-only history triggers, 6 user/control triggers, 3 document triggers and 6 master/stock identity triggers: **45 total**. The trigger conditions use the connected username, not a caller-set session variable. Runtime cannot drop/replace the guards because it lacks TRIGGER and other DDL privileges. cPanel supports a separate SELECT+TRIGGER identity; the actual server has binary logging disabled, and the isolated/live tests demonstrated this configuration without granting SUPER or DDL to runtime.

MariaDB describes transactional trigger execution and notes that TRUNCATE does not invoke triggers. Runtime lacks the DDL privileges needed for that operation, and the exact grant checker rejects such privileges. [MariaDB trigger overview](https://mariadb.com/docs/server/server-usage/triggers-events/triggers/trigger-overview).

## Residual risks requiring the owner's activation decision

These are real limits, not equivalent application/database guarantees:

1. **Direct SQL can fabricate INSERTs.** Stolen runtime credentials or SQL execution compromise can insert false lines, journals, audit events or idempotency receipts, including new rows referencing existing posted documents. Existing rows cannot be changed/deleted, but that does not make ledger totals or historical truth tamper-evident. Full business validation/actor attribution of arbitrary direct INSERTs is not enforced by these guards.
2. **The shared SQL identity is not per-user row isolation.** It can change any user's password using an allowed version increment and manipulate sessions. The API restricts password changes to the authenticated user's current-password flow; the database cannot identify that application actor. SQL can also insert misleading rotation/password-change audit events.
3. **Mutable state remains mutable.** Direct SQL can change stock, draft content, allowed master fields and advance counters, bypassing application validation and reconciliation. The API exposes only authorized business operations, and existing transaction/idempotency rules remain intact, but they cannot secure arbitrary SQL using valid shared credentials.
4. **Privileged hosting/maintenance compromise is outside runtime isolation.** The guards restrict runtime, not trusted maintenance/hosting administrators. Compromise of PHP/SSH/cPanel or the separate definer secret can bypass/remove protections. Protected files and separate SQL identities reduce exposure; they are not protection against full hosting-account compromise.

Recovery evidence is genuine: the PHP-8.4 snapshot was restored independently to `upms_recovery84` and all 20 definitions/49 rows matched. This milestone revalidated its digest and verified all live application data still matches it. It did not reimport production SQL or rerun a production restore. That snapshot predates the new triggers: recovery must also reconstruct the 45 guards from this integrity-bound release and verify the definer/grants before enabling runtime. Guard reconstruction and all event paths were tested on the isolated GoDaddy schema. This is baseline recovery evidence, not a claim of automatic recurring/off-host backups.

## Exact commands and the owner's next decision

Minimal deployment was **already executed**. Do not repeat staging upload, SQL import, initialization, administrator provisioning, guard installation or test fixture creation. The reproducible private patch commands are provided for review/recovery, not as an instruction to repeat completed deployment:

```powershell
pwsh -NoProfile -File .\deployment\go-live85\deploy-patch.ps1 -Mode Validate
# Only when a reviewed patch actually needs applying:
pwsh -NoProfile -File .\deployment\go-live85\deploy-patch.ps1 -Mode Deploy
```

Read-only current privilege/readiness verification:

```sh
ssh -T tsn6az96j3v7@unique-plastic.com 'php /home/tsn6az96j3v7/upms-php83-staging/php85-tools/verify-grants.php --policy=godaddy_database_crud'
ssh -T tsn6az96j3v7@unique-plastic.com 'php /home/tsn6az96j3v7/upms-php83-staging/php85-tools/verify-readiness.php'
```

The **next required action is explicit owner approval** of activation and the residual risks above. Current readiness digest is `aea5e4bfa45cb5838aae668209dad2c8c9fff4a40670acc22098cf4ded58e980` (report verified 30 October 2026, 07:54:29 Pakistan time). The following command is prepared but **NOT EXECUTED**. Running it constitutes explicit activation/risk approval; do not run before that decision:

```sh
ssh -T tsn6az96j3v7@unique-plastic.com 'php /home/tsn6az96j3v7/upms-php83-staging/php85-tools/activate.php --owner-approve=aea5e4bfa45cb5838aae668209dad2c8c9fff4a40670acc22098cf4ded58e980'
```

Activation recomputes real readiness, refuses a stale digest, records private approvals/intention and an environment backup, grants temporary maintenance-only SELECT/INSERT/UPDATE to the existing maintenance identity, invokes existing `CleanInitialization::activate` with genuinely checked gates, revokes those maintenance privileges, and only then selects the approved runtime profile. SMTP stays disabled. Partial failures require private intent/state review; do not reset/reimport/re-provision or blindly retry. To urgently disable after a partial/successful activation, restore the full private pre-activation environment configuration, including removal of the production-profile selection; flipping only `UPMS_ENABLED` is insufficient when a production profile is selected.

**Pending after explicit activation approval:** real hosted logins for both existing administrators, mandatory password changes with private updated handoff, session rotation/revocation, hosted CSRF/logout/permissions and host isolation. No actual stock/sales/payment transactions will be created for that live smoke test. The isolated kernel tests do not claim those real-account Apache tests already happened.
