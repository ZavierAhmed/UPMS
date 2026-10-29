# PHP-8.2 — protected connection and database verification

**Previous PHP PDO failure cause: UNKNOWN.** METADATA_CHECK_FAILED_PRIVATE_REVIEW_REQUIRED does not identify the failing check. Owner-supplied MariaDB CLI socket success does not prove PHP PDO. No authenticated GoDaddy access was performed. Remote temporary diagnostic files were unavailable locally, so their paths/permissions could not be inspected.

The replacement returns sanitized stage/category/code, never raw exceptions, SQL, passwords, file contents or private paths. Optional boolean version/schema/account/server-ID pin results distinguish mismatches without expected/actual secret values. Categories cover profile/encoding/filesystem permissions, missing library/PDO extension, socket filesystem/driver, database authentication/access/selection, identity mismatch, TLS and PDO/session configuration. Unknown failures stay generic.

Possible earlier causes: missing copied dependencies; wrong/inaccessible absolute roots; symlink/broad Unix modes; JSON types; bare rather than full VERSION(); numeric rather than string serverId; wrong account; BOM/UTF-16/NUL encoding; unreadable password file; missing pdo_mysql; mismatched UID/path/hostname/socket namespace; incorrect credentials/grants; unsupported PDO attribute or rejected session settings. These are possibilities, not an established diagnosis.

## Smallest owner recheck — metadata only

Use only `deployment/manual/upms-pdo-check.php`: embedded reviewed dependencies, no Laravel/vendor/bootstrap. Verify its digest against PHP-8-2-LOCAL-EVIDENCE.json. PowerShell:

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath .\deployment\manual\upms-pdo-check.php
```

Through existing authenticated SSH/SFTP, the owner may privately transfer this diagnostic outside both public roots. This owner-controlled inspection transfer is not application deployment. Do not share cPanel session URLs or passwords.

Privately copy php82-read-only-socket.disabled.example.json. Fill actual absolute private/public/management roots, existing protected password-file path, exact full MariaDB VERSION() and review reference. Sample retains owner-reported upms/upms_view_user@localhost, socket /var/lib/mysql/mysql.sock, UID string981, server-ID string1 and hostname sg2plzcpnl508885.prod.sin2.secureserver.net; independently review these privately. Do not add host/port/caFile in socket mode.

For this check only, owner may set enabled/readOnlyMetadataApproved/localSocketVerified true after reviewing the private copy. Keep read-only-transport-verification mode; hosting/backup approval flags may remain false. Directory0700/files0600, no symlinks, UTF-8 without BOM. Never put passwords in command arguments/output/chat. Inspect only metadata (`stat`, not `cat`) if investigating prior private files.

In SSH substitute reviewed actual private paths; these are placeholders, not discovered paths:

```sh
php -l /ACTUAL_PRIVATE_ROOT/upms-pdo-check.php
php /ACTUAL_PRIVATE_ROOT/upms-pdo-check.php --profile /ACTUAL_PRIVATE_ROOT/read-only.json --diagnose
```

A pass establishes actual PHP authentication, identity pins, trusted unchanged socket inode/UID/parents, driver UNIX transport, session configuration and metadata-only transaction. Return passed/code/category/stage and boolean pin checks. Do not send private files or raw exceptions. A failure identifies the next private correction without bypassing verification. Read-only profiles cannot initialize/provision/activate/runtime.

Local Linux tests exercise a genuinely SELECT-only synthetic account with networking disabled, valid connection, bad credentials/schema/version/account/hostname, wrong UID, regular-file/symlink substitution and TCP rejection. Connection/classifier were exercised directly because full ProductionProfile intentionally rejects every upms_test_ schema; that rejection is separately tested. No synthetic production-profile bypass was added. Actual GoDaddy full-profile success remains BLOCKED pending the recheck.

After a future import, the package verifier consolidates exact schema/data-state checks; --accounts consolidates post-provision identities. Twenty tables or a green import banner alone prove neither.
