# Ledger-scoped unapplied credit

An explicitly accepted synthetic policy selects either ALLOCATED_ONLY or ALLOW_LEDGER_SCOPED. Real unapplied receipt posting is disabled. A receipt of10000 with6000 explicit allocations records one10000 customer credit and money credit,6000 applied and4000 unapplied. No oldest-challan fallback or negative challan outstanding is allowed.

Fully unapplied receipts are supported under that policy and verified customer/account starting states. Gross unpaid challans stay separate from unapplied credit; net position may be negative and is clearly labeled. This does not authorize refunds, cross-ledger offsets or any real opening balance.

A later APPLICATION draft identifies one existing receipt, expected remaining-credit version, exact amount and explicit same-scope challans. Posting inserts immutable allocation/effect/audit/number evidence, decreases that receipt's remaining credit and increases applied totals. It creates neither another customer-credit entry nor another money movement. Locks, remaining>=0, unique document/challan effects and expected versions prevent duplicate/concurrent consumption. Same-key replay remains authorized and durable.

No transfer between customers/classifications, automatic allocation, cheque recognition or cash refund is provided. Changing policy to allocated-only does not erase earlier evidence or silently consume its remainder. Corrections involving subsequent applications require a later complete reversing protocol.
