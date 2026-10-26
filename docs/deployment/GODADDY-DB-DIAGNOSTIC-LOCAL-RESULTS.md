# Local diagnostic verification

These are **local simulations and regression checks**, not actual GoDaddy results. See [hosted results](GODADDY-DB-DIAGNOSTIC-HOSTED-RESULTS.md) separately.

The standalone module is tested with injected transport/query fixtures. TLS success fixtures model an authorized chain and matching certificate name; they do not constitute a real GoDaddy TLS handshake. The suite also uses the real mysql2 CLI against a local silent TCP fixture to verify handshake timeout/no outbound credentials or SQL, and the real mysql2 connector against a simulated MySQL server advertising no TLS to verify it refuses authentication and SQL fallback.

Coverage includes missing credentials; independent hostname/port checks; malformed/URI/IP endpoints; strict CA configuration; trust-all rejection; plaintext, encrypted-only, old protocol, wrong hostname, missing peer and missing cipher rejection; driver TLS failures; short connect timeout with late connection destruction; query/overall timeout; engine mismatch; schema/account mismatch; UUID unsupported versus denied; grants permission failure; authentication/hash/role/scope redaction; secret canaries and URI removal; fixed SELECT/SHOW-only statements; CLI invocation/exit behavior; no-server start; and unchanged operational security gates.

Verified locally on Node 22.23.4:

| Check | Result |
| --- | --- |
| Focused diagnostic suite | 22 passed, 0 failed |
| Full existing backend suite plus diagnostic tests | 227 passed, 0 failed |
| Diagnostic-only package syntax build | Passed |
| Locked production-only installation with install scripts disabled | Passed; mysql2 3.24.6 |
| Diagnostic dependency security audit | Zero vulnerabilities |
| ZIP CRCs, manifest SHA256 hashes and strict 8-file allowlist | Passed |
| Extracted CLI missing-credential smoke and no-server start | Passed; synthetic password canary absent from stdout/stderr |
| Operational source/public website diff | None |

Package byte reproducibility, final source SHA and checksum are recorded in the generated release receipt alongside `artifacts/upms-godaddy-db-diagnostic-node22.zip`. Reproduce the focused suite with Node 22.23.4+:

```sh
node --test server/tests/godaddy-diagnostic.test.js
```

Run the full existing backend suite with `node --test server/tests/*.test.js`. No existing tests were modified or weakened. No SQL writes, migrations, accounts or company data were used by this diagnostic. No operational app source, database policy, schema/identity gate, HTTP route, public website or management functionality was modified.
