# PHP-6 source reconciliation findings — separate review

Authority: unchanged `server/src/simple-v1/reconcile.js` at baseline
`bb1cce051f7bef253f826c37e3a51584ee32df8c`. Independent fresh Express/PHP synthetic
schemas reproduce every observation on PHP 8.3.36 and 8.4.27. No owner data was used.

The parity implementation preserves the source policy. These are findings for a
separate corrective milestone, not changes to posting eligibility or automatic repair.
All probes compare complete before/after business snapshots and restore the original
synthetic evidence after the read.

| Isolated mutation | Express and PHP result | Coverage implication |
| --- | --- | --- |
| Add a client partyId inside a posted expense's JSON payload while SQL party_id remains null | matched true | Expense reconciliation checks the SQL party assignment, not the raw payload partyId. Posting itself rejects party-linked expenses. |
| Change the posted expense's SQL date to 2099-01-01 while retaining its payload date | matched true | Reconciliation does not cross-check expense document/payload dates or reject future dates. Posting itself rejects future dates. |
| Replace a saved command's fingerprint with a synthetic invalid value | matched true | The source algorithm does not read/validate v1_commands at all. Runtime grants prevent direct command UPDATE, but privileged corruption would escape this read check. |
| Replace expense payload amount string "12.34" with JSON number 12.34, retaining total 12.34 | matched true | The source exact utility applies String(value); reconciliation does not re-run the document input schema. Posting still requires a string. PHP serializes this evidence before integer-cent arithmetic to preserve source behavior. |

Thirty-three reversible probes cover all thirteen kinds and common evidence tables.
The other 29 mutations are detected: 27 return matched false with source mismatch
categories, and nonpositive expense/client-receipt amount evidence raises the source's
400 INVALID_AMOUNT rather than a mismatch list. Neither outcome performs a repair.

Proposed isolated corrective milestone, requiring owner review and coordinated Express
and PHP contract changes before any production release:

1. Define evidence-schema and document/payload date validation, including historical
   exceptions and imported records, without changing posted evidence automatically.
2. Review explicit linkage to command receipts/fingerprints and the intended policy
   for historical records lacking commands; add observational checks and test fixtures.
3. Define whether malformed amounts should produce a structured mismatch instead of
   failing the reconciliation HTTP request. Preserve exact integer arithmetic.
4. Retain immutable journal/audit/command privileges and separately review a stronger
   posted-document privilege architecture if required. Column grants do not provide
   row-level protection for currently allowed document fields or legitimate counters.

No source algorithm, schema, migration, historical record or reversal policy was
silently changed. The [PHP-5 reversal review](PHP-5-REVERSAL-REVIEW.md) and its snapshot
caveat remain unchanged. PHP-7 inquiry work and PHP-8 hosting/cutover remain pending;
this proposed hardening work is separate and has not begun.
