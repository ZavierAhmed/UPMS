# PHP-8.4 GoDaddy go-live result and operator handoff

Baseline: `2bc3e9cfde7ac7765d6ff1b4d347896d9639e695` (PHP-8.3 staging milestone). Branch: `feature/upms-php-8-4-production-go-live`. PHP-8.4 is a milestone label; hosted CLI remains PHP **8.3.36**. The initial desktop checkout was `c769239b0ec4e92bf7e4540693758cc222d31314`; unrelated untracked source assets were preserved and excluded.

## Actual hosted results — 30 October 2026

- Existing `upms_v1` finalized to `SCHEMA_READY` without SQL import or table recreation. A narrow, target/operation-bound owner waiver records that the retired dummy `upms` export has no verified restore. It does not enable runtime or activation. The waiver is retained in private approvals, the finalization receipt and both maintenance audit events.
- Existing provisioner created **admin / Admin / administrator / ID 1** and **haris / Haris / administrator / ID 2**. Read-only verification passed: exactly two users, distinct Argon2id hashes, complete administrator permissions, creation audit and mandatory first-login password changes, zero business rows. Database receipt is now **BOUND**, control remains **PENDING**, posting disabled. Provisioning profile disabled; temporary `upms_maint84` database privileges revoked and verified empty.
- Public website published at https://unique-plastic.com. Dashboard frontend and management gateway published at https://app.unique-plastic.com. All 30 hosted checks passed, including four JS/CSS hashes, HTTPS redirects, management CSP/no-store, hostname isolation and private-path rejection. The SQL API deliberately returns **503** pending activation. Login/session/CSRF behavior and independent real-account authentication remain untested until approved activation.
- Reversible verified prior public copy: `/home/tsn6az96j3v7/upms-php83-staging/public-before-php84`. Retired original files: `retired-public-php84` under the same private staging root. Verified original `payload` release is unchanged. Narrow patch operates in separate `php84-release`, `php84-import-tools`, and `php84-tools` directories.
- Private backend: `/home/tsn6az96j3v7/upms-php83-staging/php84-release/private/backend`. Private `.env` has SQL runtime disabled, host isolation enforced and inquiry SMTP disabled. No Laravel source/vendor/storage/configuration/maintenance tools were published.
- GoDaddy cPanel reports AutoSSL unavailable for this plan. A free trusted Let's Encrypt **YR2** certificate was issued after successful ACME staging validation and installed for `app.unique-plastic.com`; expires **2027-01-28 00:26:02 UTC**. No HTTPS validation bypass or real-password submission occurred. Daily renewal check was explicitly approved by the owner after automatic review initially rejected persistent scheduling. Existing cron entries were preserved; renewal no-op path passed. Job renews below 30 days and pins PHP 8.3 and ACME source SHA-256.
- Genuine NEW production recovery verification passed: private snapshot of `upms_v1`, restored from the persisted artifact to separate `upms_recovery84`; all **20 table definitions and 49 rows** compared equal. No writes to either existing database and no access to retired `upms`. Restore identity privileges revoked. This establishes recovery of the captured clean baseline; it is not evidence of recurring future backups. Protected snapshot contains credential hashes and must remain private. Neither recovery artifact nor secrets are in Git.
- Separate `upms_runtime84@localhost` created with **SELECT only**, protected independent password and disabled runtime profile. Provider scoped grants remain outstanding. Activation was **not** executed.

## Exact next owner/provider action

Send GoDaddy support `deployment/go-live/runtime84-grants.sql` and request execution by a provider DBA against this hosting account's MariaDB instance. The runtime identity already exists. Do not grant ALL PRIVILEGES, GRANT OPTION, DDL, receipt/control-state writes, journal UPDATE/DELETE, or blanket UPDATE/DELETE. The escaped database wildcard in the schema SELECT grant is intentional. Do not apply these grants to the SELECT-only verifier, retired database, or old shared account.

Provider ticket wording:

> Please apply the attached exact table/column grants for existing `upms_runtime84@localhost` on `upms_v1` on hosting account `tsn6az96j3v7`. cPanel exposes database-wide privileges only. Retain least privilege; do not substitute ALL PRIVILEGES or database-wide INSERT/UPDATE/DELETE. Return SHOW GRANTS for that account. No database import, reset, DROP or credential change is requested.

After support confirms, run this exact **read-only** command:

```sh
ssh -T tsn6az96j3v7@unique-plastic.com 'php /home/tsn6az96j3v7/upms-php83-staging/php84-tools/verify-runtime-grants.php'
```

Expected: `passed: true`, all 53 expected privilege entries, no missing/unexpected privileges. This command does not activate production. Current expected failure is 52 missing write privileges, one schema SELECT, no unexpected grants. Return the result to continue the existing `CleanInitialization::activate` workflow using actual recovery/HTTPS/host/release evidence and an exact-operation private activation approval. Recheck hosted security and then both real identities, cookies, CSRF and mandatory password change after activation. Do not put invented `true` flags into the activation gate array. Shared SQL account row scope remains enforced by application authorization, as documented in the existing privilege review.

Do not rerun upload, SQL import, initialization, preparation/provisioning or recovery scripts. Preparers intentionally stop on existing identities/files; preserve partial receipts for review.

## Private credential handoff

Credentials and creation receipt remain only in server-private mode-0600 files. Use SFTP over the already trusted SSH connection to retrieve:

`/home/tsn6az96j3v7/upms-php83-staging/runtime/administrators84.json.handoff`

For example, in the owner's private local directory (outside Git):

```text
sftp tsn6az96j3v7@unique-plastic.com
get /home/tsn6az96j3v7/upms-php83-staging/runtime/administrators84.json.handoff
bye
```

Treat the downloaded handoff as a secret; do not paste it into chat or logs. Accounts cannot log in while the SQL runtime remains disabled. First real login must use trusted management HTTPS and complete the forced password change. No password reset or re-provisioning is needed.

## Validation and limitations

- Unit suite: **37 tests / 1,018 assertions PASS**, independently on local PHP 8.3.36 and 8.4.27.
- Full local suite attempted: **91 tests, 39 errors and 13 failures**. Database fixture unavailable (connection refused), local fixture port mismatch (3328 expected / 3330 configured), plus one MIME vendor assertion. The preserved desktop vendor tree predates the verified Linux release. No unrelated vendor/fixture changes were made to mask these failures. Hosted private Linux MIME test passed all four invalid-name rejection cases.
- Actual hosted account verifier PASS; actual new-schema recovery PASS; hosted HTTPS/routing/assets/private-boundary checks **30/30 PASS**. Source formatting and `git diff --check` passed. Frontend was reused, not rebuilt or redesigned. Source text scan found no conflicting brand references; unrelated supplied assets remained unpublished.
- Missing production runtime grants are the blocking external dependency. Production activation, hosted sessions/CSRF and both live administrator authentications remain pending. SMTP remains disabled until provider settings are approved.
- ACME client: official [acme-tiny](https://github.com/diafygi/acme-tiny), pinned commit `dc2c102314a56580facafce2249b292cebcfc42b`, script SHA-256 `baf36cdd14a5d206875f656539324e4c3ed0988d2799e80307a7632cd1c84f9e`. Private keys, client source, issuance logs and certificates remain server-private. Renewal calls the existing cPanel SSL installation API through JSON stdin, keeping keys out of process arguments.

Sanitized hosted/recovery/privilege evidence is in `docs/php-migration/php84-evidence/`. This report does not claim production activation or login success.
