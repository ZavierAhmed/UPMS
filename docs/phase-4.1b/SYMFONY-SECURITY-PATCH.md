# Symfony security patch

Reuse the P4.1 immutable 38-entry review archive. It changes Symfony http-foundation, http-kernel and routing from v7.4.21 to v7.4.23 and includes the lock and required Composer metadata. Exact before and after hashes are in docs/phase-4.1/evidence/security-patch.json. Review archive SHA-256 is 4ba656f4eded61359caf93bd58f1a7feeef6f185643d925b46de90f004216ed6.

Security-only publication requires separate approval. First verify the exact deployed before hashes and missing-file markers, capture the live web SAPI and extensions, then apply the reviewed bytes to a cloned release directory. Verify all after hashes, check platform requirements, and test TLS, routes, authentication, revocation and CSRF on staging. Preserve the prior vendor tree, lock and application binding as a matched set. Cut over only with a verified rollback target. Restore the prior binding and matched dependency set if any post-cutover security check fails.

The PHP 8.3 isolated suite and P4.1 CLI inventory are available. Live web-SAPI and before-hash parity, plus an independent PHP 8.4 run, remain unverified. The live advisory exposure remains open until separately approved publication and verification.
