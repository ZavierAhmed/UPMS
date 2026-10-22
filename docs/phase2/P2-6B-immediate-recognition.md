# Immediate customer recognition

Receiving uses P2.6A's versioned receipt document, scoped credit, allocations, remaining-credit and totals projections, shared posting batch, money journal, receipt number, audit and durable key in one transaction. CHEQUE_HOLDING is the only added receipt method and requires mandatory typed metadata plus separate accepted synthetic cheque policy and cheque receive authority.

One customer/class/currency only. Full credit reduces net receivable immediately; only explicit allocations reduce challan outstanding. The remainder is deliberately scoped unapplied credit. Neither deposit nor clearance changes customer credit or allocations. The original positive credit and all original source rows remain immutable after dishonour.

Metadata stores bounded instrument number, drawer bank, cheque/received dates, received-by, custody account and optional expected bank. No invented bank-specific length or account secrets. Conservatively unique drawer-bank/number/date blocks instrument reposting. Postdated and backdated receipt dates remain unresolved and rejected.
