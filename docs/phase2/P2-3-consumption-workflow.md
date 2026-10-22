# Material consumption

Inventory staff draft independent raw-material, component and applicable packing-material lines. Finished bottles are rejected in this workflow even when stock exists. Only AVAILABLE can be consumed; quarantine and damaged balances are never added to availability.

Review shows authoritative inquiry quantities; posting independently rechecks locked database balances. Repeated item lines are aggregated before validation. A valid debit may reach exactly zero. Insufficient quantity rejects the whole posting, preserving all other item balances, draft status, batch/effect claims, numbering and idempotency.

Production and consumption do not share a BOM or automatic stock side effect. Both preserve the P2.2 identity/business guards and deterministic item/condition lock order. Database constraints provide an additional nonnegative check. There is no administrator override for negative stock.

Fresh synthetic SQL evidence covers fractional kilograms, integer components, packing consumption, category and condition rejection, aggregate repeated lines, competing spends and exact zero. Operational policy/starting-state decisions for owner data remain pending.
