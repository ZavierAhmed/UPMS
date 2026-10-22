# Shared money journal integration

Receipts append one positive `money_journal` event (`customer-money-credit`) and update the existing versioned `money_balances` row in the same receipt transaction. No independent customer cash ledger or module-specific money balance is introduced. Money history and reconciliation include vendor outflows and customer inflows together.

Cash, bank and cash-holder methods must match the active destination account type, receipt policy and accepted P2.4 settled-instrument types. Customer, receipt, challans, account and policy currencies must agree; no FX conversion. Stale account versions and unverified starting states reject posting. Cheque types, custody, clearance, dishonour and gateways remain unavailable.

Positive funds require no new deficit approval. Migration007 extends only the incoming side of the existing money CHECK: positive deltas may reduce an approved overdraft while remaining negative. Outgoing negative entries retain the prior deficit approval/nonnegative-result rule. Actual synthetic rollback-only testing verifies positive10 into-100 produces-90 without a new approval; prior vendor deficit suites remain mandatory.

Future application of already received credit touches allocations/current customer projections only. It never credits money again. Reversal/refund effects remain disabled; this is operational subledger support, not a general ledger or bank reconciliation system.
