# Owner opening diagnostic

Read-only persisted evidence identifies Ahmed, employee 1:

| Evidence | Actual value |
| --- | --- |
| Immutable opening ID | 1 |
| Opening business / coverage date | **2026-11-03** |
| Opening amount | **PKR 1,000.00** |
| Opening reference | no amount need to be paid |
| Opening reason | employee opening balance |
| Opening created timestamp (UTC) | 2026-11-03 14:34:55.062000 |
| Existing expense | 3, PKR 1,200.00 |
| Existing allocation | 1, PKR 1,200.00, effective 2026-11-03 |
| Allocation created timestamp (UTC) | 2026-11-03 14:36:12.851000 |
| Production earned | PKR 2,000.00 |
| Direct labor payments | None |
| Original canonical money batch | 2 |

The opening and audit/command evidence pass native reconciliation. The subsequent allocation requires an already valid opening; its validated receipt/audit and original source hashes pass. There is exactly one allocation for expense 3. Original document, cash batch/movement/audit, stock and ledger fingerprints match the H1D checkpoint inspection. There is no second cash debit. Before/after H1E inspection preserves these owner business rows.

No November 1 opening is persisted. The November 1 attempt must not be represented as saved or used to overwrite opening 1. With an existing immutable opening, another request conflicts regardless of the newly requested date or amount. The old code maps that case to 409 LABOR_OPENING_CONFLICT with the reported generic message. This explains the duplicate-opening behavior, but the original owner's failed HTTP exchange and request reference were not retained in the available evidence. Its exact observed HTTP response, correlation reference and whether a separate read refresh failed cannot be reconstructed honestly. We did not resubmit a financial operation against owner records to manufacture that evidence.

Independent synthetic requests now capture actual 409 LABOR_OPENING_ALREADY_VERIFIED responses, the clear public message, existing opening detail and a diagnostic UUID. Each UUID correlates with a safe upms.labor.opening.rejected server event. See integration.json. No owner opening is changed, deleted or re-entered. No direct SQL repair is appropriate.

The real owner browser was inspected after owner-performed existing-credential sign-in. Before screenshots show the ambiguous report and duplicate form. After screenshots show explicit partial coverage, the saved opening and replacement of the duplicate form by read-only evidence. No owner POST was submitted by this investigation.
