# PHP-8.3 — evidence and remaining hosting checks

Owner-supplied actual GoDaddy evidence: CLI PHP8.3.36/extensions, private process/filesystem probes, MariaDB10.11.19, trusted real Unix socket /var/lib/mysql/mysql.sock UID981, matching server identity, authenticated PHP PDO socket success, imported upms_v1 with20 tables/utf8mb4/IMPORTED_NOT_ACTIVATED/PENDING and zero users/items/parties/documents. These are retained as supplied observations, not independently rerun by Codex. Do not repeat completed import/initialization or old-schema PDO checks.

Home/public/dashboard/diagnostic roots and SSH host/user/port are owner-verified. The **new staging directory is proposed and not yet created/verified**. Run owner-deploy.ps1 -Mode Inspect before any upload. Review parent ownership/mode, symlinks, actual account quota/inode budget, tar/sha256sum, PHP binary and private destination. Existing destination means STOP/review, not automatic deletion. Parent/isolation failure means correct only the reviewed private path/mode; do not loosen live permissions.

Private verification is CLI-only. Actual web handler/PHP version/extensions/memory/time, Apache rewrite/headers/MIME/AllowOverride and live routing cannot be inferred from CLI. No new public diagnostic endpoint or vhost/DNS change is authorized. Obtain existing cPanel web-handler evidence and later separately reviewed controlled web staging before marking them passed. Preserve nested-host isolation: public host must not expose /dashboard or management APIs/assets; management host must not expose public inquiry routing. The local HTTP-kernel tests prove code behavior, not GoDaddy Apache behavior.

SMTP endpoint/port/mode remains unknown. Reuse deployment/manual/smtp-tls.php only after the provider supplies the exact approved endpoint:

```sh
php /ACTUAL_PRIVATE_DIAGNOSTIC_PATH/smtp-tls.php --host=APPROVED_HOST --port=587 --mode=starttls
# Only for provider-approved implicit TLS: --port=465 --mode=implicit
```

No TLS bypass and no AUTH/MAIL/RCPT/DATA. No live messages have been sent. Actual inquiry worker PHP binary, web-to-CLI execution, final private journal fsync/flock/cross-process/uncertain-delivery behavior remain hosting gates. Preserve existing delivery-unknown and duplicate prevention; do not replay uncertain messages.

Self-signed management SSL remains owner-retained for controlled preparation. The workflow does not make an HTTPS request with bypass flags. No real admin passwords through an untrusted public origin. Public activation stays blocked pending a separately reviewed suitable trust arrangement.

## Small corrective steps

| Failure/status | Corrective step |
| --- | --- |
| SSH authentication/host-key failure | Check existing owner key/agent and independently verify host key; do not disclose keys or disable checks |
| Existing/unsafe staging directory | Inspect exact path privately; preserve partial files and obtain a forward-recovery decision |
| Account quota pending | Review cPanel disk/inodes using artifact counts plus storage/log headroom |
| BUNDLE_CHECKSUM / FILE_SET / manifest pin failure | Stop; compare trusted local artifact and transfer SHA, preserve failed candidate; never regenerate a manifest over unexplained remote changes |
| PRIVATE_RUNTIME_PREPARATION_REQUIRED | Run explicit prepare-runtime with reviewed plan; private root0700/key0600; no database operation |
| SELECT-only/profile failure | Correct only the approved new-schema account/profile/pins; no ALL privileges or transport fallback |
| Web/SMTP/trust pending | Return actual provider/cPanel evidence or obtain separate controlled test approval; never mark CLI checks as web proof |

Database authentication errors use PHP-8.2's sanitized DiagnosticFailure categories; raw exceptions and credential files are not printed. Failed child output is retained only in private runtime logs. Return consolidated reports and evidence references, not passwords/dumps/raw SHOW GRANTS authentication strings.
