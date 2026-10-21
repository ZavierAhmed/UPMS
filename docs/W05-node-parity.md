# W05 parity gate

Base: `bfb28d318939b33e1edd2d76613cc2f4353ba8ba`. The intact W04 .NET projects ran **74/74 passing tests** before removal. The Node suite recreates the essential behavior and adds bounds/shutdown/privacy checks. Differential checks ran against the original .NET Development server on loopback with delivery explicitly Disabled and a 100-attempt test limit; only synthetic requests were used. See [machine-readable evidence](W05-parity-results.json) and [test source](../server/tests).

| Behavior | W04 .NET | Node implementation/evidence | Gate |
| --- | --- | --- | --- |
| Eleven public routes | Manifest-backed initial HTML and runtime SEO | Same Vite build/manifest; byte comparison of all eleven public HTML responses, metadata/link assertions and browser matrix | PASS |
| Unknown routes, reserved/private paths | HTML 404 for public unknowns; empty 404 for files/admin/management | Differential status/body/header checks plus traversal/outbox/source-file tests | PASS |
| Methods | Public pages GET/HEAD; known-page POST/PUT/OPTIONS 405; unknown 404 | Differential method checks; Allow GET, HEAD on public 405 | PASS |
| Robots/sitemap methods | GET only; other methods fall through to empty 404 | Explicitly preserve this observed W04 behavior, including HEAD; differential cases | PASS |
| Canonical configuration | Public HTTPS DNS origin only; blank noindex/disallow-all/sitemap 503 | Origin rejection tests, exact no-origin public HTML/robots comparison, sitemap registry tests with synthetic configured origin | PASS |
| Static content | Allowlisted prefixes/files; immutable assets and one-hour ancillary cache; licenses noindex | Real assets fetched/typed/compressed; licenses and SVG compared | PASS |
| Inquiry POST contract | Case-insensitive route, trailing slash; generated correlation, no-store, structured JSON including null errors | Differential status/body comparisons ignoring only generated correlation IDs; Node correlation assertions | PASS |
| Required/optional validation | Trim/null defaults, exact limits/categories/field messages, controls, phone/email checks and honeypot | C# source reviewed; differential cases include unusual mailbox syntax and field messages; Node parameterized cases | PASS for covered inputs |
| Bad JSON/media/size | JSON max depth 8, 16 KiB including chunked, correct error codes | Differential malformed/type/size/media cases; Node chunked, depth and UTF-8 protections | PASS |
| Origin and CORS | Cross-site/cross-origin denied before body parsing; no CORS | Differential body/status checks, alternate API spelling and configured-origin tests | PASS |
| Rate limiting | Fixed ten-minute client window, 5 default/1–100 clamp, no queue, Retry-After | Node fixed-clock test covers duplicate consumption/reset and 429 contract; C# baseline rate test | PASS |
| Retry/idempotency | Normalized fingerprint, canonical UUID, concurrent shared delivery, 409 conflict, 1000 entries, completed 30-minute expiry | Node concurrency/UUID-case/conflict/capacity/expiry/pending tests; C# baseline duplicate test | PASS |
| Delivery failure/timeout | Unavailable 503; rejected 502; unknown 503 with reference, cached for retry; no sensitive logs | Node outcome/error/log/timeout/shutdown tests; C# baseline same outcomes | PASS |
| Disabled/test delivery | Disabled by default; DevelopmentFile only in Development; atomic private outbox; explicit development_saved | Real local file test and browser outbox acceptance; production modes without credentials unavailable; C# baseline | PASS |
| SMTP | Fixed plaintext envelope; required authenticated TLS; accepted != inbox receipt; disconnect cannot undo acceptance | Injected transport tests for auth/connect/reject/unknown/accept/disconnect; no real SMTP traffic | PASS locally; live egress unverified |
| Security/proxy | Explicit host, exact peer/one forwarded hop, ignore forwarded host, HTTPS 307/HSTS/CSP/security headers | Node middleware tests and production-mode local HTTPS browser checks; C# baseline peer/host tests | PASS locally; Hostinger topology unverified |
| Compression/error handling | Website compression, API excluded; safe errors | Asset gzip and API no-encoding assertions; logs/errors checked for synthetic secrets | PASS |
| Existing sample /weatherforecast | Five random date/temperature/summary records | Kept as compatibility endpoint; Node shape test. No business feature added | PASS schema; random values naturally differ |
| Development OpenAPI | .NET generated tooling endpoint | Removed with .NET tooling; no production/public client dependency | Documented tooling difference |

## Bounded differences and limitations

The public website implementation, route data, visual styles and assets are unchanged. Vite development now uses HTTP and proxies API requests to Node; developer certificates and Visual Studio integration are no longer prerequisites. Production remains HTTPS through its verified edge.

Sitemap XML serialization and missing-origin problem-detail wording reference the new PUBLIC_ORIGIN name; content/status semantics remain the same. gzip is supplied by maintained compression middleware; Brotli from W04 is not reproduced in-process, and can be supplied by the hosting edge after verification. The essential compression contract and API privacy exclusion are tested. Error-header ordering/content-length/framework-generated transport details are not promised identical.

Email validation is implemented in JavaScript rather than System.Net.Mail. Differential vectors cover standard, quoted, local-domain, malformed and header-injection inputs; this is not an exhaustive equivalence proof for every RFC mailbox grammar edge. No accepted field format or success/error semantics in the tested W03 contract changed. Conservative delivery categorization is intentional: errors without confirmed rejection/acceptance never become successful delivery.

The Node rate-limit client map is bounded at 10,000 active clients and fails closed with 429 at capacity; W04's partition storage had no explicit application cap. Idempotency remains process-local, one process only. Restart/expiry can allow resubmission; there is no durable delivery queue or exactly-once claim.

The original .NET projects were removed only after the 74-test baseline, passing Node essential tests and differential parity gate. Historical documents remain; original code/test sources remain in the W04 commit. Reproduce the differential harness against an isolated W04 checkout/build with the same public build, never a live sender. Use NODE_ENV/ASPNETCORE_ENVIRONMENT Development, Inquiries__Mode=Disabled, Inquiries__RateLimit=100, ASPNETCORE_URLS=http://127.0.0.1:5080; run `npm run test:parity`. Hostinger account compatibility is a separate deployment blocker, not a local parity failure.
