# Implementation decisions (UAT-H1C)

- Default-off distinct isolated-UAT flag. Four additive tables; preserve all old 34 table data and 88 guard definitions. Expected 38 tables / 103 guards (15 added), verify actual count.
- No advances/negative wage liability. Full-source existing expense allocation only, bounded by verified current payable. Meaningful reason/evidence >=10 characters, explicit approval.
- Allocation effective date is administrator-selected, >=original cash date and latest employee event, >=labor coverage; no backdated settlement. Original cash date/hash and employee snapshot retained. No historical advance balance is invented.
- Existing expense is positive in its original date. A linked negative classification adjustment on approval/effective date removes it from ordinary expense totals, without a cash refund or new money movement. Historical prior-period reports remain original; later adjustment/carry is explicit.
- New first-production operation requires per-item explicit zero confirmation and user-selected opening date; checks no history, no verified opening, zero projection, active item and distinct permission. Reuses original opening/production posting within one BusinessCommand transaction; separate immutable documents/journals/audits plus new link and exact compound receipt.
- New classified snapshot format, exact 38/103 manifest, old consumers reject. No operational backup changes or production deployment.
- Owner existing business records are not reclassified/posted automatically. Enable only after isolated tests and additive UAT schema verification; preserve administrator credentials and original rows.
