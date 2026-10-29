# PHP-8 hosting preflight — BLOCKED at Phase A

Starting SHA: 0a2060df79f1bfde576e814c3df61c30364aba50. Requested branch: feature/upms-php-8-production-deployment. The owner subsequently authorized safe local preparation while manual hosting verification remains BLOCKED. See deployment/manual/README.md for scripts and execution instructions.

## Actual observations, 29 October 2026

The credential-free observer queried only the two proposed hostnames and the previously configured database greeting endpoint. Full sanitized observation is in PHP-8-PREFLIGHT-EVIDENCE.json.

| Item | Actual result | Limit |
| --- | --- | --- |
| unique-plastic.com DNS | 184.168.100.110 | Does not prove account ownership or document-root separation |
| Public HTTPS | 200; certificate verified; TLSv1.2; CN unique-plastic.com; expiry 10 May 2027 | Existing public site only; not this Laravel release |
| Public response headers | CSP with frame-ancestors none, X-Frame-Options DENY and nosniff present | Does not prove management response configuration |
| app.unique-plastic.com DNS | 184.168.100.110 | Proposed hostname, account/root binding unverified |
| Management HTTPS | DEPTH_ZERO_SELF_SIGNED_CERT | Validation retained; no bypass and no login attempted |
| Database endpoint greeting | 184.168.100.110:3306 does not advertise TLS | No authentication or SQL sent |
| Advertised database version | 5.5.5-10.11.19-MariaDB-cll-lve | Unauthenticated compatibility-prefix hint, not verified SELECT VERSION or server identity |
| Existing private profile | Remote-development credentials exist; approved TLS hostname/CA not configured | Not production credentials or a production profile; never printed or reused for plaintext authentication |
| Browser/desktop inspection | Both tool initializations fail: kernel assets path not found | No authenticated cPanel session could be inspected |

The actual hosting plan, cPanel account and PHP environment remain UNKNOWN. Neither the old Economy assumption nor generic GoDaddy documentation is treated as account evidence. These observations do not establish that the account is inherently incompatible; they establish that cutover cannot currently proceed.

## Required authenticated account evidence

Record each item as verified evidence rather than inferred support: exact plan/account limits; PHP web/CLI versions and binary paths; PDO MySQL, Sodium, OpenSSL, Fileinfo, Mbstring, Curl, ZIP and Composer-required extensions; memory/time limits; FPM/FastCGI; disabled functions; proc_open/process termination; private process limits; flock, exclusive create and same-filesystem atomic rename; private writable directories, ownership/mode/quotas; actual MariaDB SELECT VERSION, schema/CURRENT_USER, server identity/port/charset/engines and capabilities; verified private DB transport; SMTP connectivity/TLS/timeout behavior; rewrite/mod_headers; valid certificates for both hosts; separate document roots; SSH/SFTP; backups, retention and restore facilities; domain/subdomain entitlement.

No web diagnostic endpoint is to be published. Run any reviewed capability probe privately through an authenticated supported CLI/control-panel facility. Do not upload the app to discover whether it runs. Do not send SMTP messages merely to prove connectivity.

## Unblocking access

Need an authenticated cPanel/SSH access path or an existing private access-configuration reference, plus an owner/provider-approved protected read-only database transport. Keep passwords private. The existing remote-development DB user is not assumed to be a restricted inventory identity. Fix/verify the management certificate through the authenticated hosting account before trusting that origin.

If account evidence proves separate roots or required execution/storage unsupported, stop. Obtain a provider-supported compatible plan/environment or an isolated Linux staging/hosting environment that demonstrably provides those capabilities; do not substitute a broken inquiry implementation or insecure shared origin. No provider/plan purchase recommendation is made without actual account evidence.

No application upload, database authentication, live SQL, account change, SMTP delivery, DNS change or cutover occurred. Production remains NO-GO.

## Owner-directed manual handoff

Owner confirms GoDaddy Linux Web Hosting (cPanel). Exact account capabilities remain unknown. The supplied session URL is not authentication and was not used or committed. No remote observations were repeated during local continuation. Follow deployment/manual/README.md and return sanitized reports. Actual hosting verification remains BLOCKED.
