# PHP-8 deployment plan — LIVE CUTOVER BLOCKED

Safe local preparation is authorized and implemented; see [local preparation](PHP-8-LOCAL-PREPARATION.md). Actual hosting verification, real data inventory, owner backup/restore, Linux final release and matching-host staging remain BLOCKED. Provisioning, live deployment, DNS changes and production writes are NOT AUTHORIZED.

Keep Laravel/source/vendor/storage/secrets/backups/maintenance outside both verified web roots. Retain management strict same-origin CSRF, host-only Secure HttpOnly sessions, CSP/frame denial and noindex/no-store. Preserve every legitimate owner record/counter/actor. Never import UAT data or run a seeder/migration automatically. Final cutover needs a separate exact reviewed activation approval; post-activation financial/counter checks must be read-only.
