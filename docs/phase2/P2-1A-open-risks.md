# P2.1A open risks

- Automated owner-authorized bootstrap and actual upms login/logout passed. The owner must choose a permanent password at first login; administration remains server-blocked until rotation. Temporary credentials use DPAPI and a private local dialog, with automatic handoff cleanup after audited rotation.
- Existing owner-created `upms_migrator@%` and `upms_runtime@%` retain broad global privileges, including FILE. They were preserved exactly as requested. The application uses the separately verified localhost identity; preservation is not remediation of wildcard account exposure. Any later account hardening requires separate owner approval.
- MariaDB 10.4 is outside upstream maintenance. The local development decision does not authorize an upgrade or production use. Any upgrade needs a separately reviewed backup and migration plan.
- Owner operator credentials are broad and must never run the application. Runtime startup verifies the dedicated account and actual grant allowlist.
- Production hosting, production engine/version support, HTTPS/secret operations, SMTP activation, independent review and deployment remain separate gates. No business modules were added.

The original account collision was resolved by an explicitly approved preserving forward plan. The missing TestRuntime profile was saved by the owner; isolated synthetic acceptance passed. No existing schema, record or account was deleted, reset or overwritten to obtain a pass. Test data and private evidence remain ignored locally.
