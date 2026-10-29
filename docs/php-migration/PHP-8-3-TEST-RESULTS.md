# PHP-8.3 — actual test results

Deployment-only source commit: `c0d05b340cbaa136464015669fe650060e450f12`. Baseline: ed629f02f9e21e735598387fd33300c5e34b3b6e. Laravel/business/React source remains byte-equivalent in Git to the baseline. Earlier worktrees and owner source assets were preserved.

| Executed check | Result |
| --- | --- |
| Fresh production public SSR/prerender and management builds |PASS; existing chunk-size advisory |
| Fresh Linux locked Composer no-dev install |PASS |
| Composer strict validation/platform requirements/audit |PASS; no advisories returned at build |
| Fresh npm audit, full locked client build/runtime graph |PASS; zero advisories |
| Base Linux release manifest |6,041 files verified |
| Linux staging path/permissions/grant/manifest guards |22 checks PASS |
| Real isolated MariaDB10.11.19 grant rendering/scope |3 checks PASS; escaped exact schema accepted, wildcard/writer grants rejected |
| Private owner-flow Linux rehearsal |32 checks PASS |
| Disabled Laravel HTTP-kernel host boundaries |4 cases per successful rehearsal run, repeatedly PASS |
| Key creation/retry |Private fsynced key created once, unchanged on retry; no key in payload/output |
| Wrong digest/tampering/extra .env |Rejected; fixture restored and reverified |
| PowerShell syntax/local archive validation/malformed digest |3 checks PASS; no SSH connection |
| PHP8.3 lint, Pint deployment code, Python/Node syntax |PASS |
| Repeated Linux packaging |Byte-identical archive SHA-256 |
| Safe tar members/known private test secret/public branding scan |PASS |

The archive has 6,061 regular files including STAGING-MANIFEST.json and 860 directories; the outer manifest hashes 6,060 files, excluding itself. Archive 6,738,635 bytes; extracted regular-file bytes 30,705,953. These counts do not establish the owner's account quota: allow archive, directories/inodes, runtime/key/cache/log overhead and storage headroom.

Local Linux uses PHP8.3.6 distro-security packages; GoDaddy CLI8.3.36 is owner-supplied evidence. The grant fixture is the positively identified loopback-only MariaDB10.11.19 engine on port3330, using only new upms_test_php_83_* schemas/accounts. No local business initialization or real account provisioning was run. The rehearsal copied/rebound only a private fixture; it contacted neither a database nor GoDaddy, and left the distributable unchanged. Actual web PHP/Apache behavior is not established by these CLI/kernel checks.

A test-literal escaping error was corrected against actual MariaDB grant output; final native and guard tests pass. The uploader validates digest syntax before constructing any SSH command. The preflight uses existing required extensions and reports optional POSIX capability rather than requiring an unrelated new hosting extension; staging ownership must match the verified home owner.

Not rerun: full financial comparison matrices, application initialization/import/provisioning suites, unchanged PHP/React/Express suites and unchanged SMTP/inquiry/journal/Apache matrices. Prior PHP-8.2 results remain historical, not new PHP-8.3 passes. No GoDaddy authentication/upload, new-schema grant/account change, import/finalization, backup restore, administrator creation, live mail/financial transaction, DNS/SSL change or public cutover was executed.

## Artifact identity

Archive SHA-256: `102d19fe11e775b52f0805f6136a4895f1a251c2b5669dfd2e7f33182d4995f6`

Staging manifest SHA-256: `5c023fb7420430794a06952595045cc883937845b51b99f9c378d866b3682af1`

Release manifest SHA-256: `059da290b1b4c9f13732daa15b958bb0c5d6db78471d797f62e32bce9ecfb037`

Unchanged SQL SHA-256: `cba317ebaf5571112e1f19c3d4aff5b2aa8af14764e4355eecbe850fe110aa29`

Local Windows archive: `C:/Users/zasah/source/repos/UPMS/tmp/php-runtime/php83-staging-artifact-102d19fe11e7/upms-php83-private-staging.tar.gz`

Full manifests and ARTIFACT.json are alongside that archive. PHP-8-3-LOCAL-EVIDENCE.json records exact check/log hashes and distinguishes owner-supplied hosting facts. This is a locally verified **disabled private staging bundle**, not an uploaded/active system. Finalization/provisioning/cutover remain BLOCKED on the documented gates.
