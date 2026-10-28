# PHP-7.5 defects

PHP-7.6 disposition: the address and editable challan pricing correction does not
resolve UAT-SEC-01, UAT-SEC-02 or UAT-VALIDATE-01, nor the pending SQL/authenticity
decisions. Modified Documents.php was formatted with project Pint, removing its
existing formatting finding; seven unrelated full-tree Pint findings remain.
No dependency, hosting-header or schema/grant change is included. Production stays
NO-GO; all manual acceptance remains PENDING OWNER.

| ID | Status | Finding and disposition |
| --- | --- | --- |
| UAT-SEC-01 | FAIL | Locked Composer audit reports medium PKSA-wtxr-p26d-nn42 / CVE-2026-45070 in symfony/mime 7.4.19, reported 28 October 2026. Resolve through a reviewed dependency change and rerun SMTP/inquiry/platform/audit checks before release. No lockfile was silently changed. |
| UAT-SEC-02 | FAIL | Actual management HTTPS API lacks Content-Security-Policy and X-Frame-Options; public origin has both. Management deployment example also lacks these directives. Review management header configuration and repeat actual browser compatibility checks. No insecure transport or secret disclosure was observed. |
| UAT-STYLE-01 | FAIL | Full Pint flags eight existing application/config files. Changed SecurityTest passes. Review formatting-only cleanup separately; no business defect inferred. |
| UAT-VALIDATE-01 | FAIL | Composer strict validation exits 1 for existing Laravel/Brick Math exact pins. Normal validation is valid. Explicitly review pinning policy; strict validation is not green. |
| UAT-TEST-01 | PASS | Initial unrestricted React timing failure resolved by complete bounded rerun: 192/192. No tests removed. |
| UAT-HARNESS-01 | PASS | Worksheet verification/print selectors, security selectors/cache-header/viewport and service timestamp checks corrected. Partial fixture retained; accepted fixture separate; reports rerun without business reposting. |

The new audit supersedes PHP-7.1's historical zero-advisory result. Composer's
reference: [Symfony CVE-2026-45070](https://symfony.com/cve-2026-45070).
UAT did not assess exploitability of every mail-construction path; a passing
SMTP fixture does not clear the advisory.

No unexplained stock/financial mismatch, duplicate posting effect, failed restore
or unauthorized disclosure was observed. Production trust-boundary limitations
and manual acceptance are separate in RELEASE-READINESS. No risk was accepted on
the owner's behalf.
