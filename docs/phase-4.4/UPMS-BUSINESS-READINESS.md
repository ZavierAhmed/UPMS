# UPMS P4.3 — business readiness (actual status, 2026-11-08)

## Verified

- Live `https://app.unique-plastic.com/management` serves the new dashboard but does not permit financial posting.
- Production schema `upms_v2` has 47 tables / 133 guards; receipt `CUMULATIVE_READY`, control `PENDING`.
- Approved encrypted production archive SHA256: `df1ca9b785b4f60a9eb87c93aada5af9ed9b9dae6f51862dc247f94677bc50af`.
- BitLocker D: on physically separate NVMe; portable recovery capsule SHA256: `f4de5d6734c8f20e9ebc2c711bd6a2eecf382cb814f1fe2fb5efdd78b26faa3e`.
- A successful **same-laptop WSL technical recovery rehearsal** returned 47 tables, 133 guards, 87 rows, row identity and financial reconciliation verified, application key recovered without DPAPI.
- `independentOwnerRecoveryVerified` is **false**. No independently signed receipt or approved production activation exists.

## Path to client UAT and production

**Decision in this conversation:** perform client testing against `upms_v2`, then rebuild for real business use. This is not yet safe to execute without a validated post-UAT reprovisioning procedure; do not promise a one-click reset.

1. Commit the local recovery UID fix and BitLocker exporter in an isolated branch; test PHP syntax and production archive restore in an offline fixture. Existing immutable release archive must retain its SHA; make a versioned packet for updated recovery tools.
2. Transfer the encrypted archive, capsule and manifest to a trusted separate computer/account through an encrypted channel. Do **not** transfer the passphrase by the same channel; never send raw keys or DPAPI files. Provision the isolated PHP/Sodium and MariaDB 10.11 offline recovery runtime. Perform restore, verify hash/rows/guards/reconciliation, and obtain an operator-signed report and separate-device/account attestation. Owner must accept the actual result. This cannot be declared complete by the original laptop's WSL test.
3. Produce genuine private recovery and readiness evidence bound to `upms_v2`, hashes and release. Have the owner explicitly approve activation. The original `upms.php/operations/activate-cumulative.php` may run only with its required three private profiles; **never fake flags or manually toggle `v1_control` or migration state**.
4. **Before allowing disposable test transactions on `upms_v2`**, design and exercise a clean rebuild/cutover: take immutable UAT archive, revoke sessions, back up all ledger/audit data, isolate traffic, reprovision empty schema and its distinct installer/definer/runtime accounts, regenerate valid trusted private initialization evidence, rotate credentials, verify 47 tables/133 guards, verify no business rows, then activate only with genuine gates. Test the runbook on an isolated clone first. An SQL `TRUNCATE`/`DELETE` of financial tables is **not supported**.
5. Label all UAT entries disposable; obtain client acceptance. Do not enter real customer balances while UAT is underway.
6. After the clean cutover, verify opening stock, customers, vendors, money accounts, expenses, employee labor/Hafta, cheque behavior, challan numbering, backups, restore, role permissions and reports. Only then record `BUSINESS_READY` in an operational acceptance report. Never infer status solely from HTTP 200/read-only UI.

## Safer alternative

If an independent owner recovery operator is unavailable, a *separate, explicitly authorized hosted UAT release* on `upms_stage_43` with disposable data and an isolated hostname is preferable. This requires a reviewed new integrity-verified application release and staging-only write authorization, **not** editing production approval JSON or impersonating offline synthetic conditions. Preserve `upms_v2` clean for business. The existing production URL could later be cut over after approved UAT and recovery.

## No-touch boundaries

Do not modify public website `https://unique-plastic.com`, live backend, live DB, signed release package, or production profiles in this patch. The scripts in this packet only repair optional-POSIX compatibility and package the encrypted recovery artifacts. Any newly generated packet version has a different manifest and must be treated as such.
