# Shared money integration

Expense payments reuse money_journal, money_balances, money_tracking and money_deficit_approvals. P2.4 moneyPlan and deficit helpers are exported with unchanged semantics; purchase reconciliation is exposed as a read-only helper with its original API permission retained. No second bank/cash engine exists.

Only active eligible CASH, BANK or CASH_HOLDER accounts in the expense currency may pay. Opening state must be explicitly verified as NEW_OPERATIONAL/HISTORY; balance and account versions must match the reviewed payment. Pending cheque custody/clearing and customer credit-note surplus are not spendable expense money. The accepted expense payment types must agree with the bound current purchase money policy; policy changes require reacceptance.

An expense payment appends exactly one negative expense-money-debit event, updates money balance through CAS, appends the settlement and reduces payable in the same coordinator transaction. Combined record-and-pay failure leaves neither obligation nor payment committed. A negative balance needs the existing exact deficit approval: document version/hash, current account/balance/version, amount, resulting balance, policy, current administrator authority and reason. Ordinary threshold approval does not replace this permission or evidence.

Tool-only demo funding is separately numbered and audited, appending a positive explicit-demo-funding journal with exact before/after balance and source reason. It requires an actual allowlisted synthetic database and administrator authority. It never exists as a runtime HTTP endpoint and is excluded from the production package.
