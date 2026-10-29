# PHP-7.8 management HTTP security headers

## Before and implementation

The actual earlier HTTPS management origins returned no Content-Security-Policy or X-Frame-Options; API no-store/nosniff and Secure/HttpOnly/Strict session cookies already existed. Private raw headers for all six earlier public/management ports are recorded in `tmp/php-runtime/php78/headers-before.json`. No earlier service configuration was rewritten.

`ManagementHeaders` now wraps management responses globally. The existing Laravel exception-render callback also applies the same headers, so application/framework error rendering does not bypass the policy. API bodies, status contracts and authentication logic are unchanged. Scope is `/management` and `/api/v1/management` descendants; public inquiry handling remains separate.

Apache must independently protect static management HTML, JS/CSS and its own errors. The private document-root example now requires mod_headers and unsets the onsuccess table before setting the authoritative always-table policy. This avoids duplicate upstream policy headers. The PHP-7.8 preview uses these exact directives only on port 9474; public vhost caching and public policy remain separate. The example is an explicit deployment requirement, not a claim that GoDaddy has been configured.

## Policy

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Cache-Control: no-store
Referrer-Policy: same-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-Robots-Tag: noindex, nofollow
```

No wildcard, unsafe-inline, remote CDN or CSP report-only substitute is used. React's existing property-based style updates remain usable; financial print styles are existing same-origin CSS. Downloads use existing workbook generation, not an added external script. No UI redesign or dependency was added to satisfy CSP.

## Actual acceptance

See TEST-RESULTS and the sanitized response inventory in EVIDENCE.json. Checks include authenticated and unauthorized APIs, login/logout, missing/invalid CSRF, cross-origin rejection despite valid CSRF, malformed JSON, a real Laravel 503 from a malformed cookie, static bundles and Apache missing/private-path errors. Formerly valid synthetic sessions are expired server-side and rejected; no administrator credentials are changed.

The browser fixture binds an actual temporary TLS parent server to an OS-assigned free loopback port. It serves a document without CSP, a positive srcdoc frame, and real child HTTPS requests. It tests same-origin public and cross-origin management embedding denials and captures Chrome security-log evidence. The temporary parent server is closed after each check; no application route or policy exception is installed. Expected iframe denials are kept separate from unexpected application CSP violations.

Dashboard ranges, important management routes, mobile forms, contact inquiry/replay, Excel downloads and actual print/PDF rendering run against the new HTTPS preview. The page's policy-violation listener and JavaScript errors are checked separately; inspecting configuration text alone is insufficient.

## HTTPS / HSTS disposition

UAT uses short-lived self-signed loopback certificates and explicitly has no HSTS. Browser certificate acceptance is confined to disposable local test profiles; SMTP certificate verification remains strict. Do not infer production HSTS readiness from loopback success. Actual production HTTPS redirect, valid certificate, host/subdomain ownership, includeSubDomains and preload decisions require separate host verification and owner approval. No production HSTS, DNS or cPanel changes were attempted.

Production Apache must load mod_headers and permit these directives (or install equivalent vhost configuration). Require actual response verification on the eventual host; local tests do not clear the GoDaddy hosting gate.
