# First production acceptance — UAT-H1C

The inline option appears only for a current active unverified item whose authoritative quantity is zero, with no prior opening, stock journal, posted stock-line history or initialization claim. It requires `stock.initial_opening.confirm`, an explicit no-prior-stock checkbox and an operator-selected valid opening date not later than production. No date or zero confirmation is assumed.

Within the existing BusinessCommand transaction and identity/stock locks, the service posts a separate zero opening and production. Both retain their original immutable document, line, stock-journal and audit evidence. A new immutable initialization link and compound command receipt cover both. Any failure rolls back the entire operation; sequences may reserve IDs, but no financial/stock rows survive a rollback.

Actual isolated PHP checks (`evidence/integration.json`, `evidence/negative-integration.json`): 200 bottles × PKR 10 labor = PKR 2,000 earned; stock 200; no cash or party-ledger effect. Concurrent identical retries have one effect; distinct competing first productions produce one success and one conflict. Missing/revoked authorization, missing confirmation, CSRF, nonzero/inconsistent projection and old stock history are rejected. Earning/link/audit/command insert faults roll back opening and production together.

Existing verified nonzero openings keep their normal production path and are never recreated. Manual reviewed opening remains available for actual nonzero starting stock. Ready items do not retain a permanent opening warning. Printed production preserves approved company identity, item quantities, labor rates/amounts and signatures.

Chrome acceptance and PDF evidence are recorded separately in `evidence/browser.json` and `evidence/artifact-validation.json`. Failed exploratory runs are not acceptance results.
