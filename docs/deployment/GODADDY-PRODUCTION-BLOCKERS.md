# Production and operational Preview blockers

**Compatibility blocked. No real company or production database operations are authorized.**

| Gate | Evidence now | Required resolution |
|---|---|---|
| Node patch/Linux native binding | Local Windows Node 22.23.4 baseline; provider starts prior package | Exact provider version and clean native Argon2 authentication |
| MySQL engine/identity | Dashboard reports managed MySQL | Actual version, UUID, server ID, endpoint, port and supported InnoDB behavior |
| Authenticated database TLS | Unknown | Verified CA/hostname/TLS 1.2+ and rejection tests on actual endpoint |
| Preview/Publish isolation | Separate secret tabs only | Distinct resources/schemas and users, injection scope, bidirectional access denial |
| Runtime privileges | Unknown | Exact table grants, no DDL/global/delegable rights or mutable journals/audit |
| Initialization | Not authorized | Fresh target, reviewed empty-schema and migration plan, explicit approvals |
| Backups and independent restore | Import UI only | Consistent export, private/off-host storage, scheduled backups and verified new-target restore |
| Private storage | Unverified | Protected persistence and operator backup mechanism outside public paths |
| HTTPS proxy boundary | Unverified | Exact peers and verified header sanitization; no trust-all |
| Private preview access | Owner has dashboard access | Confirm auth/share restrictions without sharing tokens |
| Business workflow | No new provider SQL run | Full synthetic staging workflow after all preceding gates pass |

`UPMS_DATABASE_PROFILE=godaddy-managed` does not bypass these gates. Operational startup and the existing production CLI reject it before connecting. The dedicated Preview ZIP can show only an explicitly blocked sign-in screen; it cannot activate operations by adding environment flags.

The existing local production design remains available unchanged for its own approved deployment; no current local/XAMPP/demo target was repurposed here. Keep GoDaddy as requested while obtaining evidence. If its managed service cannot provide required isolation, TLS, least privilege or recovery, report incompatibility; do not silently select another provider or relax the controls.

Future `https://app.unique-plastic.com` requires a separately approved live database, production credentials, owner opening values/cutoff/next challan number, proven restore and independent posting approval. Do not change DNS, click Publish, import real data or initialize production in this milestone.
