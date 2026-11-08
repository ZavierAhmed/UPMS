# P4.3 GoDaddy acceptance — 8 November 2026

Hosted publication is **BLOCKED**, pending the approvals and checks below. No hosted files, schemas, accounts, grants, administrators or settings were changed. Existing `upms_v1` remains bound to the previous application; P4.3 is not activated.

## Verified now

Read-only SSH authenticated as `tsn6az96j3v7` on `sg2plzcpnl508885.prod.sin2.secureserver.net`. `/usr/bin/uapi` succeeds. The account permits 10 databases and currently has `upms`, `upms_v1`, `upms_recovery84`, `upms_security85`. Six slots remain. Names have no required prefix; maximum lengths are 64 for databases and 47 for users. Proposed new names below are absent from current inventories. Today's account and database checks succeeded; a later account recheck failed before authentication with `ssh: connect to host unique-plastic.com port 22: Connection timed out`. The last successful JSON evidence was preserved. No durable cause for the intermittent failures has been established.

MariaDB is 10.11.19, socket `/var/lib/mysql/mysql.sock`. The actual authenticated `upms_runtime84@localhost` passes exact database-scoped SELECT, INSERT, UPDATE, DELETE verification on `upms_v1`, with no unexpected grants. All 20 tables and 45 guard definitions verify. Existing admin and haris identities remain enabled. Release verification passes for 6,070 private files and 120 published files.

PHP CLI is 8.3.36 with PDO MySQL, sodium, mbstring, XML, ZIP and OpenSSL. **Actual Apache PHP version/extensions remain unverified.** The read-only MultiPHP inventory returns `You do not have the feature “multiphp”.` CLI success does not establish web runtime compatibility.

Both HTTPS roots return HTTP 200 with title `One moment, please...` through Windows' resolver. This is a provider challenge, not UPMS acceptance. Node's DNS resolver separately returned ECONNREFUSED. Certificate validation was retained. Host isolation, executable-path rejection and Apache behavior must be retested against actual application responses, not scored from these challenge pages.

Latest protected off-host backup was created 2026-11-08 05:42:13 +05:00 and verified at 05:42:23 +05:00. Its receipt reports passed, offHost and authenticatedDecryptionVerified true, 20 tables and 45 triggers. The 74,501-byte encrypted archive exists and its SHA-256 matches `a7cc1566b1c1d0a0670cb0c0cd4f9ade44952869c01a364ef2189798d3dd775e`. No decrypted records or keys were printed. This protects the old schema; it is not evidence for recovery of the new 47-table system.

## Fixed candidates and rollback

| Candidate | SHA-256 | Verification |
|---|---|---|
| Management, source `0a07767c52851184265b766ed1ef373b7ca9e7cc` | `1ea4d46e20e312f1dabf70f95ec511e3d4dc1c4a38bab958df886b470957b3a7` | 5,987 entries, payload manifest verified |
| Catalog website, source `a06db064063cc5c4ded9610801d90efcfbe8b12f` | `6f3ef919bacb29139c21bc165ec2891978912c70746e07ca5d1de7982a394525` | 141 entries, payload manifest verified |
| Original website rollback | `cb2cd0ec0462a0bd5af3172518c3e406fd81840ccd5498f1544de3166ebd2723` | 114 regular files, no dashboard entries or traversal |

Local archives are `tmp/phase-4/artifacts/p42c-final/upms-p4-management-php.zip`, `tmp/phase-4.2a/static/upms-public-static.zip`, and `tmp/phase-4.2/clean-install-public-rollback.tar.gz`. They were not rebuilt. Current hosted release integrity passes, but full byte parity between the 114-file rollback and today's public tree has not yet been reverified. Preserve both old release and rollback archive.

## Exact proposed targets — no approval recorded

All names are unprefixed. Each SQL identity is `@localhost`, with privileges only on its corresponding schema. No global, wildcard, cross-schema or ALL PRIVILEGES grants.

| Purpose | Final schema / identity | Isolated acceptance schema / identity | Exact intended privileges |
|---|---|---|---|
| Empty database | `upms_v2` | `upms_stage_43` | No test import |
| Installer | `upms_init_v2` | `upms_i43` | CREATE, REFERENCES, SELECT, INSERT, UPDATE |
| Native guard owner | `upms_guard_v2` | `upms_g43` | SELECT, TRIGGER |
| Runtime | `upms_runtime_v2` | `upms_r43` | SELECT, INSERT, UPDATE, DELETE |
| Backup reader | `upms_backup_v2` | `upms_b43` | SELECT; compatibility blocker below must be resolved before claiming it works |

The initializer creates exactly its reviewed 47 tables and 133 guards and genuine initialization receipts in each approved empty target. The exact object names and schema-plan digest are in `evidence/proposed-objects.json`. It connects separately as installer and guard owner, so guards are created by their intended definer without granting runtime DDL. Recheck actual CURRENT_USER, grants, definitions and definers after initialization. The four existing databases and their identities are explicitly outside this allowlist. No database drops, imports or credential resets are proposed. Fresh administrator enrollment uses the packaged enrollment flow and private, reviewed handoff; no defaults, reused password hashes, chat passwords or command-line password arguments.

