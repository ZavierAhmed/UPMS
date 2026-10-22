# Pending custody and settlement

Use existing CHEQUE_HOLDING and BANK masters with explicit genuine-new/no-history activation or independently verified opening. Missing balance is unverified. No historical custody is inferred. CHEQUE_CLEARING transfers are not needed for this deposit-as-custody policy and remain unsupported.

Receipt: holding +amount, settled bank unchanged. Deposit: immutable custody evidence, no journal movement. Clearance: lock cheque then ordered account balances, holding -amount and deposited BANK +amount in one shared posting batch; no second customer credit. Bank type, currency, version, verification, current date, cutoff/open period and numbering gates apply. Holding cannot become negative. Positive bank clearance can reduce a previously approved overdraft without manufacturing a new deficit approval.

Purchasing methods remain restricted to existing settled CASH/BANK/CASH_HOLDER contracts. Pending custody cannot fund vendor payments. No bank charges, inferred net settlement or expenses.
