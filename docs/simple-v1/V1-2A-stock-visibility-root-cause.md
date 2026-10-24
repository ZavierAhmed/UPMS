# V1.2A confirmed stock visibility root cause

Read-only inspection of `upms_test_simplev12_demo_20261024_01` on loopback3309 found:

| Item ID/code | Opening | Production | Posted stock journal | Projection |
|---|---|---|---|---|
|1 / ITM-0001|POSTED, explicit0|Entry5 POSTED +500|+500 production, −200 posted challan|Verified300|
|2 / ITM-0002|POSTED, explicit0|None|Opening0|Verified0|
|3 / ITM-0003|No posted opening|Entry7 DRAFT quantity500|No movement for item3|Unverified0|

The owner confirmed ITM-0003 was selected in the reported challan. Therefore the apparent successful stock-in was a saved draft, which has no inventory effect. The selected item also lacked opening verification. The posted500 movement belongs to ITM-0001, a different item. Its journal nets to300 and matches its projection; ITM-0003's zero movement matches its zero projection. The existing picker uses exact string IDs, not descriptions. The old label was truthful but failed to explain the required next step or distinguish saving from posting clearly.

Private evidence is retained in `tmp/v12a-owner-diagnosis.json`, `tmp/v12a-owner-preservation.json` and `server/.local/simple-v12a/preservation.json`. No owner names, contact information, credentials or raw private payloads are published here. No speculative stale-cache or projection defect is reported as the cause.

The new UI displays the selected code beside availability, an explicit opening requirement and a link carrying that item ID. Verified0 remains Available: 0 bottles; it never masquerades as an unverified opening. Draft review states that no movement has posted. No opening is automatically verified and no owner record is repaired or posted.

Authoritative item reads are refreshed after successful commands and every route/history event, including same-route events. Fetch uses no-store. While reading, availability says Refreshing stock and actions remain blocked. Draft review shows the current read model rather than its old payload snapshot. The existing conflict response updates the affected quantity. Server-side transactional locks, journal reconciliation and number allocation remain authoritative.

Real browser evidence on new target04: zero opening + production500 =500; posting a200-bottle discounted challan leaves300. Later retained purchasing adds50. A separate posted synthetic production5 changes350 to355 while a challan remains selected; Back/Forward reloads355 with the same item ID. Original SQL tests retain concurrent-stock rejection, latest-quantity errors and no consumed challan number on rejection.
