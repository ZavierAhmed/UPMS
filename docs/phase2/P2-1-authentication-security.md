> **2026-10-21 P2.1A decision amendment:** The owner approved existing XAMPP MariaDB for local development. Historical P2.1 results below remain evidence of the earlier milestone; Oracle MySQL installation is no longer a local acceptance prerequisite. Current provisioning, restricted-account testing and bootstrap status are recorded in [P2.1A executive summary](P2-1A-executive-summary.md). This amendment does not convert historical compatibility tests into current acceptance or production certification.
# Authentication and browser security

This is a local identity foundation pending independent review, real-MySQL acceptance and least-privilege provisioning. [Open risks](P2-1-open-risks.md) remain release gates.

## Maintained components

| Component | Resolved library / use |
| --- | --- |
| Password hashing | argon2 0.45.1, Argon2id, unique library-generated salts, memoryCost 19,456 KiB, timeCost 2, parallelism 1 |
| Opaque sessions | express-session 1.19.0, default cryptographically random IDs and maintained signed-cookie handling; custom database store hashes identifiers before persistence |
| CSRF | csrf-sync 4.2.1 synchronizer-token middleware; token stored in server session and sent through `X-CSRF-Token` |
| Validation | zod 4.6.7 strict object schemas, bounds and field allowlists |
| Database | mysql2 3.24.6 through Knex 3.3.0, bound SQL values, bounded pool and transactions |

Primary implementation references: [node-argon2](https://github.com/ranisalt/node-argon2), [express-session](https://expressjs.com/en/resources/middleware/session.html), [csrf-sync](https://github.com/Psifi-Solutions/csrf-sync), [Knex migrations](https://knexjs.org/guide/migrations.html), and [mysql2](https://sidorares.github.io/node-mysql2/docs). No custom password hash, random-number generator, cookie signature or CSRF protocol is implemented.

## Passwords, bootstrap and throttling

New passwords require 12–128 characters. Passwords never appear in API responses, audit fields or normal application logs. The only bootstrap interface is an explicit local TTY command; there is no registration/default credential/recovery endpoint or startup bootstrap. Bootstrap is serialized and permanently refuses once an administrator assignment exists.

Hash/verify work has a process-wide limit of two simultaneous operations and rejects additional expensive work immediately (429), without an unbounded hashing queue. Native hashing occurs outside locked identity write transactions. An unknown user verifies against an in-memory randomly generated dummy Argon2id hash at the same cost. Login rechecks enabled status, password hash and authorization version after verification under the database guard, before creating an authenticated session.

Login attempt counters are durable: ten attempts per normalized-login SHA-256 bucket per minute and sixty globally per minute. Unknown and disabled accounts follow generic invalid-credential behavior. Counters expire on the short window, do not permanently disable accounts and do not rely on spoofable client IP headers. The counter table is capped at 4,096 buckets; the session table is also capped at 4,096 records, with expiry cleanup on writes. Reaching bounded capacity denies new authentication instead of exhausting unbounded memory. A global rate cap can still be abused to deny access temporarily; deployment-edge controls and owner-approved tuning are necessary before public exposure.

Local Node 24.22.0 benchmark: hash approximately 24 ms and verify 23 ms, 19 MiB per active hash (up to two). These are observations on this machine, not managed-hosting budgets or a guarantee for the eventual platform. Native hashing loads lazily when requested, so disabled management does not load a native addon during public startup. Native Windows hashing and a production-only dependency install were verified; Linux/native-binary compatibility and combined pool/hash memory on the intended host remain unverified.

## Sessions and revocation

The browser holds only an opaque signed session cookie. Database primary keys are SHA-256 digests of the random identifier, never the raw cookie/identifier. JSON-text session data holds the user's ID, authorization version, issuance time, cookie metadata and CSRF binding; no password, raw bearer token or financial data. CSRF state is private session state, not a replacement bearer credential.

Defaults are a thirty-minute idle timeout and eight-hour absolute timeout, enforced server-side. Cookies roll with activity; absolute lifetime does not roll. Login calls `regenerate()` before setting authenticated state, issues a new CSRF token and explicitly saves. Role changes, disablement, password changes and explicit session revocation increment authorization versions and invalidate affected sessions. A privilege elevation therefore requires a new login/new session; stale sessions cannot acquire elevated permissions. Logout transactionally revokes the stored hash and audits it, then clears the browser cookie. A revoked tombstone rejects stale store writes; touch never upserts.

Each protected operation rechecks the persisted session, expiry, enabled user, version and grants under the same guard used by mutations. No in-memory permissions or process-local sessions are authoritative. A restart with the same signing secret can load the existing database session. Changing the signing secret invalidates cookies. A lost database connection produces a sanitized 503 and no offline authentication fallback. On expired/revoked sessions, protected operations return 401 before CSRF checks so the browser can clear private state and return to sign-in.

## Browser boundary

- Production: HTTPS-only management origin; `__Host-upms`, Secure, HttpOnly, SameSite=Strict, Path=/, no Domain. `__Host-` is intentionally not combined with a narrower cookie path. Path=/ may send the opaque cookie on public requests, but public handlers neither load nor use identity sessions.
- Isolated localhost HTTP: explicit opt-in and origin; separate `upms-local` cookie, HttpOnly, SameSite=Strict, Path=/, no Secure. This configuration is rejected under production.
- The Secure decision uses W06's existing verified `req.peer.secure`, not arbitrary forwarded headers. Express's trust-all proxy setting remains false. HTTPS host/proxy behavior is unchanged.
- Every management mutation requires exact configured Origin, JSON content type, bounded body and synchronizer CSRF token. Cross-site Fetch Metadata is rejected. No mutation through GET, permissive CORS, cross-origin credential exposure or browser localStorage token exists.
- Private HTML/assets/API responses use no-store and noindex. Existing CSP, clickjacking, MIME-sniffing and host protections remain in effect. React escapes staff names/reasons/audit text.
- Login shell and executable bundles are public code without credentials or records. Permission checks, response serializers and record queries protect data. Management is absent from public prerendering, sitemap and public HTML.

Audit events have actor or controlled bootstrap/system context, target, action, UTC time, event correlation reference and allowlisted details. Identity role/status changes include before/after state and reason. Password changes record only the action. Audit insertion failure rolls back privileged mutations; authorization denials are recorded in a separate guarded transaction after the denied action rolls back. Audit/database errors are not logged with SQL bindings or raw request data. The correlation is an event reference; a generic API error reference is not claimed to be a distributed tracing system.

Runtime audit grants are SELECT/INSERT only. A privileged database administrator can still alter history: no cryptographic tamper-proof claim is made. Off-host audit retention, backup restoration, MFA and emergency recovery need owner/security review. No live sender was activated.
