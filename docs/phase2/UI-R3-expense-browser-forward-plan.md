# Round 3 expense browser forward plan — awaiting approval

Preserve full04 and full05 and every previous populated test target. Full04 retained46 passing nested cases before the missing per-challan outstanding display assertion; the UI now shows that authoritative value. Full05 passed130 checks through expense SQL/concurrency/reconciliation, then its browser waited for the removed `Payable 1500.00` narrative. The detail correctly shows Outstanding1,500.00. The adapter now requires the corresponding visible summary value, retaining exact1500/1000/0 amounts and partial/paid settlement assertions. No financial implementation or calculation changes.

Request at most two additional fresh targets, only as needed:

| Target | Schema | Exact runtime account |
|---|---|---|
| full06 | upms_test_p27c_receipts_20261023_05 | upms_runtime_test_p27cxr3f06@localhost |
| full07 reserve | upms_test_p27c_receipts_20261023_04 | upms_runtime_test_p27cxr3f07@localhost |

Owner approval would authorize only these new schema/account pairs in the tool-only funding helper with `UPMS_UI_R3_PLAN=fresh-isolated-business-usability-v1`. Refuse existing schemas, accounts, encrypted profiles and receipts. Create generated encrypted runtime/schema-only migrator profiles, apply unchanged11 migrations/111 physical tables and exact109 table runtime grants. No main rights, runtime gate changes, demo writes, resets, reuse, drops or production configuration edits. The helper is excluded from deployment.

Run original133 financial checks plus the one additional Round3 browser case (17 workflows),134 Node tests total. Stop on failure; preserve every target. Only provision the reserve if necessary. Complete all other verification independently. Do not commit or push until all required acceptance gates pass.

The owner explicitly approved this bounded plan in chat before implementation. Only needed targets will be created.


Execution: full06 was provisioned fresh and passed134/134 checks. Full07 was not provisioned. Both previous targets remain preserved. No runtime gate or financial implementation change.
