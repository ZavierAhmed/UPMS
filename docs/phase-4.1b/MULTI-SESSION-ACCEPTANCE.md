# Multi-session acceptance

Run the pinned Node 22 executable with scripts/p41b-concurrency.mjs on the isolated MariaDB fixture. The harness invokes real Laravel HTTP kernels in separate PHP processes. Five independently minted sessions for one synthetic operator, three parallel requests sharing one session and a deliberately held shared guard all passed. Holding an exclusive guard produced HTTP 503 READ_BUSY. Logout returned 204 and the next request with the revoked token returned 401.

The evidence records timing for each request. Local connection timeout is 3 seconds, row lock wait is 3 seconds, statement budget is 5 seconds per statement and the CLI bridge has a 30-second outer deadline. These limits do not imply a 5-second total server response bound. The approved test envelope is up to five parallel requests per batch on one isolated server.

Distinct authenticated users and revocation during an in-flight read require additional acceptance. The closed-port test covers connection refusal. It does not simulate a mid-transaction database outage. A separate financial regression pass does not prove simultaneous reader/writer behavior. P4.1's failed overlap receipt remains preserved.

Chrome passed eight navigation rounds across three tabs and two cookie contexts for the same synthetic operator. The slowest round took 17,176 ms with no failed API response or error banner. PHP successful reads took at most 2,861 ms in that run. A held exclusive lock returned 503 READ_BUSY in 3,704 ms in the stale-navigation run. The closed loopback DB port returned 503 IDENTITY_UNAVAILABLE in 2,635 ms. Chrome cancelled an intercepted stale state read and loaded Vendors.

On the dedicated P4.1B finance fixture, a read overlapped two identical idempotent POSTs. The read returned 200, both POSTs returned 201 with the same receipt, and the balance increased by exactly one synthetic entry. The first attempt failed at its opening balance GET with HTTP 503 before issuing a write. The original response did not record its safe error code. The retry passed after the runner was updated to include the safe code in failures.
