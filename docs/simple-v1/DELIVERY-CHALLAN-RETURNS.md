# Delivery Challan Returns

Unique Plastic Industry only. Returns apply to accepted, resalable manufactured bottle items, including lubricant packaging; they do not imply branded lubricant sales or any other company relationship. Public website sources and approved identity assets are unchanged.

## Workflow

Open a **POSTED** delivery challan and choose **Create Return**. The form identifies its client/date/reference and each original line's item code, description, quality, colour, packing, delivered, already-returned and remaining quantities. Enter selected whole-bottle quantities, return date, reason and optional remarks. Save Draft, review the linked detail and choose Finalize. Drafts can be edited or cancelled and have no official number or financial/stock effects. Saved drafts do not reserve quantities.

The original challan shows linked draft/posted/cancelled returns, item quantities, posted credit and summaries of original/returned/net quantity and original bill/credit/net sale. A dedicated return detail has the original DC link, client, reason, remarks and internal credit amount. Print Return Acknowledgment produces a non-priced document. No automatic refund, payment or approval queue is added.

Only accepted resalable quantities may be finalized. The form and confirmation say this explicitly. Damaged/non-resalable stock treatment remains a future owner decision; it is not recorded as saleable stock through this workflow.

## Numbering decision for owner cutover review

`DCR-` plus the immutable shared document ID, padded to at least four digits (for example a return document with ID 23 becomes `DCR-0023`). This follows existing CR/VP conventions. It is a separate reference namespace, **not a gapless dedicated return counter**; unrelated document IDs cause gaps. The DC counter and DC numbering never change. Drafts have no issued reference. Cancelled/failed document IDs are retained; issued numbers are immutable and not reused. A transaction that rolls back does not issue a reference; a safe retry may finalize that same retained draft. Approve this convention explicitly before production cutover. If the owner requires a dedicated consecutive DCR sequence, implement and review that change separately before cutover.

## Posting and validation

The existing database transaction guard serializes commands; the source challan and stock projections are also locked. Each finalize rechecks the source is POSTED, original client/line identity, positive integral quantities, available returnable balance, original rate, date and reason. It rejects duplicate lines and an altered historical rate. Inactive current item/party prices do not replace original snapshots. A return cannot predate its challan or use a future business date.

Finalization atomically inserts original-snapshot return lines, positive stock journal entries, stock projection updates, a separate client credit, official DCR reference, audit and durable idempotency result. Original stock movements, original debit, opening stock and payment history remain intact. A previously paid client can have a credit balance. There is no cash refund. Same-key retries replay the saved result; a different-key second finalization is rejected. Failed posting rolls back every effect.

## Exact discount valuation

Use BigInt cents exclusively. Let original lines in saved line order have gross amounts `g[i]`, total gross `G` and original net bill `N`. Assign each line a fixed net budget:

`B[i] = floor(N * cumulativeGross[i] / G) - floor(N * cumulativeGross[i-1] / G)`.

For original line quantity `Q`, already returned quantity `a` and accepted quantity `q`, credit:

`floor(B[i] * (a + q) / Q) - floor(B[i] * a / Q)`.

Both sums telescope. Returning all lines fully credits exactly `N`; splitting a return into any number of parts cannot cause discount rounding drift or exceed `N`. The rule covers fixed/percentage whole-bill discounts, zero net lines and selected-line returns. Tiny partial returns can correctly credit zero cents; the remaining cents are credited on later units. Stored return line amounts are **net credits**, while rates remain the original gross historical rates. Draft credit is an estimate; finalization recomputes it after any competing return.

## Reporting and verification

Company Transactions labels returns `DELIVERY CHALLAN RETURN`, retains the original DC, and separately reports sales, return credits and net sales. Client ledger particulars include the original DC; stock history and exports include both references. Reports includes Delivery Challan Returns with credit totals and original DC references. The existing Excel exporter remains in use. Reconciliation independently recomputes return quantities/discount allocation and verifies lines, stock effects, ledger, references and audit evidence.

See [test results](DELIVERY-RETURN-TEST-RESULTS.md) and [browser evidence](evidence/return-acceptance.json). No production activation is implied by local acceptance.
