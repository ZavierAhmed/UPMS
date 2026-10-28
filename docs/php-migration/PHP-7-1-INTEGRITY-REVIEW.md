# PHP-7.1 controlled integrity review

Baseline: `91549079beedc4cee8f04199865ec5ad0dc41132` on
`feature/upms-php-7-public-integration`. Delivery branch:
`feature/upms-php-7-1-integrity-hardening`. This is a coordinated Express/Laravel
correction. No schema, migration, runtime grant, owner data or accounting model changes.

## Dispositions

| Finding | Disposition | Remaining boundary |
| --- | --- | --- |
| A Expense party identity | Fixed and verified | Detect non-null/missing/improperly typed payload partyId and incompatible non-null partySnapshot. Valid explicit null and absent/null snapshot remain valid. No expense party journal is introduced. |
| B Dates | Fixed discrepancy/malformed detection on all thirteen posted kinds; future import policy mitigated by review warnings | Compare real Gregorian SQL/payload YYYY-MM-DD dates, without a cutover/minimum historical date assumption. Consistent future posted dates require provenance review rather than automatic historical invalidation. No dates are changed. |
| C Command evidence | Meaningful observational checks implemented; original authentication remains unavailable | Check UUID format/case-folded uniqueness, lowercase SHA256 representation, retained actor, posting-audit actor agreement for posted receipts, JSON/result shape and supported reference relationships. A valid-looking fingerprint is not authenticated. Additional evidence/architecture requires separate approval. |
| D JSON amounts | Fixed and verified | Type is checked before exact parsing; invalid values are never coerced. Corrupt records return structured findings rather than aborting the whole reconciliation. No financial values are changed. |
| E Reversal snapshot | Fixed for new drafts and posting of existing drafts; historical anomalies detected, not repaired | Source payment determines partyId and snapshot. Original posted payment/reversal rows remain immutable through the app; UNIQUE(corrects_id), eligibility, totals and opposite journals remain unchanged. |

The original PHP-5/PHP-6 review documents remain baseline evidence. They are superseded
for corrected behavior by this review and PHP-7-1-CORRECTIVE-EVIDENCE.md, not deleted.

## Reconciliation contract

The same inspector policy runs in both backends before the existing exact calculations.
Posted line containers must remain arrays of objects, so PHP associative decoding
cannot let a JSON object bypass native financial type checks. This does not change
valid historical array formats or quantity/rate calculations.
The GET endpoint remains authorized, observational and non-repairing. It retains
`matched`, string `mismatches`, `repairPerformed:false` and evidence counts, adding:

```json
{
  "integrityFindings": [{
    "code": "AMOUNT_REPRESENTATION_INVALID",
    "entity": "document",
    "id": "12",
    "field": "payload.amount",
    "message": "Persisted financial amounts must be strings.",
    "severity": "error"
  }],
  "reviewRequired": false,
  "authenticityVerified": false
}
```

Errors add deterministic legacy mismatch strings and make matched false. Unsafe
documents are not fed into coercing calculations. Other calculation failures are
localized as DOCUMENT_CALCULATION_INVALID, allowing diagnostics for other records.
Counts include every retained posted row, not only rows successfully evaluated.
Neither raw payloads, internal exceptions nor secrets are included in findings.

`reviewRequired` flags non-error historical/import/future-date provenance warnings;
it complements, rather than replaces, matched false/error findings. Thus matched true
can coexist with reviewRequired true. The management UI displays codes, record IDs,
messages and the authenticity limitation; warnings cannot silently become an unqualified
green approval. Missing command receipts do not, by themselves, prove corrupt finances.

The old zero expense/client-receipt cases returned HTTP 400 INVALID_AMOUNT from the
reconciliation read. They now return HTTP 200, matched false, AMOUNT_VALUE_INVALID.
Likewise the former four matched-true blind probes now return HTTP 200, matched false
with structured evidence. Valid transaction endpoints/calculations and their errors
are unchanged except the documented reversal identity correction.

## Supported representation and historical policy

All thirteen posted kinds receive SQL/payload date checks. Valid historical dates,
including old expenses and pre-entry-version challans, are preserved. There is no
new created_at/cutover-date constraint or inferred import cutoff. Date disagreement
or malformed evidence is an error; consistent future evidence is a warning because
the schema has no import/provenance marker. Existing posting future-date guards remain.

