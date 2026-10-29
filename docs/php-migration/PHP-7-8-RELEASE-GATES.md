# PHP-7.8 release gates

Technical remediation is separate from authorization to release. **Production remains NO-GO.** Owner manual acceptance is **PENDING OWNER**; stop before PHP-8.

| Previously failed gate | Before | After / evidence |
| --- | --- | --- |
| UAT-SEC-01 dependency audit | Exit 1: Mime 7.4.19 / PKSA-wtxr-p26d-nn42 | Patched Mime 7.4.22; locked JSON audit exit 0, no advisories; before/after serialization probe and both runtime SMTP fixtures |
| UAT-SEC-02 management headers | Actual API lacked CSP and frame denial | Laravel plus actual private Apache policy; success/rejection/error/static/authentication responses and actual iframe/CSP browser checks in HTTP-HEADERS and TEST-RESULTS |
| UAT-STYLE-01 full Pint | Seven files failed | Formatting-only cleanup; full Pint exit 0, separate diff reviewed and regressions executed |
| UAT-VALIDATE-01 strict Composer | Exact constraints caused strict exit 1 | Compatible caret constraints with exact committed lockfile; normal and strict validation exit 0; both platforms pass |

The private build still emits the existing >500 kB minified-chunk warning. It is not a new dependency vulnerability or one of the four failed gates; no dashboard redesign or code-splitting scope was added.

## Remaining production risks

| Boundary / decision | Disposition |
| --- | --- |
| Original command fingerprint authenticity | PENDING OWNER: current schema cannot authenticate an original fingerprint; a replacement well-formed hash may remain undetected. No redesign authorized. |
| SQL posted-row immutability | PENDING OWNER: column grants do not enforce immutable posted rows; trusted runtime remains part of the boundary. |
| SQL self-user password update scope | PENDING OWNER: SQL grants do not restrict updates to the current user's row; application restriction remains necessary. |
| Historical/import provenance | PENDING OWNER: only synthetic histories examined; no real owner data accessed. |
| Unknown SMTP outcome procedure | PENDING OWNER: approve delivery_unknown/busy handling and private evidence review; never blindly resend. No live SMTP delivery tested. |
| Actual GoDaddy PHP/process/filesystem support | BLOCKED pending host verification of extensions, process execution, filesystem/locking/atomic operations, TLS, quotas, private storage and effective security headers. |
| Production backup/recovery | PENDING OWNER: approve protected off-device backups, retention, restore schedule and production RTO/RPO. |
| Manual business/design UAT | PENDING OWNER: record tested SHA, name/date and actual results; no automatic sign-off. |
| Native Excel and Windows physical/PDF print destination | PENDING OWNER: headless PDF and workbook XML checks are not native application acceptance. |
| HSTS / production host policy | PENDING OWNER: valid production HTTPS and host/subdomain decisions must precede any preload/includeSubDomains change. Loopback UAT intentionally has no HSTS. |

No risk is accepted on the owner's behalf. No real database mutation, live posting, administrator reset, schema change, deployment, DNS update or production ZIP occurred.
