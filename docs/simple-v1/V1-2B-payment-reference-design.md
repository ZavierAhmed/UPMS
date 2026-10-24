# V1.2B payment reference design

Synthetic V1 convention, explicitly approved in the isolated plan:

| Kind | Official identity example | Source |
|---|---|---|
|Client payment|CR-0009|Immutable document ID9|
|Vendor payment|VP-0012|Immutable document ID12|

Prefixes CR and VP are documented synthetic defaults, not an approved policy for historical company records. IDs are shared across all V1 documents. References can have gaps and older drafts can post after higher IDs; this is not a gapless or chronological payment sequence. At least4digits are padded; larger IDs expand up to the existing unsignedBIGINT range, fitting official_number VARCHAR24. There is no annual reset.

Existing infrastructure reviewed: the V1 document already has an auto-increment immutable ID and unique nullable official_number. V1's next_dc/sequence implements the independently approved DC progression. Legacy business_sequences is a different ERP subsystem with calendar-year/cutover policy and unavailable V1 runtime rights. Reusing the immutable V1 document ID avoids a new counter/migration, cross-module rights or accidental ERP activation. DC-0001 through DC-1000 then DC-A0001 remains unchanged; payment sequence staysNULL.

Saving a draft reserves only its ordinary draft ID; official_number remainsNULL. After all payment validations and journal work, the service derives the official reference and writes POSTED/total/official_number, audit event and durable command result in the same transaction. The identity_guard row serializes commands, official_number is unique, v1_party_journal has source-document uniqueness, and v1_commands binds actor, operation and canonical input to the original result. Number text is not the sole duplicate protection. A failed transaction leaves no issued official reference or financial effect.

Same-key retries replay the original committed result. A different key for an already posted source is rejected. The browser retains the same signature/key until confirmed HTTP success; uncertain outcomes do not generate a replacement key automatically. A restarted API process and an actual TCP proxy dropping the COMMIT acknowledgement both passed durable replay checks.

payload.reference retains the optional external reference separately, including bank references. CASH/BANK_TRANSFER may omit it; the form and policy state that explicitly. CHEQUE_RECEIVED still requires chequeReference and duplicate cheque identity is rejected even if a different external reference is supplied. Supplied external references remain deduplicated by party/kind. Ledger/register display official identity and can search either official or external/cheque reference. Existing signed balances and numeric exports remain unchanged.

Reconciliation validates new nonempty payment identities against immutable IDs and retains historical posted payments withNULL official numbers. No historical rows, payloads or audit entries are rewritten. Live prefix/starting-number/cutover decisions remain for owner review before any company activation.