Consumed opening/payment/expense/correction amounts, purchase/challan/return line rates,
return credits and V2 discount values/summaries require string representations. Input
amounts retain their existing exact-decimal limits and positivity/zero rules. Derived
discount summaries retain the wider formatted-money output range, avoiding rejection
of legitimate summed subtotals. Numeric types are invalid even when their value equals
the expected amount. No binary floating-point money computation is introduced.

Unused amount/rate hints, when present, still require strings as the original input
schema requires, but are not newly parsed as accounting amounts. Missing unused hints
in historical formats remain compatible. A reversal's ignored string amount hint such
as "999" is not substituted for the source payment's actual amount.

## What command evidence establishes

The existing schema retains only key, actor_id, fingerprint and result. No original
operation, canonical input, command timestamp, result namespace or authenticated
external anchor exists. UUID keys also have a primary-key uniqueness constraint.
An actor must exist; historical disabled users are not rejected for their present-day
role/enabled state. A posted receipt's actor is cross-checked with retained posting
audit evidence, without assuming that the draft creator was the later posting actor.

Supported results are id-only save receipts, id/code item receipts, id/status cancel
receipts and id/status/official_number/total posted receipts. Posted/cancelled results
are checked against their immutable document state, item results against immutable
codes, and id-only results against the union of possible retained entities. Old save
receipts remain valid after later editing/posting; their original operation cannot be
inferred from a bare id. Missing unambiguous post receipts raise coverage warnings,
preserving known historical seed/import compatibility without claiming verified provenance.

The zero-filled, syntactically valid replacement fingerprint deliberately remains
undetected as a changed hash, with authenticityVerified false. The code neither
reconstructs invented inputs nor labels that hash authentic. Coordinated replacement
of consistent evidence can remain undetectable. See the release-risk decision.

## New reversal identity policy

Derive, rather than reject, compatible or incompatible client-supplied party hints.
For an eligible posted source payment, retain its original matching party snapshot;
if an old payment has no usable snapshot, construct one from the retained party master
anchored to the source SQL party_id. Never use an unrelated supplied party to choose
the snapshot. Reapply derivation when posting a draft, including drafts created before
this correction. Update only that still-mutable draft payload in the posting transaction.

Source payment SQL identity, method/date eligibility, amount and opposite journal
remain authoritative. Invalid source drafts cannot become posted payments. Client
Cash/Bank reversal remains rejected through the cheque path, eligible client Cheque
Received and vendor Cash/Bank reversals remain allowed. Repeated reversal still uses
the existing unique constraint and rollback behavior. Same-key retries retain the
original raw-request fingerprint binding; two different hints under one key still conflict.

New GET draft/detail payloads now contain the derived partyId/snapshot. The existing
React form sends null hints and remains functional. Historical posted reversals without
snapshots are accepted when source/SQL identity agrees; contradictory retained hints,
snapshots or source links are reported, not rewritten. Historical names need not equal
today's party-master name, so legitimate renamed parties are not falsely invalidated.

## SQL privilege conclusion and forward-only design boundary

Runtime probes establish denied UPDATE/DELETE on lines, journals, audits and commands;
denied runtime DDL and role/enabled/operator/cutover changes; permitted legitimate item/
challan counter updates; and primary-key duplicate command rejection. Existing full
transaction tests retain status/version predicates and unique reversal rollback.

Column grants do not impose posted-row predicates. The runtime can update permitted
document fields on posted rows if it bypasses application code. Password_hash,
authorization_version and updated_at are writable for the legitimate password endpoint;
SQL grants do not restrict them to the current actor's row. No stronger SQL guarantee
is claimed. The grants are unchanged and these residual trust boundaries need owner
disposition before release; no trigger/procedure redesign was silently introduced.

If authenticated/reconstructible command evidence or DB-enforced row immutability is
required, prepare a separately approved forward-only architecture: an append-only
command-evidence table keyed to the receipt, storing operation, canonical input bytes,
canonicalization version, actor, typed result references, receipt hash and provenance;
atomic dual-write for new commands; and reviewed restricted grants/procedures or an
independent authenticated audit anchor. A hash of newly stored input alone is not
authentication against an attacker able to replace both. Key custody, signing/verification,
rotation, backup/restore, account resource limits and rollout/rollback need separate review.

Historical inputs must be classified legacy-unverifiable, never invented/backfilled as
authentic. No migration or SQL implementation of this proposal is included/applied.
Further correction requiring that evidence stops here for owner review; safe observational
checks and the other four corrections are complete independently.
