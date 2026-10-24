# V1.2B payment finalization root cause

The source-supported hypothesis was confirmed through actual HTTP and browser reproduction, not inferred from the mockup.

Read-only owner evidence (`tmp/v12b-owner-draft9.json`): Draft9, CLIENT_PAYMENT, amount1000, CASH, blank reference, DRAFT, no official number; selected party is CLIENT, opening_verified=1, opening date2026-10-24, document date2026-10-24, both party and snapshot version1, zero source journal rows. Competing opening, party-version, date and method causes were excluded for this case.

Fresh target01 used archived source from1db1c48 and the preserved V1.2A frozen frontend. Only the archive's exact synthetic endpoint allowlist was extended for target01; payment service/router/exact source bytes were retained and hashed. Creating the draft succeeds. POST /documents/{id}/post with {version:1} returns400 with code TRANSACTION_REFERENCE_REQUIRED and the exact generic owner message. Both API and actual browser Finalize entry reproduce it.

The posting service grouped PURCHASE, CLIENT_PAYMENT and VENDOR_PAYMENT into a required-reference rule, while draft creation defaulted reference to an empty string. The error mapper had no business-specific message for that rule. Hence a valid cash draft could save, then fail on review/finalization. Fingerprints before/after the rejected post match for every V1 table; the draft remains unnumbered and has no ledger effect.

Evidence: `tmp/v12b-reproduction/http.json`, `original-error.png`, `tmp/v12b-reproduction.log`. The supplied Downloads mockup is the approved visual target, not claimed as a live error screenshot. No owner document was finalized to obtain evidence.

The fix retains required vendor invoice/reference for PURCHASE, makes ordinary payment external references optional, preserves cheque identification and supplied-reference duplicate checks, and generates official payment identity in the successful posting transaction. Known business errors now have actionable messages; opening failures also have an explicit UI opening link. The draft survives rejection.

An original regression exposed external-reference search losing a payment once its new official number took display precedence. Ledger/register reads now carry externalReference separately and search official, external and cheque references, while preserving original whole-ledger balance calculations. Original assertions were retained and passed on fresh07; failed02 is preserved.
