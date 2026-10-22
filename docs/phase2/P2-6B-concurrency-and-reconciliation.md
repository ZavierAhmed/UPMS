# Serialization and independent reconciliation

Retain identity_guard then business_guard lock order and three bounded whole-transaction deadlock/lock-timeout retries. Cheque current state, remaining receipt, scoped totals, sorted challans and ordered money balances lock inside the coordinator transaction. Same durable key/payload retrieves one committed result; conflicting payload fails. Lost COMMIT acknowledgement returns outcome-unknown and requires replay of the same key; no blind financial retry.

Receipt reconciliation subtracts immutable cheque credit compensations from original received credits, and allocation compensations from original allocations. Current outstanding equals original minus allocations plus exact compensations. Remaining is zero after source dishonour. Combined money balances equal all purchasing/receipt/cheque journal deltas.

Cheque reconciliation independently verifies instrument/source, one initial credit/holding entry, contiguous hashed event chain/current state, terminal exclusivity, document hashes/numbers, custody/bank movement amounts, exact request/approval evidence, source-specific allocation compensations and shared effects. It never repairs records. Real SQL fault/concurrency and browser evidence is recorded in test-results, not inferred from unit tests.
