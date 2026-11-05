# Cheque print/mobile acceptance

**Owner status: PENDING RETEST.** The owner clarified the prior failure as “form fields and buttons are not aligned in forms.” This is the regression target, not an invented print-clipping explanation.

Confirmed defects and fixes:

1. Searchable-selector labels and native field labels inherited different heights at tablet width. Paired cheque labels and 48px inputs now share a baseline.
2. Add Issuing Bank was an independent grid cell. It now belongs to the issuing-bank field.
3. The dialog footer occupied half the inherited two-column form and wrapped Save/Cancel. Its form is now one column with a full-width footer. Phone actions stack at equal width so the Save label and icon cannot be cramped.
4. Attachment clearing aligned with the label instead of the file control. It is aligned to the control on wider screens and stacked on mobile.
5. Cleared acknowledgments still described pending clearance. The status wording now reflects recorded payment without changing recognition.

`evidence/form-alignment.json` records real control coordinates for 390/768/1024/1440/1920. `browser/aligned-registration-*` and `aligned-bank-dialog-*` are final targeted screenshots. Mobile popup focus, Escape/cancel, field preservation and keyboard navigation remain tested.

Print cases include a cleared acknowledgment, register with long names/references and multiple pages, canonical customer receipt and linked bank statement. Acknowledgments use portrait; wide registers/statements use the existing landscape rules. Company headers are application content. Chrome's browser headers/footers are explicitly disabled for these acceptance PDFs. Sensitive full drawer accounts, private attachment names and internal lifecycle evidence must not appear on customer acknowledgments.

The numerical oracle is independent: 24 custody-only instruments × 123.45 = 2,962.80, a canonical 50,000 receipt, a distinct 1,000 clearance, zero bank opening and 51,000 bank closing. Excel and PDF artifacts are compared with those amounts. No owner instrument was cleared or rewritten.

The owner must manually repeat registration, popup Save/Cancel, deposit and clearance form alignment on their devices before this item can be marked accepted.
