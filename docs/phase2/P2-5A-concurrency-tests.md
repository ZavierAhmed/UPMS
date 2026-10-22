# Classified transaction and concurrency evidence

The original Sales suite retains real deadlock, lock timeout, lost COMMIT acknowledgement, durable restart/replay, stock/customer/audit fault rollback, shortage aggregation and production/purchase/dispatch compatibility checks. New acceptance adds simultaneous GST/NON_GST dispatch for the same customer, cross-classification competition for the same AVAILABLE stock, independent projection versions and single classified effects.

Lock ordering remains identity guard → business guard → command → classified customer balance → sorted shared stock → sequence. Additional GST authority is checked under the identity guard before idempotent replay. No new nested posting transaction, alternate stock cache or relaxed negative-stock rule is introduced.

The global guards serialize foundation writes for correctness; these checks are not a high-throughput production capacity claim. Each failed and successful run is retained in a distinct schema. Detailed private timings, diagnostics and JSON receipts remain ignored under `tmp/w06/p25a` and `server/.local/p25a`; counts and failure explanations belong in the public milestone report, not private records.
