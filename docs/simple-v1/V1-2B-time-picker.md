# V1.2B challan time picker

Delivery details uses native input type=time, step60, optional blank. It provides the browser clock affordance, hour/minute selection, mobile support and keyboard interaction without another dependency. Browser locale may render AM/PM; persisted values are24-hour HH:mm.

The API accepts blank or00:00–23:59 at draft validation and validates stored challan time again at posting.10:30 and16:45 persist exactly;25:00,12:60, arbitrary text, noncanonical single-digit hours and seconds are rejected. Existing records are read without rewriting their time. No UTC/date conversion is applied to this local wall-clock string. Audit timestamps are separately displayed in Pakistan time.

Actual browser evidence: type=time rejects an impossible native value;10:30 survives save, explicit edit/reopen, save and post. The generated one-page non-priced delivery note contains10:30, DC-0001 and200bottles with no prices/discount/GST. Read-only owner-demo review sets16:45, changes it with ArrowUp, restores it with ArrowDown, and verifies blank remains valid. SQL covers both valid times, blank and invalid values.

Evidence: `tmp/v12b-payment-browser-b-06/{results.json,delivery-note.pdf,print-verification.json,delivery-render.png}` and `tmp/v12b-owner-review/results.json`. The existing immutable sample challan in the new demo has optional blank time; use a new draft to test selecting a time.
