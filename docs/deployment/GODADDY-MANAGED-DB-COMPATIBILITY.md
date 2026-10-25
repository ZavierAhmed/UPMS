# GoDaddy managed MySQL assessment

Status: **PARTIAL — COMPATIBILITY BLOCKED**, 2026-10-25. Source: `fc1fe660bd97c5daa95ea5399e9285ca6c1d19c6`. Branch: `feature/upms-godaddy-managed-db`.

The owner selected GoDaddy Managed Node.js Hosting and reports that the previous Node 22 package starts. The owner can see Hosted Database creation/browsing/import and separate Preview/Publish secret tabs. Exact Node patch, database engine/version, endpoint, TLS, restricted users, underlying isolation and recovery are unknown. No direct access to the owner's authenticated dashboard was provided. No GoDaddy database connection, provisioning, migration, import or operational posting has been attempted.

## Official evidence and its limits

Reviewed on 2026-10-25:

- [GoDaddy FAQ](https://www.godaddy.com/help/godaddy-nodejs-hosting-faq-42915): ZIP deployment, root package metadata, build/start scripts, assigned PORT and runtime dependencies. It does not specify this account's MySQL version, certificate, privileges or proxy peers.
- [Official deployment contract](https://github.com/godaddy/nodejs-hosting-agent-skill/blob/37fb2ea7d1d7b54fa716a60134e915e3e24bd98c/skills/godaddy-nodejs-hosting/contract.md): outbound networking is limited to HTTP/HTTPS and the platform's managed MySQL; private external MySQL is not a verified fallback. A public npm registry configuration is required.
- [Official managed MySQL recipe](https://github.com/godaddy/nodejs-hosting-agent-skill/blob/37fb2ea7d1d7b54fa716a60134e915e3e24bd98c/skills/godaddy-nodejs-hosting/examples.md#managed-mysql): provider-injected `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`. These values alone do not prove isolation.
- [ZIP upload instructions](https://www.godaddy.com/help/upload-my-ai-generated-app-to-godaddy-nodejs-hosting-42987): Preview, secrets, restart, logs and database controls. Its documented persistent `public/assets` location must not hold private backups or credentials. This is not evidence of secure private storage.
- [mysql2 TLS options](https://sidorares.github.io/node-mysql2/docs/examples/connections/create-connection#createconnectionconfig--ssl-custom-certificate): CA-based TLS. The installed mysql2 source additionally shows that `verifyIdentity:true` is necessary for hostname verification; certificate-chain verification alone is insufficient.

The supplied brief warns Preview and Publish may share a database. The retrieved official pages do not resolve this account's actual arrangement. Treat it as shared/unsafe until independently demonstrated otherwise; no claim of confirmed provider isolation is made.

## Implementation boundary

`UPMS_DATABASE_PROFILE=godaddy-managed` is explicitly recognized and **always rejected by operational database/configuration paths** with `GODADDY_COMPATIBILITY_BLOCKED`. No environment variable can mark provider acceptance. Unknown profiles also fail. Existing loopback, schema, account, migration, engine, immutable posting and opening gates remain in force. Existing production initialization has not gained a remote override.

`server/src/godaddy/policy.js` contains assessment building blocks for exact endpoint/CA options, authenticated TLS session checks, independent isolation observations, actual server identity and exact runtime table privileges. They are exercised by local tests, not wired into an accepted remote pool. They do not establish real provider acceptance or authorize SQL.

The optional `godaddy-preview-blocked` hosting mode serves a visibly disabled management sign-in screen, no JavaScript application execution, no cookies/sessions and no database pool. Every management API method returns 503; website/private paths return 404. Its exact hostname is `2idp3wfsef.preview.c35.airoapp.ai`; no suffix wildcard is accepted. Production posting flags and private login/database/session secrets reject startup. This is a diagnostic screen, not a working login or business workflow.

## Required future acceptance

Collect the checklist in `GODADDY-PREVIEW-ENVIRONMENT.md`. Review control-plane database IDs and credential scopes first. Only then authorize a read-only TLS/identity/grant probe using a dedicated account. Verify encrypted, authenticated hostname-matching TLS before any SQL; compare MySQL server UUID/version/server_id/port, actual schema and CURRENT_USER against separately reviewed observations. Reject insecure TLS, arbitrary endpoints, URI redirects, custom streams, tunnels, engine changes and partial/unknown schema state.

Require separate actual staging and future live databases, distinct credentials, and measured denial of each account's access to the other database. Different secret-tab values alone are insufficient. Confirm Preview cannot access live credentials and Publish cannot inherit staging credentials through injection or deployment copying. If this cannot be proven, the managed service is incompatible with operational UPMS under the current policy.

After provider verification, a **separate reviewed implementation and approval** must connect the managed pool, preserve exact schema/migration checks and adapt account matching to the provider's actual identities without broadening rights. Then approve a fresh staging target and full workflow/restore rehearsal. Future production initialization remains separately unapproved.
