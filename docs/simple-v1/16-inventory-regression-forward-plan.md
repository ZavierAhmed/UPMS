# Inventory regression forward plan — approved and executed

Preserve populated legacy inventory08/v1i01. Its17 SQL subtests passed; the browser completed staff production and count submission, then clicked Documents and approvals while the global read guard still disabled that control. The click helper did not wait for enabled state, leaving the administrator on Stock overview. No API error or accounting failure was observed.

Correct only the browser helper to wait for a visible enabled action, including the pending-count review row. Retain all original production, approval, role, mobile, stock and SQL assertions. No runtime implementation or grant changes.

Request one new target: `upms_test_p27c_inventory_20261023_02`, runtime `upms_runtime_test_p27civ1i02@localhost`, migrator `upms_migrator_test_uir3_inventoryV1b@localhost`, metadata `v1i02`. Read-only inspection confirms the schema is absent. Refuse collisions/profile reuse. Apply unchanged111-table legacy migrations and109 runtime scopes; run the original20 checks once. No funding exception, reset, reuse, main rights, V1/live activation, merge or deployment.

The owner explicitly approved this single target in chat before provisioning.

Executed once in the approved new target:20/20 passed. The failed target remains preserved.
