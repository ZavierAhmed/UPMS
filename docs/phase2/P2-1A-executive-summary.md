# P2.1A executive summary

Local setup is complete and the application is ready for the owner to sign in. The new owner brief authorized automatic initial bootstrap and superseded the earlier manual-only checkpoint. The loopback management URL is http://127.0.0.1:3000/management. Initial credentials were made available through an encrypted Windows DPAPI handoff and private local dialog. First-login password rotation is mandatory.

Existing `upms` migrations, restricted localhost accounts and private profiles were reused. Eleven identity/support/tracking tables remain verified; the original migration source was unchanged. One administrator exists. Bootstrap used the supported service and atomic audit, not a direct SQL insert. Existing wildcard-host accounts were preserved unchanged. No schema, account or business data was deleted or reset.

Actual owner-account API verification passed: supported login, CSRF rejection, session cookie, own profile, first-login administration restriction, logout, old-session rejection and audit evidence. The public homepage remained functional. A separate synthetic browser check proved password rotation, old-session invalidation and restored administration after changing the password; no owner credentials were used in that test.

Current regression: 113 backend tests, 95 frontend tests, build and lint passed. Earlier P2.1A acceptance also passed 17 real-SQL integration checks, eight actual privilege denials, ten management browser checks, bounded load, public browser/Lighthouse and extracted-package smoke checks. See [test results](P2-1A-test-results.md) for evidence and dates.

Remaining owner action is ordinary first login and selection of a permanent password. No more SQL provisioning, profile configuration or manual bootstrap is required. Production deployment, SMTP activation, MariaDB upgrades, merge and P2.2 remain outside scope. See [bootstrap](P2-1A-administrator-bootstrap.md), [provisioning](P2-1A-database-provisioning.md), [security](P2-1A-security-verification.md), [compatibility](P2-1A-mariadb-compatibility.md), and [risks](P2-1A-open-risks.md).
