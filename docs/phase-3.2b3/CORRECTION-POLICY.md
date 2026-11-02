# Financial correction policy — local P3.2B3

Policy `p32b3-full-same-account-v1`. Only an authenticated designated administrator, after mandatory password change and all readiness checks, can prepare/post a supported refund. The same administrator may attest and post; independent second-person approval is not implemented. An owner must decide that approval policy before release.

| Original / circumstance | Outcome | Financial treatment |
| --- | --- | --- |
| Integrated cash/bank customer receipt, full money actually returned | Supported | Full debit to original client, full debit from original receiving account; sufficient verified funds required. Restores receivable, never sales. |
| Integrated cash/bank vendor payment, full funds actually returned | Supported | Full credit to original vendor, full credit to original paying account. Restores payable; not income. |
| Integrated paid BUSINESS_EXPENSE with category/employee snapshots, full funds returned | Supported | Full credit to original paying account; separate negative expense fact using unchanged historic snapshots. No party or stock entry. |
| An actual duplicate payment has occurred and that specific payment is fully returned | Same eligible actual-refund workflow | Link exactly that posted payment and its own canonical account claim; evidence must identify actual returned funds. |
| Duplicate entry only, mistaken entry, reversal without money returned | Blocked | No fabricated cash debit/credit. Requires a separately reviewed erroneous-entry/replacement policy and provenance of the actual account balance. |
| Incorrect category or employee | Blocked | Requires a classification adjustment policy with dated reporting and replacement linkage, not a negative expense or cash refund. Master renames never reclassify history. |
| Wrong paying/receiving account or refund through another account | Blocked | Requires actual transfer evidence and separately defined source/correction accounting. No account override. |
| Partial refund, arbitrary backdate/future date | Blocked | No allocation or historical-period policy implemented. |
| Immediately paid purchase / goods returned to supplier | Blocked | Stock availability, consumption/sales, exact quantities/rates, supplier evidence, payable credit versus actual refund and any tax treatment require one complete atomic policy. No stock reversal is attempted. |
| Credit/unpaid purchase, unpaid expense, employee advance/loan | Blocked | Not an eligible paid business-expense refund. No negative expense used to model a loan or advance. |
| Legacy/unlinked cash entry or cheque source | Blocked | No inferred account ownership or historical backfill. Cheque lifecycle remains P3.2C. |
| Already refunded original, correction of a correction | Blocked | One full posted correction per original. A later mistake in the refund needs a new reviewed policy. |

## Posting and dates

The original must be POSTED, carry the existing integration marker and have a reconciled canonical DOCUMENT money batch. The original party must remain active with a verified opening. Expense snapshots must prove the original business expense; inactive/renamed masters do not invalidate the historic refund category or employee.

Reason (3–500 characters), actual-funds evidence (10–500), unique reference and explicit full-return attestation are required. Amount, original account, party, method and historic snapshots are server-selected and cannot be supplied as replacements. Evidence is an operator statement/reference, not an independently verified bank transfer. The application records a refund; it does not send funds.

The refund uses the current Pakistan business date at both preparation and final posting. An old draft must be cancelled and re-prepared after verification. Original dates remain unchanged. Recovery checks the persisted posting timestamp against that refund date, rather than demanding that old refunds have today's date.

Drafts and cancellations have no financial effect or original claim. On posting, the existing BusinessCommand transaction holds the operator/control boundary and commits the refund document, client/vendor journal if applicable, canonical money batch/legs/audit, business audit and idempotency result together. The original row remains unchanged. Source version and normalized source/batch hashes are pinned; `corrects_id` becomes the unique native SQL link only on POSTED transition. Two competing drafts cannot both post. Repeated identical command keys replay one result.

The legacy document writer does not accept FINANCIAL_REFUND. Standalone money reversal still refuses DOCUMENT sources. There is no edit-posted, deficit, account-switch, force-post or evidence-bypass API.

## Reports

Original and refund stay separate in ledgers, statements and company transactions. Gross source totals remain available alongside explicit refund/recovery and net totals. Customer refunds reduce net receipts and restore the receivable; vendor recoveries reduce net payments and restore the payable. Expense refunds are signed negative records in the same historical category/employee and on the refund date. A refund-only period may therefore have negative expense totals. These are neither revenue nor a full profit-and-loss/payroll calculation. Hafta labels customer receipt reversals separately; sales and stock are unchanged.
