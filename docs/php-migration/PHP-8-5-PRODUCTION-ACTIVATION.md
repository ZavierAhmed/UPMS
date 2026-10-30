# UPMS controlled production activation — 2026-10-30

Production is **ACTIVATED / READY**, using the existing PHP-8.5 milestone deployment on hosting PHP **8.3.36**. Runtime SQL is enabled. SMTP remains Disabled. Existing administrators and database records were retained; no SQL reimport, administrator recreation or staging-package reupload occurred.

The owner explicitly approved controlled activation with the documented CRUD residual risks. The existing activation script reran readiness immediately before activation and matched approved digest `aea5e4bfa45cb5838aae668209dad2c8c9fff4a40670acc22098cf4ded58e980`. Activation returned success. Do not rerun activation or provisioning commands.

## Actual live results

- Final read-only check at 03:43:45 UTC: migration receipt ACTIVATED, business control READY.
- Authenticated identity `upms_runtime84@localhost`: exactly SELECT, INSERT, UPDATE and DELETE on `upms_v1`; four expected/four actual, no missing or unexpected privileges. Policy `godaddy_database_crud`; original strict policy remains available.
- All **45** guards match expected definitions; separate definer privileges verified. Guard hash `7047bb1d5bce5b1208330594cb88478248a9f0cd10ceab09bd0ab34d4cdbce13`.
- Release integrity: **6,070** file checks and **120** published files passed. Patch digest `43c400571ed2bc99a1e8421ec336b7e212817a16665cf7bf172d0f01a50c6909`.
- Both `admin` (ID 1) and `haris` (ID 2) logged in independently. Mandatory first-login restrictions, CSRF and origin rejection, password changes, old-session revocation and login with each new password passed. Secure, HttpOnly, SameSite=Strict, host-only cookies verified.
- Subsequent acceptance completed **32 checks**, including authenticated reads, reconciliation, disabled arbitrary identity mutation, independent sessions and logout/revocation. Both test sessions logged out.
- The initial acceptance harness omitted mandatory `kind` on a parties query; the API correctly returned HTTP 400 `INVALID_PARTY_KIND`. That harness run failed after recording completed password rotations. The corrected CLIENT/VENDOR queries and continuation passed without repeating password changes. This failure is retained in the acceptance receipt; it is not reported as a passed initial run.
- All **30** post-activation trusted HTTPS, frontend asset, security-header, private-path and public/management isolation checks passed. Four served JS/CSS assets matched source hashes. Public management APIs, management public inquiry API and public `/dashboard/` were blocked.
- All nine business tables remained empty, with identical before/after fingerprints. No stock, challan, payment or ledger transactions were created.
- Earlier security evidence remains applicable: 28 production rollback probes, 91 synthetic checks and 41 unit tests / 1,188 assertions. The synthetic financial flows were in a separate test database, not production. Final checks confirm guards and release have not changed.

Sanitized actual receipts are in [php86-evidence](php86-evidence). The previous guard, recovery and security assessment is in [PHP-8-5-CRUD-ACTIVATION.md](PHP-8-5-CRUD-ACTIVATION.md).

## Protected off-host backups

The owner selected encrypted backups on this Windows computer. Two manual consistent read-only snapshots were encrypted on GoDaddy, copied off host, checksum checked and fully authenticated/decrypted in memory on Windows. Each includes all **20 tables**, schema, rows and all **45 guard definitions**. No plaintext dump file was written, no production database writes were made, and the private encryption key was never uploaded.

Latest verified archive: `upms-20261030T033601Z-6499730cff6b.upmsbk`, 53,912 bytes, SHA-256 `79e91b2b66732ff535eecddfd93cbccd25a2656015a0bd9650b8e9afe9cb9182`. Its metadata receipt is committed; ciphertext and keys are ignored by Git.

Destination: `C:\Users\zasah\source\repos\UPMS\tmp\protected-offhost-backups`. ACL permits only the owning Windows user and SYSTEM. The recipient private key is wrapped with Windows DPAPI CurrentUser. Encryption uses sodium secretstream XChaCha20-Poly1305 with a fresh sealed data key and authenticated final record. Crypto negative tests rejected modified ciphertext, a truncated final tag and appended bytes; the original archive remained unchanged.

Hourly Codex heartbeat **UPMS encrypted off-host backups**, ID `upms-encrypted-off-host-backups`, is ACTIVE, using PowerShell 7 and owner identity. Failures notify the owner. No scheduled tick has executed yet; two manual runs have passed. This is a local schedule: Windows, Codex, network, SSH credentials and the owner profile must remain available. Monitor freshness; a sleeping/offline computer cannot perform backups. All archives are retained; no automatic deletion is configured. Preserve the Windows profile and DPAPI key store securely: losing them loses access to these encrypted backups.

The earlier independent recovery restore passed (20 tables/49 original rows). The new encrypted archives passed full cryptographic, schema, row-count and guard validation. **An additional end-to-end restore of the new format has not been executed.** Automatic approval review rejected creation of an additional persistent remote recovery database/user because it duplicates sensitive production records beyond the backup authorization. Separate owner approval was requested. The isolated restore tool is prepared, but must not be run until that approval arrives. Do not label this rehearsal passed or treat local authentication as proof of a complete restore.

## Owner commands

Run from the existing repository using PowerShell 7 as the owning Windows account. These commands perform backup or read-only checks; they do not reactivate production.

```powershell
Set-Location C:\Users\zasah\source\repos\UPMS
& 'C:\Users\zasah\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe' -NoProfile -File .\deployment\operations\backup-offhost.ps1 -Mode Run
Get-Content .\tmp\protected-offhost-backups\last-success.json
ssh -T -o BatchMode=yes -o StrictHostKeyChecking=yes tsn6az96j3v7@unique-plastic.com 'php /home/tsn6az96j3v7/upms-php83-staging/php85-tools/verify-final.php'
ssh -T -o BatchMode=yes -o StrictHostKeyChecking=yes tsn6az96j3v7@unique-plastic.com 'php /home/tsn6az96j3v7/upms-php83-staging/php85-tools/verify-active.php'
```

Current administrator passwords are in the **private, mode-0600 server handoff** `/home/tsn6az96j3v7/upms-php83-staging/runtime/administrators-production.handoff.json`. Retrieve through the existing authenticated SFTP connection into an owner-protected location. Do not paste its contents in chat, logs or Git. Previous initial-password handoffs are obsolete. Acceptance completed the first-login changes; the next owner login uses these new credentials.

## Remaining risks and operational state

Existing protected history is guarded against runtime UPDATE/DELETE, but application authorization is not database-enforced row isolation. Compromised runtime SQL credentials can still fabricate INSERTs, including journal rows, and alter mutable stock, counters, sessions and password hashes. Compromise of hosting or a maintenance identity can bypass protections. The owner accepted these residual risks for activation; neither CRUD verification nor backups removes them.

Production is active and live acceptance passed. SMTP is disabled. Recurring off-host backups are established with successful manual runs, subject to this computer's availability. The additional new-format restore rehearsal remains pending approval; no real financial operations were performed during this work.
