# PHP-7.8 dependency investigation

Baseline: c769239b0ec4e92bf7e4540693758cc222d31314. Investigation: 29 October 2026, Asia/Karachi. Composer 2.10.3 (2026-08-27); PHP 8.3.36 and 8.4.27. PHP 8.4 uses process-local `-d extension=sodium`; global PHP configuration is unchanged.

## Advisory discrepancy and disposition

Fresh `composer audit --locked --format=json` exited **1** before remediation. The only reported package was symfony/mime v7.4.19, medium PKSA-wtxr-p26d-nn42 / CVE-2026-45070 / GHSA-vqc8-7275-q272. Full constraints are retained in EVIDENCE.json and the private audit-before.json; the relevant 7.x interval is >=7.4.0,<7.4.22 (earlier 7.x intervals are also affected).

The discrepancy was real upstream metadata disagreement, not proof of safety:

- [Symfony's corrected advisory](https://symfony.com/blog/cve-2026-45070-email-header-injection-via-non-token-characters-in-mime-parameter-names) explains that the originally named fix was never merged into a release branch. It now names 7.4.22 as the first fixed 7.x release; page metadata records modification on 28 October 2026.
- [GitHub's advisory database entry](https://github.com/advisories/GHSA-vqc8-7275-q272), fetched independently, still displayed the earlier 7.4.12 boundary and a May update date. This stale entry is explicitly not treated as clearance.
- [The signed Mime v7.4.22 release](https://github.com/symfony/mime/releases/tag/v7.4.22) identifies the parameter-name rejection fix and source commit 94a4c017435bc515f5ac80421a2c555fb9ca3676.

A local, non-delivering serialization probe independently confirmed the defect: the baseline accepted a CRLF parameter name and serialized an injected synthetic header; the updated package rejects it with RfcComplianceException. Normal parameter names and several invalid token characters are covered by the new PHPUnit test. No exploit mail was sent.

Conclusion: **genuine vulnerable package**, remediated by the smallest compatible available patched release. Composer command: `update symfony/mime:7.4.22 --minimal-changes --no-interaction`. Only symfony/mime changes version (7.4.19 -> 7.4.22); Laravel remains 13.39.0, Brick Math 1.0.0, PHPUnit 12.5.42, Pint 1.32.1 and Mockery 1.6.15. No Laravel/Symfony major upgrade. No audit ignore, disabled auditing or broad exclusion.

Fresh post-update locked JSON audit exits **0**, with no advisories or abandoned packages. Both runtime platform checks and strict TLS SMTP fixture suites pass. These checks cover locked dependencies at the recorded time; later advisories require a fresh audit.

## Version-constraint policy

Direct framework/library/tool requirements use caret constraints starting at the accepted tested version: ^13.39.0, ^1.0.0, ^12.5.42, ^1.32.1 and ^1.6.15. PHP stays ^8.3 and required extensions remain unchanged. No exact-pin exception is needed. Future updates stay within each compatible major and require review, fresh audit and regressions; this milestone's partial update did not float other packages.

The committed lockfile retains exact installed versions and source references. Install from the lockfile for reproducibility, rather than running an unrestricted update during release. [Composer's constraints guidance](https://getcomposer.org/doc/articles/versions.md) and [lockfile workflow](https://getcomposer.org/doc/01-basic-usage.md) support this distinction. The content hash was regenerated through Composer itself. Normal `validate` and `validate --strict` now both exit **0**, replacing the baseline exact-constraint warnings/strict exit 1.
