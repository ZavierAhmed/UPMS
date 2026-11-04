# Financial reconciliation

The canonical path is instrument -> DEPOSITED event -> `CLIENT_PAYMENT` with method `CHEQUE_CLEARED` and server-owned source marker -> one party credit -> one DOCUMENT/SOURCE_CREDIT bank batch/movement -> CLEARED event -> audit -> unique clearance claim -> retained compound BusinessCommand receipt. All commit together.

Clearance uses the existing Documents, party journal, CR identity, MoneyDocuments integration and MoneyAccounts mechanisms. Public draft validation cannot accept CHEQUE_CLEARED or its server-owned source fields. The legacy CHEQUE_RECEIVED posting path remains blocked when Money Accounts is enabled. Registered/reserved cheque references cannot be recognized through standalone external money or ordinary cash/bank document posting.

The existing financial checks run during posting. Only the new cheque completeness check is deferred during the internal transient DRAFT/POSTED stage, because its final event/claim/command do not yet exist. Full cheque, financial, source and command reconciliation runs before the outer transaction commits. A failure rolls back every business, custody, audit and receipt row.

| Synthetic case | Before receipt | After receipt/deposit | After final event |
|---|---|---|---|
| Complete PKR 50,000 cheque | Customer 50,000 due; bank 0 | Customer 50,000 due; bank 0 | CLEARED: customer 0; bank 50,000; one payment |
| Different PKR 20,000 cheque | Customer 50,000 due; bank 50,000 | Same | DISHONOURED: customer 50,000; bank 50,000; no refund/payment |
| Complete PKR 20,000 against 50,000 due | Customer 50,000; bank 50,000 | Same | CLEARED: customer 30,000; bank 70,000 |

These are actual assertions in `scripts/uat2-integration.mjs`; `evidence/integration.json` records results. The broader negative suite adds independent small settlements, so its later fixture totals are intentionally different. Do not confuse those later fault-test records with the three numerical acceptance oracles.

ChequeReconciliation independently compares event chains, immutable hashes, actors, receipts, unique claims, opening coverage, exact customer credit and bank movement. It detects orphan/duplicate claims, unclaimed payments and reserved external bank effects in both directions. It is included in general reconciliation and bank balance verification. Corrupt cheque evidence blocks customer/company financial reports and makes bank balances unverified; it is never silently repaired.

Pending instruments appear only in the custody register. Cleared payments appear once in existing customer ledgers and Company Transactions. Bank statements link the original payment, cheque and clearance event. Returning a previously deposited instrument retains its receiving-bank identity for register filtering even though it has no financial effect.

The register filters its **received-date** range explicitly, with separate totals for all six current states. Bank/party financial reports use clearance posting date. Exact money arithmetic uses integer cents; exports preserve numeric decimal cells. Customer acknowledgment masks drawer account details and excludes lifecycle audit notes. The administrative details timeline retains evidence and exceptional approval reasons.

The existing bank report intentionally leaves “Brought forward” unverified when the selected period includes the very first opening: holdings before that opening are unknown. The dated verified opening row starts coverage, and the subsequent closing balance is verified. This is retained accounting behavior, not an assumed zero or a failed clearance.

SQL insert-denial injection covers party journal, bank batch, movement, money audit, lifecycle event, cheque audit, clearance claim and command receipt. Each compares complete pre/post business-row fingerprints. Failed inserts must leave the instrument DEPOSITED and create no partial document, bank movement, party credit or command.
