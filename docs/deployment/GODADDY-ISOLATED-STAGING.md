# Separate GoDaddy staging app and database

GoDaddy is the selected provider. Staging must be a **different app with a separately assigned hosted database**, not Preview of the existing management app. Preview/Publish within each app may share that app's database; that fact does not isolate staging from live data.

## Subscription and fee gate — before creating anything

The account dashboard, current subscription, used app slots and incremental database/storage charges could not be inspected. Browser policy stopped Computer Use because it could not confidently determine the Windows browser URL. No app, database, credential or subscription was created or changed. **Account entitlement and additional fee are unverified; creation is blocked until they are checked.**

Public information is context, not this account's entitlement. GoDaddy's [official launch article](https://www.godaddy.com/resources/news/godaddy-nodejs-hosting-launch), retrieved 2026-10-26, lists two Preview apps and published allowances of 1/10/25 for Economy/Deluxe/Ultimate; it says managed MySQL is included with published apps. The [FAQ](https://www.godaddy.com/help/godaddy-nodejs-hosting-faq-42915) and article differ on Preview retention, so do not rely on a free Preview as durable staging. These sources do not prove that this account has a spare slot or that a second unpublished app can receive a durable independent database without a charge or publication.

Before app creation, the owner/provider must record the actual plan/product and renewal terms, current/remaining app and database allowances, whether the second app gets its own database in non-published staging, private logs/storage availability, and the exact incremental price including recurring fees/taxes. If a purchase, upgrade or publication is required, stop for a reviewed owner decision; do not incur a charge or publish to obtain a database. This task does not authorize either.

## Creation procedure after entitlement/cost review

These are required outcomes for GoDaddy's app-creation workflow, not claimed observed dashboard button labels:

1. Select creation of a **new** Managed Node app, under the reviewed subscription. Assign a clearly staging-only name; do not duplicate/overwrite the existing management app or import its settings wholesale.
2. Record its distinct provider app ID/control-plane reference and deployment receipt. Do not attach `app.unique-plastic.com`, the public website domain or any other production domain. Do not change DNS or press Publish. If the provider cannot supply the database under these constraints, stop and document that requirement.
3. Obtain a separately assigned hosted database for this app. Record distinct provider database ID, schema, server UUID/ID and database assignment evidence privately. A different app name or copied environment is not sufficient. Same physical server UUID may be acceptable only with a separately assigned schema/database and proven account isolation; identical server UUID plus schema is a collision and must stop the workflow.
4. Require distinct database credentials and distinct private secret references/scopes. Never copy production `DB_PASSWORD`, session secret, owner/admin credentials, exported data or posting flags. Keep `UPMS_PRODUCTION_POSTING` and all production/management selectors absent from the diagnostic app. No company data is permitted.
5. Verify the assignment from the provider control plane, then run the separately reviewed one-shot read-only package with purpose `isolated-synthetic-staging` **only if its lifecycle/storage contract is supported**. Preserve the staging artifact SHA, source SHA, run UUID, app reference and log receipt separately from the existing-app assessment.
6. Compare the two private receipts: app IDs, hosted database IDs and credential identities must differ; actual schema/server identities must not collide. Check current grants for cross-database/global access. Confirm account/secret isolation through reviewed provider/grant evidence without testing writes to production. Unknown or broad rights are blockers; the first read-only tool does not certify a complete runtime grant allowlist.
7. Keep the staging schema uninitialized and operational code disabled at this milestone. No automatic migrations or synthetic SQL posting is included in the diagnostic artifact. After actual compatibility and isolation review, prepare a separate implementation for secure remote runtime connection, exact identities/UUID, initialization, scoped migration/runtime/backup users, independent restoration and synthetic operational acceptance. That implementation requires its own review and authorization.

## Evidence required before declaring isolation

| Evidence | Existing assessment app | New staging app |
| --- | --- | --- |
| Provider app ID/control-plane record | Private reviewed record | Different private reviewed record |
| Provider database ID/attachment | Observed assignment | Distinct independently assigned database |
| Schema + server UUID/ID | Read-only verified TLS receipt | Read-only verified TLS receipt; no collision |
| Runtime account / secret scope | Privately recorded | Distinct credentials/references; no cross-schema/global rights |
| Deployment/run receipt | Source SHA, ZIP SHA256, fixed run UUID | Separate receipt and run UUID |
| Domains/data/posting | Preserve current configuration | No production domains/data or production posting flags |
| Charges/entitlement | Record actual plan usage | Spare entitlement and exact incremental fee reviewed before create |

Until every item is backed by actual evidence, report `ISOLATED_STAGING_NOT_ESTABLISHED`. Do not infer isolation from environment variables, names, an app-clone feature, successful TLS or an empty schema. No staging app has been created by this change.
