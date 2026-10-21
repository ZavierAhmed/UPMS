# P2.1 identity foundation implementation

Date: 2026-10-21 (Asia/Karachi). Baseline: `ad77c391cf6a8d640503330f090cb74e0e4d669e`. Branch: `feature/upms-p2-1-identity-foundation`.

**Status: implemented and locally verified on MariaDB compatibility infrastructure; partially complete against the requested MySQL definition of done.** The actual listener is MariaDB 10.4.32, not MySQL Server. The owner explicitly approved compatibility testing. A real MySQL integration run and least-privilege account provisioning remain release gates. No production readiness claim is made.

## Delivered scope

- Explicit Knex migrations over mysql2; nine identity/support tables plus two Knex tracking/lock tables. No business schema or startup migrations.
- Local, one-time administrator bootstrap with masked terminal password input, no default credential and no registration/reset endpoint.
- Argon2id hashing, bounded expensive work, durable account/global login throttling, generic invalid credentials and database-outage denial.
- Maintained express-session with a custom MySQL store: database keys are SHA-256 session-token hashes; browser identifiers are signed opaque random values. No raw session identifiers are persisted.
- Server-side current permissions, immediate revocation, guard-coordinated privileged writes and atomic audit evidence.
- Four confirmed department roles and eleven active identity permissions. No Auditor role or active business permissions.
- Separate React/Vite entry at `/management`, identity APIs under `/api/v1/management`, staff administration, own password changes, session revocation and restricted audit viewing.
- Tests for security boundaries, actual database transactions, public regressions and local HTTPS browser workflows.

## Composition and isolation

`server/src/app.js` mounts the opt-in management router after existing host/TLS middleware and before the public inquiry router, which deliberately handles unknown `/api` paths. Public inquiry code, contract, delivery modes, proxy rules, public React components, copy, approved assets, route registry and SEO remain unchanged. Disabled management retains the existing reserved-path behavior. Database connections are lazy and do not become a public request dependency.

`MANAGEMENT_ENABLED=true` requires an explicit valid management origin, private session secret and local DB configuration. HTTPS is mandatory in production. Local HTTP additionally requires an explicit localhost origin and `MANAGEMENT_LOCAL_HTTP=true`. No `.env` is read automatically. See [setup](P2-1-mysql-setup.md).

The public build still prerenders eleven routes and its 404 page. A second Vite build writes `dist/management/index.html` and isolated JS/CSS assets. No management link, script, session state or record is inserted into public HTML or sitemap. Login HTML and static management bundles are downloadable; they contain application code only. All private records come from permission-checked no-store APIs. This deliberately refines P2.0's proposed gated-asset design: login needs a bootstrap bundle, and confidentiality rests on backend authorization rather than JavaScript secrecy. Management HTML/assets carry noindex and no-store. Source maps are disabled.

The ZIP allowlist adds only the exact management HTML and JS/CSS build paths. The runtime-source `.js` allowlist is unchanged; arbitrary documents, uploads and environment files remain forbidden. Migration tools and review SQL are repository-side operator tools, not ZIP startup tasks. Packaging success is not deployment authorization.

## Transaction and revocation boundary

Every identity service operation locks one precreated `identity_guard` row. Current session existence, expiry/revocation, enabled user, authorization version and effective grants are rechecked inside this transaction. Reads and mutations therefore have a defined authorization point. If revocation commits first, a later action is denied; an action authorized first may finish before revocation obtains the guard. No claim is made that already delivered browser data can be recalled.

Create/update/disable/role assignment/password/revoke/bootstrap mutations append their required audit entry in the same transaction. Audit failure rolls the mutation back. Role changes increment the affected user's authorization version and remove affected session records. Logout leaves a revoked token-hash tombstone until absolute expiry, preventing a stale store write from recreating it. Store writes also recheck current enabled status/version. Database-defined permissions are read afresh; no role label or React navigation grants access.

The global guard is intentionally conservative for this small identity foundation. It is not a business posting coordinator and must be reviewed before adding future module locks or high-throughput operations.

## File groups

| Files | Purpose |
| --- | --- |
| `server/src/identity/config.js`, `database.js`, `migrations.js` | Explicit configuration, bounded local SQL pool, UTC setup and migration safety |
| `catalog.js`, `validation.js`, `passwords.js` | Confirmed roles/grants, allowlisted inputs and maintained hashing |
| `service.js`, `session-store.js`, `router.js` | Transactional identity services, persistent hashed sessions and private API boundary |
| `server/migrations/202610210001_identity.js` | Versioned identity-only migration and seed catalogue |
| `server/tools/identity.mjs`, `provision-local.review.sql` | Local operator commands and intentionally non-executable owner-editable provisioning template |
| `server/src/app.js`, `index.js` | Opt-in router integration and pool cleanup at shutdown |
| `upms.client/management/**`, `vite.management.config.js` | Isolated login/private management shell with approved graphite/orange/warm-white colors |
| `server/tests/identity.test.js`, `mysql/identity.integration.js`, `verify-identity-browser.mjs`, `upms.client/src/test/Management.test.jsx` | Unit, real-server compatibility/integration and browser evidence |
| Root package/lock, client package, `.env.example`, ZIP packager, README | Maintained dependencies, commands, configuration template and narrowly scoped build packaging |
| Seven `P2-1-*.md` files | Implementation, setup, schema, security, authorization, verification and remaining risks |

## Next milestone

First complete the missing real-MySQL/least-privilege/recovery review gates and obtain independent P2.1 approval. P2.2 shared business controls and masters remain a separate authorization; no inventory, challan, purchase, payment, ledger or financial endpoint exists here.
