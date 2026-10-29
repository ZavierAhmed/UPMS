# PHP-8 security gates — NO-GO FOR PRODUCTION

Local identity/provisioning/profile/probe preparation is implemented; tests and limitations are in [local preparation](PHP-8-LOCAL-PREPARATION.md). Existing synthetic protections remain intact. Production profiles are disabled and unpopulated; no production account/data has changed.

Hosting/private roots/process/lock/SMTP capabilities, actual TLS/database grants/schema, owner data classification, backup/restore, Linux finalization and matching staging remain BLOCKED. Prior management self-signed certificate and absent DB TLS advertisement remain unresolved observations, with no bypass. Final cutover is NOT AUTHORIZED. See local preparation for residual owner-disposition boundaries; passing local tests is not release approval.
