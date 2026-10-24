# Reproduced input failures

Owner-confirmed URL: http://127.0.0.1:3110/management. The existing PID8240 was the original simple-v1-serve.mjs process, started before the V1.1 commit. Node retained its original imported V1 validation/service modules. Its frontend root still pointed at the shared upms.client/dist/management folder, later rebuilt with V1.1 forms. Those forms removed Reason while the old service still required reason.min(3). This is a runtime/frontend contract mismatch, not an invalid bottle description or numeric item-code rule.

A fresh approved01 reproduced the original V1 API435eee0 with the frozen V1.1 frontend16dbac8, using real secure login, browser serialization and HTTP endpoints. Archived schemas were exported for inspection without changing their validation behavior. Evidence: ignored tmp/v12-reproduction/requests.json and three screenshots. Exact Zod issue paths were [['reason']] for every case. No rejected request changed any V1 business-table fingerprint.

| Case | Captured input | Rejected field | Result |
|---|---|---|---|
| Add Item | code0022, Test Bottle, Recycle, black, DT2, active true, empty remarks/reason | reason, too_small |400 INVALID_INPUT |
| Production | two distinct string item IDs,100 and200 bottles, valid local date, empty reason | reason, too_small |400 INVALID_INPUT |
| Challan | valid selected client/item, quantity10, rate25, address/vehicle/driver, empty reason | reason, too_small |400 INVALID_INPUT |

V1.1 source schemas already accepted empty ordinary reasons; they had not been loaded by the old3110 process. The correction freezes old frontend roots independently, performs verified Node-only restarts and directs V1.2 testing to3112. No database reset or migration to old demos. The original process/receipts/logs remain preserved in private stop archives. V1.2 visibly identifies itself and reads interfaceVersion before allowing browser business mutations; a mismatch gives a human-readable address/version instruction.

V1.2 actual browser acceptance confirms Add Item succeeds without code/reason, two distinct production lines save/post, and a priced/discounted challan saves/posts. Safe structured errors use code/message/fieldErrors/reference, never exception stacks/SQL/raw values. Inputs persist and the first invalid control receives focus. Private logs record only correlation ID/code/field paths. A deliberately invalid real Add Item submission verified no partial item creation before retry.
