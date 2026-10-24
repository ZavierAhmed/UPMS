# Delivery challan

The privately inspected photograph supplies the field structure, not supplier branding. Unique Plastic Industry is the sole printed identity. New Challan is the primary action on `/management/challans` and the dashboard.

Header: official number after finalization, date, Client/M/s, address, vehicle number, driver and time. Lines: No., Description, Quality, Colour, Packing, Quantity. Rate and Amount are internal PKR columns, omitted from delivery-note printing. Footer: total bottles, remarks, receiver and authorized signature blanks.

Drafts can be saved, revised and cancelled without official numbers or stock/ledger effects. Detail previews reviewed lines and totals before finalization. Frozen party/item snapshots preserve issued evidence. Finalization validates active records, explicit openings, revisions and stock; it atomically writes stock, sale/client debit, audit, durable command outcome and official number.

Sample non-priced layout (synthetic):

```text
UNIQUE PLASTIC INDUSTRY                 DELIVERY CHALLAN
No. DC-0001                            Date:24 October2026
M/s: DEMO Client A                     Address: Synthetic address
Vehicle: DEMO-001   Driver: Synthetic driver   Time:10:30
No. Description        Quality Colour Packing Quantity
1   700ml PB Rivo       HDPE    Black  15x80   200
Total quantity:200 bottles
Receiver signature:________   Authorized signature:________
Remarks: Synthetic demonstration only
```

Generated PDF and internal screenshot are under ignored `tmp/simple-v1/demo/` and `tmp/simple-v1/06/`. The final PDF must pass one-page/text/price-exclusion and rendered-image review before delivery.