Proposed new private candidate directory is `/home/tsn6az96j3v7/upms-releases/p43/management-1ea4d46e20e3`; private configuration is `/home/tsn6az96j3v7/upms-private/p43`. Proposed acceptance names are `p43.unique-plastic.com` and `p43-app.unique-plastic.com`, with separate document roots `/home/tsn6az96j3v7/upms-hosted-uat43/public` and `/home/tsn6az96j3v7/upms-hosted-uat43/management`. Existing public root `/home/tsn6az96j3v7/public_html` and nested `/home/tsn6az96j3v7/public_html/dashboard` remain untouched during staging. Hostnames require approval, correct DNS, trusted TLS and access restriction before application installation; none have been created.

## Remaining blockers

1. The fixed management candidate requires origin `https://app.unique-plastic.com` in ProductionProfile and HostBoundary; Apache rules are also hostname-specific. It cannot truthfully be accepted on the proposed staging hostname unchanged. Prepare and test an explicit hostname-only staging adaptation, keep strict Host/Origin/CSRF checks, publish a separate adaptation hash for review, and never label modified bytes as the fixed candidate. Static staging rewrite rules require equivalent review. No adaptation has been applied.
2. `operations/backup-cumulative.php` authenticates its reader as the initialization installer. `CumulativeInitialization::verifyInstalled` also requires that identity and its installer grants. The candidate cannot currently use the proposed SELECT-only backup account. A narrowly tested deployment/recovery adaptation is required; silently granting that reader installer permissions is not accepted.
3. Hosted synthetic posting cannot use P4.2C's offline-only synthetic recovery exception. Keep posting pending. Obtain a real hosted V2 encrypted archive and genuine separate-account/computer restore using the owner-controlled offline USB before hosted financial acceptance. The owner-designated operator has not supplied that acceptance. Production recovery gate remains **BLOCKED**.
4. Actual web runtime, provider challenge routing, hosted application acceptance, hosted native guard negative tests, concurrent sessions and exports remain **NOT RUN** for the new candidate. Prior isolated P4.2C tests are supporting evidence only.
5. Independent recovery, approved opening balances and separate activation approval are prerequisites for real financial operations. SMTP and operational attachments remain disabled throughout the proposed deployment.

## Short execution and approval checklist

1. Resolve and test the two deployment-only compatibility constraints locally; retain original candidates and review the exact adaptation hashes. Resolve provider routing without disabling safeguards. Reverify backups and exact target absence immediately before approved writes.
2. Obtain **database/identity provisioning approval** for only the two schemas and eight identities above. Obtain **separate hosted staging approval** for the two new hostnames, document roots, private directories and reviewed overlays. Create no resources before these approvals. Provision credentials through a reviewed private handoff; verify exact authenticated identities and grants before initialization.
3. Extract and verify the candidate in the new private directory. Generate purpose-specific private profiles bound to the actual schema/server/release. From that extracted release, run the packaged initializer with the three reviewed private profile paths. Verify 47/133, authentic receipts, fresh enrolled administrators and pending posting. Never copy UAT receipts or old testing transactions.

   ```sh
   /opt/alt/php83/usr/bin/php private/backend/operations/initialize-cumulative.php "$upms_private/installer.json" "$upms_private/definer.json" "$upms_private/runtime-initialization.json"
   ```

4. After staging hostname adaptation and Apache runtime verification, test login/rotation, sessions, CSRF, cookies, logout, permissions, inventory, challans, money accounts, Hafta, cheques, exports and concurrent sessions. Posting tests use only the approved isolated acceptance schema and only after genuine recovery gates pass. No financial tests on existing schemas. Stop on failures and retain evidence.
5. Obtain **website publication approval** for the fixed catalog archive to `public_html`, with exact manifest-based replacement and a validated delete allowlist limited to old public release files. Never recursively clear public_html or touch dashboard. Preserve contacts and disabled inquiry. Verify hosted gateway/private-path rejection before SPA fallback. Rollback restores only the original 114 public files and removes only verified new package files; dashboard is excluded.
6. Obtain **management publication/binding approval** for the reviewed private release, exact published dashboard file manifest and `upms_v2` profiles. Preserve old published files and private binding for rollback. Recheck readiness immediately before switching. Rollback switches back to the preserved old binding/release; never drops or restores over either database automatically.
7. Obtain **financial activation approval** only after actual independent recovery and approved opening balances. Use the packaged target/release-bound activation workflow. Publication does not imply posting authorization. No final approval in this checklist has been recorded.

Read-only verification can be repeated from the repository with:

```powershell
& 'C:\Users\zasah\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe' -NoProfile -File scripts/p43-host-preflight.ps1
```

Evidence is in `evidence/hosting-preflight.json` and `evidence/candidate-integrity.json`. Current state is preparation complete for target review, hosted acceptance incomplete, no P4.3 publication or financial activation.
