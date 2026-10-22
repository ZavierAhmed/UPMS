# Exact approved dishonour

Accounts supplies bank return date/reference, evidence reference, reason and current state version. Service snapshots original receipt reference, amount/customer/class/currency, prior state, original credit, all funded allocation IDs/amounts and current remaining version/value. The shared SUBMITTED document payload hash binds that snapshot. No editable request/status endpoint exists.

Administrator alone approves/rejects with mandatory justification and exact version/hash. Posting revalidates approver enabled/admin/action authority, approval evidence, one approval timeline version, dependency snapshot and policy/date gates. Accounts cannot self-approve or post dishonour. A justified Administrator may approve their own request under the existing explicit shared policy.

Post appends full customer-credit compensation, one compensation per original/later allocation and one holding debit; zeroes only current remaining credit and subtracts the funded amounts from current receipt totals. Unrelated cash receipts stay valid. Original receipt, credits, allocations, money and approval evidence remain retained. Unique source/effect constraints and terminal state prevent duplicate reinstatement. Any correction request linked to the source cheque blocks automatic dishonour for independent review.
