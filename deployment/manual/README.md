# Manual GoDaddy hosting verification — PHP-8

Status: **BLOCKED pending owner-supplied results**. The owner confirms Linux Web Hosting (cPanel); account capabilities remain unverified. Do not upload the application, use provisioning, change DNS, alter records, or enable production while collecting these results. Never send passwords, cookies, session URLs, private keys or complete environment files.

## 1. Windows checks (no authentication)

Run PowerShell from the repository and save the report outside any web root:

```powershell
powershell -NoProfile -File .\deployment\manual\Invoke-HostingChecks.ps1 -ReportPath "$env:USERPROFILE\Desktop\upms-hosting-checks.json"
```

Optionally add `-SshHost provider-approved-hostname` using the SSH hostname shown by cPanel. TCP port 22 reachability does not prove your account has shell access. The checks perform HTTPS HEAD requests with normal certificate verification and optional TCP reachability only. Do not bypass certificate failures. Review reports privately before sharing.

## 2. cPanel observations (read-only)

Open cPanel through your GoDaddy account, rather than sharing a session URL. Record these values without changing them:

| Screen | Required evidence |
| --- | --- |
| General Information / hosting plan | Exact plan, account limits, disk quota/free space, backup facilities |
| Select PHP Version / MultiPHP Manager | Selected web PHP version, enabled extensions, PHP-FPM/FastCGI availability |
| PHP INI Editor | Memory/time limits and disabled functions; do not save changes |
| Terminal / SSH Access | Whether Terminal exists, whether SSH is enabled for this account, SFTP support |
| Domains | Public and proposed management hostname, each document root, ability to use separate roots; do not create a domain yet |
| SSL/TLS Status | Valid certificate and hostname coverage for both proposed origins |
| File Manager | Existing home/private directory ownership and permissions, both document roots; do not move or expose files |
| Email / provider settings | Approved SMTP hostname, TLS mode/port and outbound restrictions; omit credentials |
| Backups | Backup scope, retention, download/restore mechanism, database and private-file coverage |

CLI PHP can differ from web PHP. No public `phpinfo()` or diagnostic endpoint should be installed. A screenshot/transcription of the relevant cPanel settings is sufficient; redact account identifiers and session tokens.

## 3. Private CLI metadata (read-only by default)

If Terminal/SSH exists, place only the reviewed probe scripts in an existing private directory **outside both document roots**, with owner-only permissions. This is an optional diagnostic-file upload by the owner, not an application deployment. If no private location exists, stop and report that limitation. With no shell, return the cPanel observations and ask the provider to run these private commands; never expose the scripts over HTTP.

```sh
php -v
php /home/ACCOUNT/private-checks/hosting-capabilities.php
```

The default capability script prints extension/version/function/limit metadata only. It does not load UPMS or connect to a database. It distinguishes function availability from successful execution.

An optional process test launches a fixed PHP child that prints a constant, with a three-second limit:

```sh
php /home/ACCOUNT/private-checks/hosting-capabilities.php --process-probe
```

File locking/atomic rename/persistence cannot be proven without temporary writes. **The following is not read-only**: use it only if you choose to authorize disposable scratch writes. Create a new empty owner-only directory outside both document roots, then:

```sh
php /home/ACCOUNT/private-checks/hosting-capabilities.php --filesystem-probe --scratch-dir=/home/ACCOUNT/private-checks/empty-scratch
```

It creates only randomized exclusive scratch files, checks `flock`, flush, rename and readback, and removes its own files. Do not point it at application storage, backups, source assets or existing owner data. A local successful lock is not proof of cross-worker/cross-process behavior on this account; a host-specific concurrent locking check is still required before activation. Record the exact private-root and web-root separation; permission bits alone do not establish privacy.

## 4. Database metadata (SELECT only)

In cPanel phpMyAdmin select the intended database and inspect `database-metadata.sql` before running it. It reads server/session/schema/engine metadata only, with no business tables, user listings, data exports or changes. Return the metadata privately after redacting account identifiers as needed. A local socket connection may show an empty SSL cipher; record the actual transport rather than treating it as remote encrypted TLS. No claim about business data cleanliness follows from these results. Do not supply credentials or inspect/modify production records for this phase.

## 5. SMTP TLS (no login or message)

Only after you identify the provider-approved endpoint, run **one** applicable command privately:

```sh
php /home/ACCOUNT/private-checks/smtp-tls.php --host=APPROVED.SMTP.HOST --port=465 --mode=implicit
php /home/ACCOUNT/private-checks/smtp-tls.php --host=APPROVED.SMTP.HOST --port=587 --mode=starttls
```

Use `--ca=/private/path/provider-ca.pem` only for a verified provider CA if required. The probe verifies certificate trust and hostname, uses TLS 1.2/1.3, and sends only EHLO/STARTTLS/QUIT where applicable. No AUTH, MAIL, RCPT or DATA; no inbox test, credentials or delivery claim. A pass proves handshake/connectivity only. Do not weaken TLS to make a failure pass.

## Return checklist

Return the sanitized PowerShell report, CLI metadata (if available), database metadata, SMTP handshake result and the cPanel table observations. Unknown/no-shell/no-feature is a valid result. Hosting, production data classification, backup restore, Linux release finalization and live cutover stay **BLOCKED** until reviewed evidence and later explicit activation approval.
