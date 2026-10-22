# Money-account foundation

Money masters remain metadata. Missing `money_tracking`/balance rows mean UNVERIFIED/opening pending, never verified PKR zero. Only Administrator with `money.activate` can attest a genuinely new account with no prior financial history, currency, version and reason. This creates an audited authorized zero; it is not a historical opening import. Account type becomes immutable once starting state is authorized.

Balances are exact DECIMAL(20,2) projections of append-only `money_journal`. Source entries retain account, currency, document/batch/effect, signed delta, before/after balance/version, actor/time and exact deficit approval where necessary. Runtime cannot UPDATE/DELETE journals, approvals or allocations. Account and vendor caches alone have UPDATE rights. No bank reconciliation, full general ledger, COGS, account transfer, customer receipt or opening endpoint is introduced.

The supported technical monetary contract is decimal-string money scale 2, rate scale 6, exact BigInt quantity/rate multiplication and half-up rounding per line. Totals sum rounded lines. Zero/free/zero-rounded amounts, exponent notation, JS number amounts, excess scale and overflow are rejected. DECIMAL(18,6) rates and DECIMAL(20,2) amounts are checked before SQL. This contract is a supported option, not an approved real company policy: the main acceptance table remains empty. A different required scale/tie rule needs implementation review.

Single base currency is an explicit required three-letter policy value. Activation binds each vendor/account to a currency and posting rejects mismatches. No FX or GST arithmetic exists. Cash, bank and cash-holder types can be individually accepted for settled-instrument evidence; both cheque types remain unavailable for settlement regardless of their master presence.

Positive test funding exists only in owner-written synthetic fixtures whose schema name is hard-gated. The runtime API has no funding/opening mutation. Production financial balances cannot be inferred from those fixtures. Reconciliation sums all immutable signed entries, reports mismatches and performs no repair.
