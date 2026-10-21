> **2026-10-21 P2.1A decision amendment:** The owner approved existing XAMPP MariaDB for local development. Historical P2.1 results below remain evidence of the earlier milestone; Oracle MySQL installation is no longer a local acceptance prerequisite. Current provisioning, restricted-account testing and bootstrap status are recorded in [P2.1A executive summary](P2-1A-executive-summary.md). This amendment does not convert historical compatibility tests into current acceptance or production certification.
# Department permissions and identity API

Four confirmed departments are seeded. Auditor/read-only and future business actions are not active roles or permissions. Administrator receives all eleven explicitly enumerated identity grants; there is no implicit role-name/superuser bypass. Staff may have multiple departments, with the union of assigned grants. Permissions are fetched from the database on every protected operation.

| Active permission | Administrator | Inventory | Sales/Dispatch | Accounts |
| --- | --- | --- | --- | --- |
| `portal.access` | Yes | Yes | Yes | Yes |
| `profile.read` | Own | Own | Own | Own |
| `profile.password` | Own | Own | Own | Own |
| `sessions.self` | Own | Own | Own | Own |
| `users.read` | Yes | No | No | No |
| `users.create` | Yes | No | No | No |
| `users.update` | Yes | No | No | No |
| `roles.read` | Yes | No | No | No |
| `roles.assign` | Yes | No | No | No |
| `audit.read` | Yes | No | No | No |
| `sessions.revoke` | Any user | No | No | No |

User creation and access updates also require `roles.assign`. Ordinary staff cannot assign themselves Administrator, create another privileged user, read another user's record, view role-permission catalogues or inspect audit history. The backend enforces these rules independently of navigation. The user list excludes password hashes and session data; own-profile responses contain only ID, username, display name, current roles/permissions and authorization version. No balances, account totals or business records exist in this milestone.

## API contract

All paths below are relative to `/api/v1/management`. Responses are no-store; errors are `{ "error": { "code": "STABLE_CODE", "reference": "opaque-reference" } }`. No SQL, hash, cookie, stack or account-existence detail appears in errors.

| Method/path | Requirement | Request / success |
| --- | --- | --- |
| GET `/session/csrf` | Anonymous same-origin browser bootstrap; cross-site metadata rejected | `{csrfToken}`; creates bounded server session state only |
| POST `/session/login` | Exact Origin + CSRF + throttling | Strict `{username,password}`; generic invalid/unknown/disabled credentials 401; success `{user,csrfToken}` with rotated cookie |
| GET `/session/current` | Current session, `portal.access`, `profile.read` | `{user,csrfToken}` |
| POST `/session/logout` | Current session, `portal.access`, CSRF | `{}`; revoke cookie/session and audit; 204 |
| GET `/roles` | `roles.read` | `{roles:[{code,name,permissions}]}` |
| GET `/users` | `users.read` | `{users,limit:100}`, first 100 by ID; no secrets |
| POST `/users` | `users.create` + `roles.assign` | `{username,displayName,password,roles,reason}`; 201 `{user}` |
| PATCH `/users/:id` | `users.update` + `roles.assign` | `{enabled,roles,version,reason}`; `{id,version}`; existing name/login/password not editable through this endpoint |
| POST `/profile/password` | `profile.password` | `{currentPassword,newPassword}`; 204 and revoke every own session |
| POST `/users/:id/revoke-sessions` | Own: `sessions.self`; others: `sessions.revoke` | `{}`; 204; bump version + revoke + audit |
| GET `/audit` | `audit.read` | `{events,limit:100}`, most recent 100; protected allowlisted event details |

401 indicates absent/expired/revoked identity or generic invalid credentials. 403 indicates CSRF/origin/permission denial. 400 invalid input, 409 duplicate username/stale version/last-administrator conflict, 413 oversized request, 415 unsupported content, 429 bounded login/hash overload, 503 identity/database unavailability. Unknown protected API paths return 404 after session authorization. No placeholder business API is registered. Reasons are mandatory for staff creation/access updates; session/password actions use explicit action-specific audit evidence.

## Revocation and mutation rules

All grants are resolved under the database identity guard. Create/update uses allowlisted role codes; no arbitrary `permissions`, `administrator=true` or other request field is accepted. Access edits require the current authorization version to prevent lost updates. Disabling/removing Administrator from the only enabled administrator is rejected. Bootstrap refuses if any administrator already exists, including disabled assignments; it does not reopen itself as recovery.

Role-assignment/status/password/session changes invalidate sessions immediately through version increments and persisted record changes under the guard. An in-flight action authorized before revocation may finish first; one authorized after the revocation commit fails. Repeated old requests and separate database connections cannot reuse a stale grant. Permission-definition changes are not a runtime UI/API feature: future reviewed catalogue migrations must lock the guard, audit the grant change and increment/revoke every affected user. Do not edit grants manually outside that protocol.

Future department boundaries remain Inventory without financial balances, Sales/Dispatch with explicitly permitted customer/challan/rate fields, Accounts with financial views, Administrator oversight. A test-only Express resource in `mysql/identity.integration.js` demonstrates quantity-only serialization for Inventory and an independent rate permission; a test-only grant revocation invalidates its session. Those synthetic routes and grants are confined to the disposable test process/schema and are never mounted or seeded by the application migration.

The UI provides explicit create/edit/reason controls, logout, own password/session actions, department-aware navigation, access denial and expired-session handling. Limits of 100 accounts/events are deliberately visible; pagination/search beyond that bound is deferred and must not be presented as an unlimited directory/history browser.
