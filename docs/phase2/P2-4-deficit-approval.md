# Exact money-deficit approval

Insufficient available money fails closed. The accepted purchase policy must separately list account types permitted to request a deficit exception; acceptance of ordinary cash/bank settlement does not permit overdrawing that type. Cheque settlement and cheque deficits remain unsupported.

Only an enabled Administrator with `money.deficit.approve` can approve. The immutable record binds target purchase/payment ID, exact document version/hash, account ID, debit amount, expected money balance/version, resulting negative balance, accepted policy ID, approver/time and mandatory justification. Immediate-payment approval targets its parent purchase; its sole linked payment consumes that authorization. Ordinary staff cannot approve; administrator self-approval requires justification and records explicit self-approval evidence.

Posting revalidates exact values and current approver account/administrator permission under the transaction guards. A changed account, amount, allocation, target, payload, draft version, policy or money balance/version requires new approval. Approval reserves no funds and is not reusable blanket authority. Every additional debit that leaves a negative balance needs its own approval. The money journal references the exact approval and preserves resulting-deficit evidence. Approval history is retained, with invalidity derived from changed bindings instead of deleting old rows.

No approval exempts inventory from nonnegative balances. The default inventory constraint and shared stock services have no deficit path.
