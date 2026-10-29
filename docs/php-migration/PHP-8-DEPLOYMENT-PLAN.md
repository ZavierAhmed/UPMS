# PHP-8 deployment plan — Phase A blocked

The owner approved entering deployment preparation, not unconditional cutover or acceptance of residual risks. No phase is marked complete from a local suite alone.

| Phase | Status | Exit evidence |
| --- | --- | --- |
| A Hosting verification | BLOCKED | Authenticated plan/PHP/process/storage/root/grant evidence, trusted management TLS and protected DB path |
| B Release candidate | NOT STARTED | Clean Linux production install/package, private backend layout, checksums and exhaustive artifact allowlist |
| C Data/backup/identity plan | NOT STARTED | Exact read-only inventory, legitimate-data classification, two-admin conflict disposition, protected complete backup and independent restore proof |
| D Owner-controlled activation | NOT AUTHORIZED | All gates passed and exact reviewed final cutover approved by owner |
| E Post-release verification | NOT STARTED | Actual production public/private URLs, independent admin sessions, unchanged financial/counter snapshots, logs/backups/rollback |

Proposed origins remain unique-plastic.com and app.unique-plastic.com. Verify actual account ownership, separate document roots, valid HTTPS, hostname boundaries and rewrite/header behavior. Keep Laravel app/vendor/storage/secrets/backups outside both roots. Expose only reviewed static assets and narrow entry files; no diagnostic/test/provisioning HTTP routes. Private management remains noindex/no-store with strict same-origin sessions, CSRF, Secure HttpOnly host cookie, CSP and frame denial.

Production DB profile must be separate, private, disabled by default and independent of synthetic/remote-development env variables. It must pin approved endpoint, schema, authenticated runtime account, verified server identity/version/capabilities/charset and transport. Preserve the current synthetic-only guard. Do not widen version/host/schema checks from the unauthenticated greeting. No new production adapter is created until those values and actual data layout can be verified; current Laravel continues rejecting owner/remote schemas.

The public five-category website, approved illustrations, address/phone/maps/WhatsApp and PHP-7.9 login/palette are retained. Do not enable SMTP until actual process/private-journal/TLS/timeout capabilities pass. If a different transport implementation is necessary, independently test parity, bounded outcomes and uncertain-delivery protection before enabling it. No automatic duplicate resend or fake live inquiry.

At activation, use a short owner-approved maintenance window and the exact reviewed manifest/backup/profile/account plan. No synthetic posting or inquiry smoke test in production. Post-activation checks are read-only financial and counter comparisons. On mismatch, fence writes and follow BACKUP-ROLLBACK; never restore over legitimate new transactions blindly. Express remains in Git as a reference/rollback asset, not a PHP runtime payload.
