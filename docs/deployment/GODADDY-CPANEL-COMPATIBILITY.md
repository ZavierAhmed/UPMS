# GoDaddy cPanel compatibility verdict

Review date: 2026-10-26. Baseline: `f167ad4ac3f624cd242b488897a9d531d2cf5d93`.

**UNVERIFIED / BLOCKED.** The owner reports creating a cPanel database. No provider control-plane access, approved endpoint, network observations, certificates, database credentials or server identity were supplied for this review. No connection to that database was attempted. This is an evidence gap, not a finding that GoDaddy can never support UPMS.

`UPMS_DATABASE_PROFILE=godaddy-cpanel` now fails explicitly with `GODADDY_COMPATIBILITY_BLOCKED`. It does not enable a connection pool. The existing `local-mysql` profile and its endpoint restrictions are unchanged. The diagnostic Preview entry point also recognizes the cPanel profile but remains non-operational and has no database pool.

| Required observation | Result / missing evidence |
| --- | --- |
| cPanel MySQL and separate Node hosting network reachability | Unknown. Obtain provider-supported architecture and test from the actual Node runtime. |
| Remote MySQL support and source-IP allowlisting | Unknown. Obtain supported access method and stable Node egress addresses. |
| Exact hostname and port | Not supplied. Never substitute Node `localhost`, a guessed hostname or a fallback IP. |
| Authenticated remote TLS | Not supplied. Require provider CA chain, hostname match, negotiated TLS 1.2+, authorized peer and nonempty session cipher. No trust-all mode. |
| Engine/version and InnoDB | Owner database unverified. Fresh isolated local MySQL 8.4.13 return acceptance passed; this is not provider acceptance. Require Oracle MySQL 8.0.16+ and transactional InnoDB on all application tables. Local MariaDB acceptance does not qualify production. |
| Server identity | Actual schema, `CURRENT_USER()`, `@@server_uuid`, `@@server_id`, `@@port`, version, read-only and recovery state missing. Record independently, then pin exact values in a reviewed profile. |
| Dedicated schema and account | cPanel naming/prefix restrictions and ability to create dedicated users are unverified. Do not rename existing schemas to satisfy the current local production profile. |
| Restricted runtime grants | Unverified. Must support the existing per-table privilege allowlist, no wildcard/global grants except USAGE, no runtime DDL, no journal/audit UPDATE or DELETE, no grant option and no access to other schemas. cPanel “ALL PRIVILEGES” is not sufficient. |
| Migrations and history | Empty/populated state unknown. Require a read-only table/history inventory, explicit schema confirmation and separately approved migration credentials. Refuse unknown/populated data. |
| Persistent connections | Not tested on hosting. Verify the current bounded pool (0–5), idle reconnects, statement timeouts, lock behavior and persistence across Node restarts. |
| Preview / Publish isolation | Unverified. Separate synthetic schema and distinct restricted accounts/secrets are mandatory; prove denied cross-schema writes from both environments. |
| Export and independent restore | No provider export, retention, independent restore or reconciliation receipt supplied. |
| Hosting prerequisites | Exact supported Node patch, private writable session storage, proxy peers, secret scoping and HTTPS origin still require provider evidence. |

The baseline production profile pins local schema/account identities and server ID. It does not pin a remote cPanel UUID or TLS session. Those checks must be added only after actual provider observations exist; environment-variable assertions alone are not acceptance evidence. Existing managed-provider assessment helpers remain assessment building blocks, not a runtime activation path.

No live initialization, migration, import, DNS change, deployment or posting activation was performed. If the provider cannot supply authenticated TLS, required table grants, isolation or independent restoration, document its exact response and keep this profile blocked. Do not relax these requirements to force compatibility.
