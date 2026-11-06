# P4.0 backup and recovery work plan

Status: **BLOCKED** for release until independent recovery-key custody, intended recovery-operator testing are complete. A successful decrypt on the original Windows profile is not independent recovery.

The existing recurring backup is retained without configuration changes. It encrypts the current hosted 20-table/45-guard database before downloading ciphertext. The private recipient key is protected with Windows DPAPI CurrentUser. Existing archives have no automatic deletion policy; this milestone will not delete them.

## Retention policy — owner approved 2026-11-05

- Hourly recovery points for 48 hours.
- One verified daily point for 35 days.
- One verified weekly point for 12 weeks.
- One verified monthly point for 12 months.
- Keep pre-release, pre-migration and incident recovery points until separately released by the owner.
- Never delete the last independently restore-tested point or an archive whose replacement has not authenticated and passed integrity checks.
- Delete only within the protected backup root, after checking the approved retention receipt and producing a reviewable deletion manifest. The owner approved the policy. Execution remains dry-run; no deletion executor is enabled.
- Existing backups are not retroactively deleted merely by approving this proposal.

## Independent custody proposal

Prepare a portable authenticated, passphrase-encrypted copy of the recovery key, stored separately from the database archives and this Windows profile (for example, an owner-controlled offline USB device or approved password vault). The owner enters the passphrase privately; it is never put in chat, command arguments, logs or Git. Record only the recipient fingerprint and a custody acknowledgment. Test decryption and restore as the intended recovery operator on a separately isolated target. Do not place a private key in the database archive or source package.

The owner specified a trusted designated operator on a separate recovery account/computer, an encrypted offline USB stored at a separate physical location, and a passphrase kept separately in an owner-controlled vault. Actual custody and separate-environment restore have not been demonstrated. A newly generated test key or simulated second account is not proof of custody for actual production archives.

## Actual verification and remaining gate

Collect a fresh protected production backup and restore it only to a new, positively identified local isolated schema. Compare source/restore table and trigger definitions, identities, rows and financial/stock aggregates. Run fresh cumulative 47-table/133-guard synthetic recovery and attachment tamper tests separately. Preserve all existing production, owner UAT and historical recovery resources.

The fresh actual production archive authenticated, passed tamper rejection, and restored 20 tables / 45 guards / 140 rows to a newly created local isolated schema. Original row hashes and protected UPDATE/DELETE denial probes passed. This restore used the original operator DPAPI and is not independent recovery. The subsequent structural rehearsal reached 47/133 without changing those original rows.

Portable recovery capsule tools under deployment/phase-4 use Argon2id and authenticated XChaCha20 encryption. Only synthetic capsule tests passed; no actual production key export to USB or independent restore was performed. Run export-recovery-key.ps1 with -Destination pointing to the owner-controlled encrypted USB for preflight only; actual export additionally requires -Export -OwnerConfirmedOfflineEncryptedUsb and a privately entered passphrase. Never put the passphrase in arguments, chat or logs. The actual USB path and separate operator environment must be established before execution.

Current recurring collector remains pinned to 20/45. A reviewed 47/133 collector, independent application-key custody and end-to-end failure alert delivery are required before future-schema financial operation. Existing archives are retained; the 31-archive retention dry run deletes nothing.
