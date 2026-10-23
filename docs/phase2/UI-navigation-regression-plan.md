# UI navigation corrective regression plan

The owner requests all existing real SQL/browser regressions while preserving main and the existing demo, without application schema, accounting-rule or activation-gate changes. All eleven migration files and every runtime synthetic/real activation guard remain unchanged. The subsequently owner-approved tool-only exception is recorded in UI-navigation-full-regression-forward-plan.md. Main upms and UAT02 are never fixture targets.

P27C expense01–08 are all populated and preserved. Rather than reusing them or broadening any activation gate, the new operator uses unused schemas already inside the existing exact synthetic allowlist. They already support the complete111-table application schema. Each gets new, distinctly named DPAPI-encrypted runtime and schema-only migrator credentials. Metadata run identifiers below prevent collisions with preserved test accounts/evidence. The scope name is test selection, not a financial authority boundary.

| New target | Actual empty schema | Metadata / runtime identity |
|---|---|---|
| full01 | upms_test_p27c_sales_20261023_02 | navf01 / upms_runtime_test_p27cxnavf01 |
| full02 reserve | upms_test_p27c_sales_20261023_03 | navf02 / upms_runtime_test_p27cxnavf02 |
| full03 reserve | upms_test_p27c_sales_20261023_04 | navf03 / upms_runtime_test_p27cxnavf03 |
| regression | upms_test_p27c_regression_20261023_05 | navr01 / upms_runtime_test_p27crnavr01 |
| inventory | upms_test_p27c_inventory_20261023_06 | navi01 / upms_runtime_test_p27cinavi01 |
| purchasing | upms_test_p27c_purchasing_20261023_06 | navp01 / upms_runtime_test_p27cpnavp01 |
| classification | upms_test_p27c_classification_20261023_05 | navc01 / upms_runtime_test_p27ccnavc01 |

The complete pipeline eventually passed all133 cases in full03, an explicitly recorded unused sales-named synthetic database, using the expenses suite and its correct x-prefixed runtime identity. Full02 exposed the additional tool-only funding restriction; see the explicitly approved exact-schema/account exception in UI-navigation-full-regression-forward-plan.md. No assertion or runtime guard was relaxed. Separate classification38, identity17/business16, inventory20 and purchasing29 cover scope-specific cases. Original assertions remain intact; browser adapters follow real URLs/new form groups and explicit posting reviews.

Provision refuses existing schema/accounts/profiles/receipts, verifies recovered127.0.0.1:3309 MariaDB10.4.32/datadir/normal recovery0, creates only the listed empty schema and two new localhost accounts, applies unchanged migrations there, and grants exactly109 reviewed runtime table scopes. Test refuses reuse after its started receipt. Failed/partial targets are retained and never reset. Only needed reserve targets are created. No main grants, account changes, database recovery, reset/drop, owner/demo posting or production activation. Private receipts and credentials stay in server/.local/ui-navigation; test logs/screenshots stay ignored. This plan is within the new brief's explicit regression authorization and requires no new production policy.


Forward runs: full01 is preserved after its return-browser failure exposed a child-draft routing permission mismatch. Use reserved full02 after the fix. Regression05 is preserved: identity17 passed, but the wrapper omitted the required identity receipt and business acceptance stopped. New regression02 uses unused upms_test_p27c_regression_20261023_06, navr02, runtime upms_runtime_test_p27crnavr02, with the same provisioning restrictions and original assertions. Neither failed target is reused.
