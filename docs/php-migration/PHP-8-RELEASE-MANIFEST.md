# PHP-8 release manifest — NO RELEASE ARTIFACT

Source baseline: 0a2060df79f1bfde576e814c3df61c30364aba50. Branch: feature/upms-php-8-production-deployment. This commit contains Phase A observation tooling and gated plans only. There is no production ZIP, deployable release candidate, release checksum or uploaded application. No fabricated archive validation is claimed.

After Phase A succeeds, build from verified source and composer.lock in a verified Linux environment matching actual PHP/extensions. Do not package a Windows/UAT vendor tree. Install production Composer dependencies without development packages, then verify platform/audit/strict validation and artifact inventory. No unrestricted dependency update during release.

Future private payload: required Laravel runtime source/bootstrap/config/routes/resources and locked production vendor, empty reviewed writable private storage/cache layout, private readiness/provisioning/deploy/rollback CLI utilities. Future public payloads: approved public/management React static outputs, reviewed Apache rules and narrow secure entry files with actual private absolute paths. Keep secrets in separately delivered private configuration outside both roots, never the archive.

Allowlist/checksum every payload file. Refuse symlinks/path traversal and unexpected files. Exclude Node backend runtime, test runners/fixtures/diagnostic endpoints/dev tools, test databases/dumps/backups, DevelopmentFile messages, sessions, .env secrets, credentials, local certs/keys, logs/screenshots and unnecessary source maps. Preserve approved Stickers/Cartons illustrations as public content; they are not synthetic business data. Preserve Express in the repository/reference rollback plan, not in the PHP deployment payload.

Require clean-extraction/package checks and host-matching staging before any upload/activation. Manifest must identify source commit, lock/build fingerprints, Linux/PHP/tool versions, roots, deployment mode, file SHA-256 values and evidence references without secrets. Any destination/account/secret/restore mismatch blocks release.
