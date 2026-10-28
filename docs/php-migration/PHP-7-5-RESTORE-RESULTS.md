# PHP-7.5 disaster recovery results

**PASS for automated synthetic recovery; PENDING OWNER for personal acceptance.**

Original: `upms_test_php_6_browser_1793216012369`.
Final new clone: `upms_test_php_6_restore_1793216492976`.
Both use verified MariaDB 10.11.19 at 127.0.0.1:3330. A preliminary independent
clone rehearsal also passed; the final run adds timings and SQL confirmation of
clone-only application writes. Neither run overwrote an existing schema.

All browser/inquiry scripts completed before stopping the owned Apache/CGI
processes. Ports 9084/9443/9444 were confirmed closed. Version, exact synthetic
data directory, loopback binding, source host/port/schema and target whitelist
were verified. All 19 tables were captured as private, sorted canonical rows.

The native MariaDB dump used --single-transaction and --hex-blob with a private
defaults-extra-file, never a password command-line argument. CREATE DATABASE/USE
source statements were forbidden in the dump. The target was checked absent,
created empty and imported using binary-safe stdin streaming. Private application
configuration and inquiry files were copied; the clone got a new restricted
runtime account and independent inquiry-storage directory.

Private dump:
`tmp/php-runtime/php75-restore-1793216492976/uat-private.sql`.
SHA-256: `2a8e5db893817d5354dc4ed9ddcb1a08f44445966aaa1b1e43f63a9dd23a5e08`.

Dump: 187 ms. Import: 831 ms. Backup/import/comparison/private configuration:
1,258 ms, excluding subsequent browser checks. These tiny-fixture measurements
are not production RTO/RPO guarantees. Exact dump bytes and per-table/file hashes
are in PHP-7-5-EVIDENCE.json.

| Table | Original / restored rows |
| --- | ---: |
| identity_audit_events | 6 |
| identity_guard | 1 |
| login_attempts | 2 |
| permissions | 11 |
| role_permissions | 23 |
| roles | 4 |
| sessions | 10 |
| user_roles | 1 |
| users | 1 |
| v1_audit | 36 |
| v1_commands | 36 |
| v1_control | 1 |
| v1_documents | 16 |
| v1_items | 1 |
| v1_lines | 6 |
| v1_parties | 3 |
| v1_party_journal | 11 |
| v1_stock | 1 |
| v1_stock_journal | 6 |

All rows and hashes matched **before application use**, including journals,
audit, command receipts, posted payloads and numbering counters. Inquiry
journal/outbox files were hash-identical. The original was unchanged after import.

Actual restored HTTPS login passed with the restored synthetic administrator.
The application verified X 123, A 200.00, B 80.00, V -185.00, expenses 18.00,
16 original documents and matched reconciliation. authenticityVerified stayed
false. A new production draft 17 was created/cancelled through React, never posted.
SQL confirmed it exists only in the clone, and all 19 original tables still
matched the backup snapshot. Clone rows intentionally differ after that test;
equality is claimed at restore time, not after the documented application write.

The original services were restarted and actual HTTPS login/worksheet health
passed. They remain available. Dumps, options, snapshots, environment, credentials,
certificates and inquiry bodies remain ignored and protected by owner/SYSTEM/
Administrators ACLs. Local preservation is not off-device backup protection.
Retention, encryption, periodic restore, hosting support and RTO/RPO need review.

Repeat safely: stop only owned UAT HTTP services; run php-7-5-restore.mjs; start
php-7-5-services.ps1 with the newly returned cloneSetupFile; run
php-7-5-restored-browser.mjs; then stop clone services and restart the original
default setup. Every run creates a new clone; never import into an existing DB.

The plan's old restore prefix was corrected to `upms_test_php_6_restore_<timestamp>`
because the existing restricted-grant helper requires that prefix. No grant
definition or schema changed. Human recovery acceptance remains PENDING OWNER.
