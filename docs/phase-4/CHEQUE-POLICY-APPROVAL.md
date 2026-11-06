# Incoming cheque operational policy — owner approved

Policy approval: **PASS**. On 2026-11-05 the owner explicitly replied “Approve policy as owner” to the policy approval request. This records owner approval, not accountant signoff or production activation. Candidate examples keep cheque management and attachments disabled pending the separate implementation, recovery, hosting and release gates.

| Event or rule | Proposed production treatment matching the accepted implementation |
|---|---|
| Receipt/custody | Register the instrument and custody history. No customer payment, bank credit or advance is recognized. |
| Deposit | Record the receiving bank and deposit evidence. No customer/bank credit is recognized merely because it was deposited. |
| Clearance | Clear the full instrument only on a valid date with required bank evidence, current receivable and receiving-account opening verified. |
| Customer payment | Clearance creates exactly one canonical customer payment linked to the instrument. Retried requests return the existing result. |
| Bank credit | The same clearance creates exactly one corresponding credit in the selected bank account, in one transaction. |
| Dishonour | Supported before clearance; preserve event/audit history without recognizing money. |
| Cancellation/return | Use supported pre-clearance lifecycle actions with reasons and immutable evidence. Never delete the instrument to erase history. |
| Overpayment | Reject a clearance exceeding the customer amount currently receivable. No implicit customer advance. |
| Partial instruments | No partial clearance or split recognition is supported. |
| Exceptional self-approval | An authorized administrator must explicitly approve with a substantial recorded justification. This is exceptional, not automatic independent dual control. |
| Legacy identity | Preserve original document/instrument identities and evidence. Do not automatically convert legacy cheque references into cleared instruments. Ambiguous historical bank allocation requires owner/accountant decisions. |
| Bank evidence | Require the clearance date, bank/reference, reason and evidence required by the current API. Optional file attachments remain disabled until malware scanning, retention and independent key recovery are approved and verified. |

Outgoing vendor cheques, post-clearance reversals, bank charges and advance policies are not supported or activated by this release. No production financial test transaction is authorized.

Approval record: owner approval received on 2026-11-05: “Approve policy as owner”. Scope: the clearance-only policy above, including exceptional recorded self-approval and disabled operational attachments. Production activation is not authorized by this approval.
