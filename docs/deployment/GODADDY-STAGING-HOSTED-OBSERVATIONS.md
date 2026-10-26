# Hosted observations and current decision

Review date: 2026-10-26. Starting SHA: `79acffb3d3a62c000c942c022916db633b545e0c`.

## Owner/provider confirmations supplied with this request

- GoDaddy Managed Node Hosting does not provide an interactive private terminal.
- The actual app runtime receives DB_HOST, DB_PORT, DB_NAME, DB_USER and DB_PASSWORD automatically.
- Controlled diagnostic/migration workflows are supported through application/deployment processes in general.
- Preview and Publish of the same app share its attached database.
- GoDaddy remains the selected hosting provider.

These are supplied confirmations, not independently observed dashboard controls or database results. General workflow support does not confirm a one-shot startup exit/no-restart contract or permit migrations.

## Independently retrieved public documentation

The [GoDaddy launch article](https://www.godaddy.com/resources/news/godaddy-nodejs-hosting-launch) describes a persistent Node 22 process and ZIP/GitHub deployment. The [official FAQ](https://www.godaddy.com/help/godaddy-nodejs-hosting-faq-42915) does not establish an exiting one-shot workflow, restart/health policy or private persistent run-state directory. Public plan allowances are recorded in [the staging guide](GODADDY-ISOLATED-STAGING.md); they are not account-specific entitlement or a fee quote. Public Preview retention information conflicts, so persistence must be independently confirmed.

## Dashboard and hosted execution

Computer Use inventory was attempted. Browser access stopped because Windows browser URL identification was not sufficiently reliable for policy enforcement. No dashboard settings, subscription, billable app creation flow or secret settings were inspected or changed after that stop. No public diagnostic URL was introduced as a fallback.

| Required actual evidence | Result |
| --- | --- |
| Actual hosted Node patch | Not observed; local runner reports and enforces Node 22.23.4+ |
| Specific exiting one-shot/no-restart execution method | Not confirmed; public docs describe persistent processes |
| Private persistent/exclusive storage outside package | Not confirmed |
| Private application logs / retention / access control | Not observed |
| Assigned endpoint and authenticated TLS / cipher / hostname | Not observed |
| Engine, complete version, server UUID/ID/port/read-only flag | Not observed |
| Schema, current account, redacted grants and table/migration presence | Not observed |
| Subscription spare app/database entitlement and incremental fee | Not observed; no purchase or app creation |
| Separate staging app/database/credentials/receipts | Not established |
| Diagnostic upload, deployment or execution | Not performed |

## Compatibility verdict

**BLOCKED — actual hosted database compatibility and separate staging remain unverified.** The existing app's Preview/Publish sharing is confirmed and cannot serve as isolated synthetic staging. The one-shot implementation is prepared and locally tested, but its required provider lifecycle/storage contract has not been established. If GoDaddy only supports persistent web processes for this workflow, this package is incompatible with that lifecycle; stop and request a supported private one-time task, rather than add a web trigger or keepalive server.

No operational profile/host/schema/identity restriction was relaxed. No hosted queries, migrations, initialization, account changes, data import, production posting, publication or DNS changes occurred. A later compatible assessment may justify preparing a separate reviewed runtime/migration/backup implementation; it does not itself authorize initialization. Exact unsupported requirements must be recorded from actual provider responses before declaring the database service incompatible.
