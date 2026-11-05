# Clearance failure root cause

## Verified baseline reproduction

`scripts/uat2a-baseline-http.mjs` loads the exact starting commit's `Cheques` and `ErrorResponse` classes in a private test process. It executes the real Laravel HTTP kernel against an independently provisioned synthetic fixture. The owner's cheque number, November 6 cheque date, November 5 receipt date, complete PKR 50,000 amount and DEPOSITED state are reproduced. Bank and customer opening fixtures are valid.

| Request | HTTP result | Error | Baseline presentation |
| --- | --- | --- | --- |
| POST `/api/v1/management/simple-v1/cheques/{id}/cleared` without exceptional justification | 403 | CHEQUE_SEPARATE_APPROVAL_REQUIRED | Message absent, causing the generic frontend error |
| Same request with valid justification and November 5 clearance | 409 | CHEQUE_CLEARANCE_DATE_INVALID | Generic entry message without the affected date |

Baseline references are `c4af64a9-32db-44a5-8d0f-f95469dd103f` and `0c8dd6a6-ae14-4219-957c-a0b423824d11`. Full HTTP bodies are in `evidence/baseline-clearance.json`. The source guard remains active. The defect is the error presentation contract and missing readiness guidance, with two independently reproducible business blockers.

The historical owner request reference was unavailable. No owner clearance was posted to infer that missing reference. Its exact first rejection remains unproven. The isolated reproductions establish the corrected behavior without changing the owner record.

## Corrected behavior

Missing exceptional justification produces a useful 403 message. The postdated attempt produces 409, a `date` field error and the explicit explanation that November 6, 2026 must precede clearance. The failed request preserves every cheque, payment, journal, bank, command and audit row. A valid nonfuture-dated complete cheque clears successfully and an identical retry returns its original receipt.

The read-only panel checks current status, cheque and proposed dates, the receiving bank, dated bank opening, customer opening and receivable, full amount, involvement of the approver and blocking reason. Posting independently checks the same business sources while the existing transaction protocol serializes the command.

## Investigation matrix

| Candidate | Result |
| --- | --- |
| Postdated or future accounting date | Independently enforced and rejected with date guidance |
| Customer opening or insufficient receivable | Retained server checks and prior negative coverage |
| Missing or late bank opening | Retained dated BANK-opening check and focused prior negatives |
| Backdated recognition | Later customer or bank activity continues to block recognition |
| Approval or self-approval | Reproduced hidden 403 and corrected presentation |
| Stale versions or balances | Canonical draft/post checks and balances are revalidated within the serialized command |
| Canonical source integration | Successful clearance has one customer receipt, source batch and matching bank movement |
| Trigger or permission rejection | Real native negatives pass, runtime has no DDL grant |
| Reconciliation failure | Remains a posting blocker with a safe explanation |
| Unhandled PHP/SQL failure | Controlled late SQL fault rolled back all business rows and produced a request reference |

Known cheque rejections now log the request reference, safe error code and status. Unexpected PDO diagnostics include SQLSTATE and the native number, without SQL text, input, accounts, files or secrets. An uncertain response asks the user to retain the form and retry the same entry, preserving idempotency.
