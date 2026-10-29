# PHP-8.3 — controlled private staging

Baseline fetched and matched `ed629f02f9e21e735598387fd33300c5e34b3b6e`. Branch: feature/upms-php-8-3-godaddy-staged-deployment. Earlier worktrees and owner artwork remain preserved. Application/business/React source is unchanged; this milestone adds deployment tooling, not database initialization.

**No GoDaddy connection, upload, directory creation, database modification or public cutover was performed by Codex.** The archive is a private disabled staging candidate. Its target directory is owner-proposed, not remotely inspected/approved by this agent.

## Exact proposed layout

| Purpose | Path |
| --- | --- |
| Verified owner home | /home/tsn6az96j3v7 |
| Existing public website — preserve | /home/tsn6az96j3v7/public_html |
| Existing management — preserve | /home/tsn6az96j3v7/public_html/dashboard |
| Existing diagnostics — preserve | /home/tsn6az96j3v7/upms-php8-preflight |
| New proposed private staging root | /home/tsn6az96j3v7/upms-php83-staging |
| Candidate payload | /home/tsn6az96j3v7/upms-php83-staging/payload |
| Private backend/vendor | /home/tsn6az96j3v7/upms-php83-staging/payload/release/private/backend |
| Private runtime/key/logs | /home/tsn6az96j3v7/upms-php83-staging/runtime |

The staged public/management asset directories stay **inside the private candidate**, not in either live root. Gateway/inquiry paths are bound to the proposed private backend above, with no REPLACE_WITH_VERIFIED_PRIVATE_PATH. Their hash verification does not prove that the remote destination exists or authorize copying them into live roots.

## Owner's short PowerShell workflow

Run from this PHP-8.3 worktree. Owner supplied SSH unique-plastic.com:22 / tsn6az96j3v7. Metadata inspection found the existing key at `C:\Users\zasah\.ssh\upms_godaddy`; the supplied spelling without the separator before .ssh was not found. No key contents were read and no SSH authentication was attempted. The script takes -Key if another existing owner-controlled path is required. It keeps BatchMode and StrictHostKeyChecking enabled; use the existing trusted host-key/agent configuration, never bypass checking.

Optional local-only checksum check (no SSH):

```powershell
.\deployment\staging\owner-deploy.ps1 -Mode Validate -ArtifactRecord 'C:/Users/zasah/source/repos/UPMS/tmp/php-runtime/php83-staging-artifact-102d19fe11e7/ARTIFACT.json'
```

1. Inspect only:

```powershell
.\deployment\staging\owner-deploy.ps1 -Mode Inspect
```

This pipes one read-only PHP check through SSH stdin. It creates no remote file, reads no database and checks real roots, parent write modes, absent destination, CLI capabilities and filesystem free space. Filesystem free bytes do not prove account quota. Separately review cPanel disk/inode quota against ARTIFACT.json's complete byte/file/directory counts plus runtime/storage headroom; confirm tar/sha256sum and the actual PHP8.3 binary via the existing shell. No fresh SQL/old PDO diagnostic is required.

2. Only after successful inspection and owner quota/path review, private upload is allowed:

```powershell
.\deployment\staging\owner-deploy.ps1 -Mode Upload -PathsAndQuotaReviewed -ArtifactRecord 'C:/Users/zasah/source/repos/UPMS/tmp/php-runtime/php83-staging-artifact-102d19fe11e7/ARTIFACT.json'
```

This explicit mode refuses an existing/symlink destination, creates only the new0700 staging directory, checks local/archive SHA-256 again remotely, extracts under a new private payload, installs a reviewed0600 plan, generates a private durable application key and runs disabled checks. It never invokes import, initialize, finalize, provision, activate or SMTP delivery. It stops on errors and preserves partial state; do not delete/reuse a failed directory automatically. Re-running Upload against an existing directory intentionally fails; use the verifier directly after reviewing existing state.

3. Repeat private verification from SSH with the exact independently recorded staging-manifest digest:

```sh
php /home/tsn6az96j3v7/upms-php83-staging/payload/tools/verify-staging.php --plan /home/tsn6az96j3v7/upms-php83-staging/reviewed-plan.json --manifest-sha 5c023fb7420430794a06952595045cc883937845b51b99f9c378d866b3682af1
```

Private staging checks can pass while database/backup/web/SMTP/trust remain pending. The report never treats this as public activation approval. Logs/key/cache stay outside immutable payload, private under runtime/. Preserve logs on failure and apply the specific correction in HOSTING-CHECKS; no resets.

4. When the separate SELECT-only upms_v1 profile is privately reviewed, add `--database-profile /home/tsn6az96j3v7/upms-php83-staging/runtime/read-only.json`. See DATABASE-FINALIZATION for its single consolidated verifier. It performs no writes.

## Release preparation and audit

Reused scripts/php-8-2-release-source.mjs and deployment/linux-release-finalize.sh, fresh production React builds and locked Linux Composer --no-dev dependencies, strict validation/platform checks/audit. scripts/php-8-3-package.py verifies the existing Linux release, binds only reviewed entry preimages, rebuilds their manifest hashes and creates a deterministic private tarball plus full STAGING-MANIFEST.json. Canonical PHP-8.2 import-tools are included unchanged only because the existing verifier validates that exact package; **do not import its SQL again**.

No Node hosting process, Windows vendor, development .env, UAT fixtures, database dump, private mail journal, live account credentials or generated APP_KEY is packaged. The key is created only by explicit private prepare-runtime.php, never printed, and preserved on retry. Runtime defaults remain disabled; no live financial transactions are permitted.

The old website/dashboard and both databases remain untouched. Do not execute older initialization scripts, replace live .htaccess/gateways, enable the API, send mail, change DNS/SSL, delete databases or collect real passwords through the self-signed public endpoint. Finalization/provisioning/public activation remain blocked.

Artifact code source: `c0d05b340cbaa136464015669fe650060e450f12`. The final branch commit adds handoff documentation/evidence only. Archive SHA-256: `102d19fe11e775b52f0805f6136a4895f1a251c2b5669dfd2e7f33182d4995f6`. Full bundle manifest and release manifest are next to ARTIFACT.json in the local artifact directory; they are also inside the archive. SQL digest: `cba317ebaf5571112e1f19c3d4aff5b2aa8af14764e4355eecbe850fe110aa29`; SQL-package manifest digest: `0de16efa7c653ad1fb8ba83b97419a03767514eec2ed71312ec983539aaa2312`. Do not confuse either with the staging manifest.
