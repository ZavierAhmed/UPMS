# Cheque identity and reference policy

Instrument identity remains the issuing-bank ID, normalized full drawer account and normalized nonzero numeric cheque number. Leading zeros are removed. Matching cheque numbers from different accounts or issuing banks remain legitimate. The existing native composite unique key is authoritative during registration.

The protected read-only identity operation uses POST `/api/v1/management/simple-v1/cheque-identity` so account identifiers stay out of query URLs. It requires a valid session, CSRF, the existing operator boundary and `cheques.receive`. An existing instrument ID is returned only with `cheques.view`. The UI debounces requests and ignores stale responses. A known duplicate disables submission. Registration repeats the native and application checks.

## Generated business reference

New UAT-2A registration has no editable business-reference input. The server combines the normalized cheque number, an ASCII uppercase client-name snapshot, the exact two-decimal amount and a random 128-bit suffix. Whitespace and punctuation become hyphens. Non-ASCII-only names use `CLIENT`. The name segment is bounded to preserve the complete amount and reserve suffix space within 100 characters. The UI applies the same base policy and explains that a unique suffix is assigned at registration.

The reference is protected by its existing native unique key and collision checks against external money sources and posted payment references. Ambiguous legacy cheque identities remain blocked for review. The immutable numeric instrument ID continues to carry database relationships. Same-key retries retrieve the same stored reference. Existing manual references and earlier generated references retain their original values. The old 44-table API compatibility path remains available until the separately approved owner upgrade.

Registers, acknowledgments, reference and generated-number searches, exports and source links use the stored reference. Searches accept normalized cheque numbers and case-insensitive reference fragments.

## Issuing banks

Codes remove whitespace and normalize case. Names collapse whitespace. The native code key, immutable creation claim and serialized BusinessCommand prevent duplicate codes and concurrent ID allocation. The original static IDs are preserved and new IDs extend their maximum under `identity_guard` serialization.

Creation requires an authenticated administrator with receipt permission and produces an immutable command receipt linked to the creation hash. Updates and deletion remain blocked for all issuer records. A new directory entry selects automatically without discarding the cheque draft. Receiving-bank money accounts remain a separate verified directory.

These entries are synthetic UAT master data. Entering an institution name or code conveys no operational verification. Bank identity and the operational clearance policy require owner/accountant approval.
