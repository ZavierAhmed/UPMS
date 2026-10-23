# Business document details

Inventory, purchases, sales, receipts, cheques, returns, credit notes and expenses use DocumentDetailLayout. It presents human document reference, type/state, party/date, financial or physical summaries, original line content and relevant source links. Existing authorized lifecycle controls and exact approval evidence remain available.

Activity/history is collapsed initially and opens for history routes. Required approval controls stay outside that disclosure. Audit events use readable actor/action/time/reason fields. TechnicalEvidence mounts raw diagnostic JSON only for an administrator and remains closed initially. Ordinary roles receive business facts without raw JSON. Variant dimensions use canonical names. Legal payment references remain available in a secondary disclosure.

This is a presentation change: posting bodies, versions, idempotency keys, source verification, journal entries, financial rules and immutable posting guards are preserved. Some secondary legacy narrative quantities retain their existing formatting; summary and ledger amounts use consistent formatting.
