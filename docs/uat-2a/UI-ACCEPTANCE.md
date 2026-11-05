# UI and output acceptance

Actual Chrome exercised registration and clearance at 390, 768, 1024, 1440 and 1920 pixels. Register captures at the same widths verify horizontal table scrolling within the page. Popup cancellation and saving preserved client, cheque, account and amount fields. Browser Back restored the registration draft. The live normalized duplicate warning linked the authorized existing instrument and disabled submission.

The clearance panel displayed the exact November 6 date blocker for a November 5 attempt, verified bank-opening coverage, current receivable, complete amount, impacts and required approval. Posting stayed disabled for the blocked state. Existing deposited instruments remained intact. Real HTTP tests also verified an interrupted upload, authorized binary downloads, anonymous rejection and Host/Origin enforcement.

## Captures

- `evidence/browser/before-details.png` records the starting presentation.
- `evidence/browser/registration-{width}.png` records the grouped form and read-only reference preview.
- `evidence/browser/clearance-{width}.png` records the readiness panel and focused clearance form.
- `evidence/browser/register-{width}.png` records the table and filter behavior.
- `evidence/browser/issuing-bank-popup-desktop.png` and `issuing-bank-popup-mobile.png` record the dialog.
- `evidence/browser/duplicate-identity.png` records the live conflict state.

## Chrome PDF and Excel

`output/pdf/uat2a-cheque-acknowledgment.pdf` and `output/pdf/uat2a-cheque-register.pdf` are actual Chrome outputs. The approved Unique Plastic Industry logo, contact identity, source reference and amounts are retained. The acknowledgment excludes the full drawer account, private attachment name and administrative timeline. The matching Excel register contains the same stored reference and amount as typed data, without macros, formulas or external-link payloads.

Visual inspection caught a wide-table print failure with an intentionally long synthetic client name. Scoped fixed print columns and wrapping resolved it. Screen tables retain their readable horizontal scrolling. Rendered pages and the PDF text-bound checks are recorded in `evidence/artifacts.json` after final review.

`evidence/browser/acceptance.json` records the seven completed browser scenarios. `evidence/browser/startup.json` records separate setup and restart using a new synthetic password, exact local readiness and rejection of all existing owner bindings. An initial raw Host override using Fetch was unsuitable because the runtime rewrote that header. The accepted negative uses an actual Node HTTP request with the explicit Host header.

Synthetic fixtures exercise extreme names and amounts. Their generated records are independent of the owner workspace. Operational attachments remain blocked pending malware inspection and recovery approval.
