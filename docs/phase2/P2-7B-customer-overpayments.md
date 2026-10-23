# Customer overpayments

For a single challan, O = original amount, C = posted credit-note reductions, A = effective receipt allocations. Net sales = O − C; outstanding = max(O − C − A, 0); retained source surplus = max(A − (O − C), 0). Thus O = C + A + outstanding − surplus. Surplus is reconstructed from immutable credit and allocation events, with no competing customer balance cache.

A paid 20,000 challan credited 3,000 has outstanding zero and a retained 3,000 customer overpayment. Existing allocations remain traceable. This surplus is distinct from unapplied receipt remaining: scope customer credit = unapplied receipts + sum of challan surpluses. Scope net position = original issued − credit notes − effective received = gross unpaid − total customer credit. Unapplied receipts and surplus may coexist without counting either twice.

The ledger exposes original sales, approved credits, net sales, effective receipts/allocations, unpaid challans, unapplied receipts, overpayments and net position separately. Surplus belongs to its source customer/class/currency. It cannot fund another challan, cross ledgers, or trigger a cash/cheque refund in this milestone. Real treatment remains owner-gated; only the explicit synthetic contract is executable.
