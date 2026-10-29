# PHP-8.3 — consolidated staging acceptance

The consolidated workflow records the independently pinned bundle digest and reports source commit, release/SQL digests, exact staging paths, immutable file hashes, disabled runtime HTTP-kernel checks, optional protected database/import verification, backup/restore/web/Apache/SMTP/admin/trust status and remaining blockers. Source+artifact identity is not proof of hosting acceptance. The complete bundle manifest is distributed alongside and inside the archive; independently pin its SHA when running verification.

| Gate | Current evidence/status |
| --- | --- |
| Baseline/branch | Fetched exact PHP-8.2 baseline; new PHP-8.3 feature branch |
| Linux no-dev release / production React build / manifest | Locally built and checked |
| Private staging path, permissions, quota | Owner-proposed path; remote inspection pending |
| SSH/SFTP upload | NOT EXECUTED; owner commands prepared |
| PHP CLI/PDO/socket/import20/empty state | Owner-reported actual GoDaddy observations retained |
| New upms_v1 SELECT-only account/profile | PENDING; old-schema grants not assumed |
| Full canonical imported-schema verification on GoDaddy | PENDING approved new-schema profile |
| Old backup | Owner confirms completed download; exact filename/checksum/scope/off-device/restore evidence pending |
| Independent restore | NOT VERIFIED; no file/destination supplied |
| Actual web PHP/Apache/security headers/worker/journal | PENDING hosted evidence; local kernel proof is separate |
| SMTP TLS | PENDING actual provider endpoint; no live messages |
| Administrator provisioning | NOT AUTHORIZED; owner reports users0 |
| Runtime | DISABLED; no production financial operations |
| Management trust | Retained self-signed certificate; public activation BLOCKED |
| Finalization / cutover | BLOCKED; no implicit approval from private staging success |

Local rehearsal remaps only a copy of the bundle into an isolated synthetic home, generates a private key outside payload, checks idempotence, repeats immutable verification, forces inherited enabled/config-cache inputs to remain disabled, verifies4 kernel boundaries, rejects wrong digest/tampering/extra .env and preserves the distributable unchanged. It contacts no database and no GoDaddy server. Synthetic paths/results must not be relabeled as actual remote staging.

Failure policy: stop the dependent operation, preserve restricted logs/partial state, report a sanitized failure category and apply only the smallest reviewed correction. No automatic deletion/reset/re-import/regrant/activation. Files in runtime/ are outside payload manifest; the public/management directories remain private staging files throughout.
