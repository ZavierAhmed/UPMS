# Reason policy

itemInput and partyInput default omitted reason to empty. Ordinary documentInput does the same. The UI does not display Reason for ordinary create/edit/draft save. Optional Remarks remain.

STOCK_CORRECTION, PAYMENT_REVERSAL and OPENING_CORRECTION require a trimmed justification of at least three characters during draft validation. Posting uses persisted validated evidence. Draft cancellation retains its explicit operator confirmation/audit note. Posted editing remains blocked.

Audit records retain actor/time/action/reference. Master and draft saves record before/after version numbers in neutral system descriptions, with a separately identified operator note if supplied. Empty reasons are never attributed to an operator. Posting emits a neutral description if the ordinary draft has no reason. Existing append-only runtime grants remain.
