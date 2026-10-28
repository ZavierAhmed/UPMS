# PHP-5 source reversal eligibility review

Historical baseline report. [PHP-7.1](PHP-7-1-INTEGRITY-REVIEW.md) implements the
coordinated draft/posting snapshot correction; the original observations below are retained.

Authority: unchanged `server/src/simple-v1/service.js` and
`server/simple-v1-migrations/202610240001_simple_v1.js` at
`ee70789a7240d5cf076ad110d8d599bb2e55155d`.

## Accepted behavior

- A reversal references a POSTED CLIENT_PAYMENT or VENDOR_PAYMENT. Its date must
  not precede the original; future dates are rejected by the shared posting guard.
  Justification is required by documentInput before draft persistence.
- A client payment must use CHEQUE_RECEIVED. Cash and bank-transfer client receipts
  cannot be reversed through this path: ONLY_CHEQUE_DISHONOUR_SUPPORTED.
- The vendor path permits reversal of eligible Cash/Bank Transfer vendor payments.
  It is a traceable payment reversal, not an invented vendor-cheque dishonour flow.
- Posting derives party and exact amount from the original payment, regardless of
  draft amount/party hints, and appends the opposite journal entry. It preserves the
  original document, journal, reference and method. No bank/refund/clearing account
  is created. Shared document IDs identify CR/VP; reversals have no new number series.

## Repeated reversal eligibility

The service has no explicit "already reversed" predicate, but the existing migration
declares **UNIQUE(corrects_id)** on v1_documents. Drafts hold their link only in payload;
posting writes corrects_id in the same transaction as the journal/audit/command.

Independent Express/PHP tests establish:

1. First eligible reversal posts once.
2. Same-key replay returns its saved result without another journal.
3. New-key posting of that already-posted document fails IMMUTABLE_DOCUMENT.
4. A distinct reversal draft for the same original fails **409 IDENTITY_CONFLICT**
   on the existing unique constraint, rolling back the provisional opposite journal.
5. Overlapping distinct reversal drafts likewise produce one posting and one
   constraint failure, with identical complete SQL state on Express and PHP.
6. A reversal is not an eligible payment source for another reversal.

No repeated-reversal financial hole was observed under the unchanged schema.
Cancelled reversal drafts do not reserve corrects_id or block a later legitimate
reversal. Existing reversed receipts remain POSTED and still participate in the
source's reference-duplicate checks.

## Separate future improvements; not implemented

An explicit source-linked "already reversed" error could improve the current generic
constraint-conflict response, but changing that requires a separately reviewed change
to both backends and their contract tests. PHP-5 preserves the current response.

Express also retains raw draft payload fields. A manually crafted reversal containing
an unrelated partyId can retain that draft partySnapshot even though the posted
document's party_id and ledger correctly derive from the original payment. The
unchanged React reversal form submits partyId null, so the normal UI avoids this.
Rejecting extraneous reversal party/amount fields or replacing the payload snapshot
with the source snapshot is a possible future hardening change, not a silent PHP
policy change. Differential tests explicitly verify current source behavior.

No migration, unique-index replacement, original-payment rewrite or new reversal
policy was introduced. All eligibility probes used new isolated synthetic schemas.
