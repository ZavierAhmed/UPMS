# Actual hosting inventory

Read-only observations are in `evidence/host-inventory.json`, `provider-inventory.json`, `host-release.json` and `host-https.json`. No passwords or private records are included.

GoDaddy account `tsn6az96j3v7`, Economy0, host `sg2plzcpnl508885.prod.sin2.secureserver.net`, IP `184.168.100.110`. Account disk allowance is 25,600 MB, not the physical filesystem capacity. UAPI works through `/usr/bin/uapi`; the direct cPanel binary is unavailable in the jailed environment.

Public root: `/home/tsn6az96j3v7/public_html`, domain `unique-plastic.com`. Management root: `/home/tsn6az96j3v7/public_html/dashboard`, domain `app.unique-plastic.com`. Existing private backend: `/home/tsn6az96j3v7/upms-php83-staging/php84-release/private/backend`.

Observed PHP CLI is 8.3.36. This is not direct proof of the web SAPI patch version. MariaDB is 10.11.19-MariaDB-cll-lve. Runtime is `upms_runtime84@localhost`, exactly SELECT/INSERT/UPDATE/DELETE on `upms_v1`. Guard definer is `upms_guard85@localhost`, schema SELECT/TRIGGER. No runtime DDL privileges are requested.

Live schema remains 20 tables / 45 guards, 140 rows, with enabled `admin` and `haris` identities. Eight documents include posted business history and a draft; preserve them as genuine. Control is READY and migration receipt ACTIVATED. No live activation state was changed.

CloudLinux Node selector returned `selector_enabled:false`, empty `available_versions`, no default version; no registered Passenger app was observed. A feature entitlement is not a working Node runtime. Provider-supported Node 22.23.4+ or 24.22+ with verified lifecycle is required for the accepted public architecture. Do not replace management with Node.

Existing source release is `c0d05b340cbaa136464015669fe650060e450f12`; 6070 source and 120 published files matched pinned manifests. Both certificates validated. Latest HTTP route/asset/redirect checks failed; see exact timestamped receipt. Do not infer exposed secrets merely from an HTTP 200 response, or infer application health from a trusted certificate.

Cron entitlement is observed; actual recurring provider cron schedule and end-to-end failure alert delivery remain unverified in this assessment. No jobs were created or changed.
