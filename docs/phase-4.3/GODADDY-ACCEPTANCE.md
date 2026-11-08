# P4.3 final hosted result — 8 November 2026

| Component | Status |
|---|---|
| Public website live | PASS — https://unique-plastic.com |
| New management application live | BLOCKED — previous application retained at https://app.unique-plastic.com |
| upms_stage_43 initialized and tested | BLOCKED for full acceptance — 47/133 and hosted authentication/read/security passed; React/export/financial acceptance incomplete |
| upms_v2 initialized | PASS — 47 exact tables, 133 exact guards, genuine receipts, posting PENDING |
| Backup V2 and restore | PASS for actual hosted staging archive; production recovery gate remains BLOCKED |
| New release financial posting | DISABLED — neither new schema was activated |
| Previous installation preserved | PASS — previous dashboard byte-identical, old databases untouched, rollback retained |

The owner authorized initialization and publication in FINAL GODADDY DEPLOYMENT. No further publishing approval was requested. The new management binding was deliberately not switched because its production recovery/readiness gates remain incomplete. It remains private at `/home/tsn6az96j3v7/upms-releases/p43/management-570362622816`. Its runtime profiles are explicitly inspection-only with backupRestoreVerified false; they were not relabeled as operational approval. Existing management continues using upms_v1, with its prior settings unchanged.

## Releases and actual hosting

- Static archive remains `6f3ef919bacb29139c21bc165ec2891978912c70746e07ca5d1de7982a394525`, published to `/home/tsn6az96j3v7/public_html`. External acceptance passed 139 payloads/routes, seven PDF downloads, phone/WhatsApp contacts, deep links, 404 and private/executable denials. Online inquiry remains visibly disabled. GoDaddy injects an exact 456-byte telemetry block into HTML; evidence retains raw hashes and separately verifies payload hashes after removing only those fixed bytes. No provider challenge page was accepted as the website.
- Patched management archive is `57036262281670a5f33123332ed357f749d528ea0b82503a3dbe647226523691`, source `e3e9ece1d2bdc8e282a5481dd01bb3960059ac91`. All 5,987 entries verified. Only five PHP files changed from accepted archive `1ea4d46e20e312f1dabf70f95ec511e3d4dc1c4a38bab958df886b470957b3a7`; React and vendor payloads were reused unchanged.
- Actual HTTPS web runtime is PHP 8.3.36, LiteSpeed SAPI, with required PDO MySQL, sodium, XML, mbstring, ZIP and OpenSSL extensions. MariaDB is 10.11.19, local socket `/var/lib/mysql/mysql.sock`. Temporary authenticated inspection/front-controller files were removed. No DNS changes were made. Available filesystem space exceeded package requirements; this is not a claim about the account quota.
- Initial public deployment returned 403 for new directories because the publisher inherited its private umask. The old 114-file release was restored and verified immediately. The directory-permission fix was applied, the unchanged package republished, and external acceptance then passed. Dashboard, ACME, CGI and unrelated files were preserved. The original rollback archive remains SHA `cb2cd0ec0462a0bd5af3172518c3e406fd81840ccd5498f1544de3166ebd2723`.

## Database identities and acceptance

All identities authenticate as @localhost. Final schema upms_v2 uses upms_init_v2, upms_guard_v2, upms_runtime_v2 and upms_backup_v2. Isolated upms_stage_43 uses upms_i43, upms_g43, upms_r43 and upms_b43. Installer grants are CREATE, REFERENCES, SELECT, INSERT, UPDATE; guard owner SELECT, TRIGGER; runtime SELECT, INSERT, UPDATE, DELETE; backup SELECT only. Final checks authenticated all roles, verified exact grants and guard definers, and found zero financial business rows in both new schemas. Both migration receipts are CUMULATIVE_READY and both controls PENDING. Empty-schema defaults were corrected from latin1 to utf8mb4_unicode_ci using temporary installer-only ALTER, immediately revoked; final exact grants passed. No existing schema was altered or deleted.

Hosted staging passed both synthetic administrator logins, mandatory password changes, reauthentication, overlapping sessions, secure/HttpOnly/SameSite cookies, CSRF and Origin negatives, logout and revoked-cookie rejection. Read-only inventory, challans, money, Hafta and cheque views passed through a temporary header-authenticated front controller on the real HTTPS vhost. It preserved real Host/TLS metadata and application security. This was hosted PHP API acceptance, not full React/browser acceptance. Three wrong backup identities and three actual protected audit/receipt/control mutations were rejected. No financial test transactions were created. Focused PHP origin/host tests passed 7 tests and 46 assertions; historical suites were not rerun.

The SELECT-only backup reader fix passed on GoDaddy with separate definer verification. Hosted ciphertext SHA is `c679bbbd04104c711b8cd2d8c4b1b00f04435c023cc0e15930cf2b5a5f2201dc`. Checksum, authenticated decryption and tamper rejection passed. That actual archive was downloaded to protected off-host storage and restored to a new offline Linux MariaDB target: 47 tables, 133 guards, 87 rows, all rows identical, reconciliation passed. This used synthetic staging recovery keys, never production key custody, and is not independent owner USB acceptance.

## Exact remaining gates and owner action

The production-v2 administrator handoff is protected at `/home/tsn6az96j3v7/upms-private/p43/production-v2/private-administrator-handoff.json` (0600). No credentials were printed, copied from old hashes or committed. New administrators still require their first password change. An owner-bound, DPAPI-encrypted handoff was also prepared and authenticated locally at tmp/protected-offhost-backups/p43-stage-recovery/production-administrator-handoff.dpapi. Owner receipt and initial password rotation remain pending; do not send passwords in chat.

Provide the approved V2 recipient public key and arrange the designated operator's separate-account/computer recovery using the offline USB. Do not send private keys/passphrases. Produce and independently restore the actual upms_v2 protected archive before treating production recovery as passed. Full hosted React/browser, export and permitted synthetic financial acceptance remain incomplete; new production binding remains unchanged until required readiness checks legitimately pass. Independent USB recovery, approved real opening balances and separate financial activation are still required before real financial operations. SMTP and operational attachments remain disabled in the new private runtime. The existing 20/45 recurring backup job was preserved and must not be represented as covering upms_v2.

Machine evidence is in this directory's evidence folder, especially final-hosted-state.json, static-live-acceptance.json, hosted-stage-http.json and hosted-archive-isolated-restore.json. No failed check was counted as passed.