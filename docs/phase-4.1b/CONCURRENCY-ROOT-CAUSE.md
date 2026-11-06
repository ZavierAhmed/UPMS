# Concurrency root cause

P4.1 retained a Money Accounts GET failure correlated to MariaDB HY000/1205. Before P4.1B, the management boundary, report controllers and session touch each acquired the same exclusive identity_guard row. Multiple ordinary readers therefore queued behind one another even when their work had no business writes. A report could hold that exclusive row through document queries and reconciliation.

Read authorization and reviewed GET controllers now acquire a shared lock on the same guard before reading session, identity, permission and business state. This preserves the ordering against exclusive writers and revocation. POST commands, password changes, audit writes and command idempotency retain the exclusive transaction. No grant or schema changes are needed.

Safe requests refresh the session with a conditional single-row update after releasing the shared guard. The update requires an unrevoked, unexpired row and uses a monotonic idle deadline. It neither acquires the global guard nor revives a revoked session. There is no lock order from session row back to identity guard. A request already authorized while holding the guard can complete before a competing revocation takes effect. Subsequent requests are checked again.

Navigation aborts the prior workspace GET chain and discards stale responses. An already running server worker can still finish under its database timeouts. The client never automatically retries a financial POST. A genuine read lock timeout remains HTTP 503 with READ_BUSY and a diagnostic reference.
