# Incoming customer cheques — proposed isolated UAT policy

Operational owner/accountant approval is **pending**. Passing synthetic acceptance does not approve operational use, a port-5180 upgrade, or production deployment. The feature defaults off and its readiness verifier accepts only the positively identified local synthetic engine.

| Event | Customer receivable | Spendable bank | Evidence |
|---|---|---|---|
| RECEIVED | No change | No change | Instrument, customer snapshot, receipt date, authoritative identity |
| DEPOSITED | No change | No change | Verified BANK opening, deposit date/reference, evidence |
| CLEARED | One complete-instrument CLIENT_PAYMENT credit | One matching canonical DOCUMENT/SOURCE_CREDIT | Actual bank clearance attestation, reference, evidence, authorized actor |
| DISHONOURED | No change | No change | Deposited instrument, rejection reference/reason/evidence |
| RETURNED | No change | No change | Pre-clearance disposition/withdrawal evidence and reason |
| CANCELLED | No change | No change | Received, never-deposited instrument and reason |

A cleared cheque is terminal. Post-clearance dishonour, bank reversal, customer refund, charges, replacement instruments, outgoing vendor cheques and partial-instrument clearance are blocked. They need separately approved linked accounting policies. Returning a deposited cheque requires the administrator to attest withdrawal/disposition evidence; the application does not query a bank or verify a document's authenticity.

The whole cheque must fit a verified positive customer receivable. Advances and overpayments are rejected. A PKR 20,000 cheque clearing against PKR 50,000 owed is one full instrument settlement leaving PKR 30,000 due. Neither receipt nor deposit constitutes payment.

Clearance must be on/after cheque date, receipt, deposit, customer opening and bank opening; it cannot be future-dated or precede later existing customer/bank activity. A postdated instrument may be held/deposited as custody, but cannot clear before its cheque date.

The receipt/deposit actor cannot approve clearance without administrator membership and a separate explicit justification of at least ten characters. The current Simple V1 administrator/designated-operator boundary is retained in addition to seven cheque permissions. This is an exceptional self-approval mechanism, not independent dual control. Permission revocation is rechecked even for idempotent command retrieval.

The acknowledgment says **“Cheque received — subject to bank clearance.”** Only clearance issues the ordinary canonical CR receipt, using the explicit `CHEQUE_CLEARED` method. It is never disguised as BANK_TRANSFER or legacy CHEQUE_RECEIVED.

Identity is `(authoritative issuing-bank ID, full normalized drawer-account identity, normalized numeric cheque number)`. Account identity retains leading zeros, removes spaces/hyphens and uses uppercase letters/digits; cheque numbers remove leading zeros. Required account scope cannot be omitted. The same number is allowed for another bank or another account. The immutable directory contains two explicitly synthetic UAT issuers; these are not verified operational banks. Operational issuer governance, account identity conventions and privacy/retention rules require approval.

Legacy CHEQUE_RECEIVED documents retain receipt-recognized accounting and original identities. No migration, bank credit, settlement claim or backfill is inferred. Their read-only compatibility view explains this distinction. Matching references and numeric tokens from legacy identifiers conservatively block ambiguous new instruments. An opaque legacy identifier without a numeric cheque identity blocks new registration pending a separately reviewed identity-resolution policy.

Native constraints and guards protect existing evidence and transitions. Application permissions do not establish SQL row isolation, prove physical funds or prevent a holder of compromised CRUD credentials from fabricating sufficiently consistent new inserts. See SECURITY-AND-RECOVERY.md.
