# GoDaddy Preview settings and owner checklist

Current outcome: diagnostic preview package only; operational login/database remain blocked. No public website or DNS change is required. Do not publish.

## Collect these non-secret settings

In GoDaddy **My Apps → upms-management-node22 → Database / Hosted Database**, record the following without clicking Create, Import, Run SQL, Reset or Delete:

1. Exact database product and full version, if shown; whether it is Oracle MySQL or a compatible service. If absent, ask GoDaddy support for the value and supported TLS protocol versions.
2. Exact database hostname, port and database/schema name. Record whether values are automatically injected and whether custom DB_* values can override them. Never copy a URI containing credentials.
3. TLS control: required/optional, CA download/source and rotation policy, certificate hostname/SAN, and whether certificate chain plus hostname verification is supported. Record any client-certificate requirement. Do not obtain private keys for sharing in chat.
4. Database/instance resource IDs for Preview and Publish and whether they are the same. Can a second independent database be created and bound to Preview only? Can a separate app be used without automatic cross-binding? Record provider documentation/support reference.
5. Users/permissions page: can distinct runtime, migrator and backup users be created? Can privileges be restricted to exact tables, with no runtime DDL, global access, GRANT OPTION, or UPDATE/DELETE on journals/audit? Record configurable source-host restrictions; do not copy passwords or password hashes.
6. Secret scopes: whether Preview can read Publish secrets, whether DB credentials are injected outside the tabs, whether publishing clones/overrides Preview secrets, and whether “Restart Preview” changes Publish. Different tabs are not isolation evidence.
7. Backup/export controls: full consistent logical export, triggers/routines inclusion, scheduling, retention, encrypted downloads, point-in-time recovery if offered, and restore **into a new target**. Is an independent restore supported without replacing the source?
8. Private storage: path/access model, persistence across restart/deploy, backup scheduling facility and off-host export mechanism. Public assets are unsuitable for private backups.
9. Runtime logs/settings: actual complete Node version and OS/architecture; the diagnostic startup log records Node version without secrets. Local 22.23.4 passing does not establish the provider's patch.
10. Proxy/network documentation: exact immediate proxy peer IPs, whether client-supplied forwarded headers are stripped/rewritten, nearest-hop ordering, host-header preservation, direct origin access protection and request timeouts. Do not select trust-all or copy guessed peer addresses.
11. Deployment behavior: production dependency install/build/start, preview restart, scale/process count, concurrent DB connection limits, idle timeout, durable session availability, deploy rollback and certificate renewal.
12. Preview privacy: owner authentication required, share-link controls/expiry and whether an unshared preview is externally inaccessible. Do not share, commit or log a preview token.

Use redacted text or provider support references. No SQL is requested at this stage. Missing controls remain blockers. After review, dedicated read-only probes and cross-database-denial tests will need explicit concrete targets; no owner/root probe is silently run by startup.

## Optional disabled-screen preview

Package: `artifacts/upms-godaddy-node22-preview.zip`. It has a dedicated entry point that cannot fall back to the website or operational production service. Root `package.json`, lockfile, production build verifier and start script are included. Node modules are installed by GoDaddy; no `npm run dev` is used.

Before uploading, verify exact immediate proxy IPs. If they remain unknown, do not invent a value or use wildcard trust; HTTPS through the platform proxy may safely remain unavailable. Set the exact placeholders in `GODADDY-PREVIEW-VARIABLES.txt` through the **Preview** settings only. This screen uses no secrets; remove runtime DB/admin/session credentials from this app's preview configuration. If GoDaddy automatically injects an unavoidable database password, the diagnostic app intentionally refuses startup; report that behavior rather than weakening it.

Do not copy anything to the Publish secrets tab. Do not change the existing public website app. Use **Upload New Code** for this management app after reviewing the package receipt; keep the prior ZIP and settings for rollback. Follow the official [ZIP workflow](https://www.godaddy.com/help/upload-my-ai-generated-app-to-godaddy-nodejs-hosting-42987), stop before **Publish Now**.

Use the authenticated dashboard's **Preview** button. Navigate to `/`; expect 303 to `/management`, a disabled sign-in screen, and `GET /healthz` with `status:blocked`. APIs return 503, public routes/private files 404. No administrator exists in this mode, so do not attempt real credentials. Never paste a share token into a URL in source or logs. The exact supplied hostname has no token in this repository.

If the preview hostname changes, stop and review the new exact hostname in code/tests; no wildcard or environment host override is supplied. For rollback, restore the previous management ZIP and its matching settings in Preview only. No data recovery is required for this diagnostic mode because it never connects to a database.

## Later staging procedure — currently blocked

After all capabilities pass independent review, approve a new empty **staging-only** database/resource and separate accounts using the provider's exact reviewed controls. Do not reuse the auto-injected default database without proving its scope. Supply only restricted staging runtime secrets to Preview; keep owner/migrator/backup credentials in separately protected operator processes. Prove Publish cannot inherit them and Preview cannot access live secrets. Do not run the existing local-only initialization against a remote endpoint.

A subsequent accepted managed adapter must verify TLS and live identity/grants before SQL, bind the migration target, require explicit initialization approval and empty-schema checks, bootstrap a new private staging administrator with rotation, and preserve the opening/posting gates. Run the complete synthetic workflow and isolated restore listed in `GODADDY-STAGING-TEST-RESULTS.md`. This release does not authorize that provisioning or claim it has happened.
