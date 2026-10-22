# Legacy evidence and compatibility

No legacy customer balance is copied into either classification, including zero. The existing P2.5 tables and `business_customer_ledgers` metadata remain intact. Old tracking, balances, outstanding and journal become runtime SELECT-only and receive no new effects. The classified journal and projections are the sole new operational source.

Migration006 checks all old financial/tracking rows and posted Sales records before any DDL. If present, stop the affected cutover and require an owner-reviewed reconciliation schedule: original source/document IDs, currency, amounts, proposed classification with evidence, independent approval and comparison of classified totals to the original. No silent classification, duplication, inferred zero, drop or reset is allowed. P2.8 historical opening import remains deferred.

Unclassified drafts are preserved and marked as requiring reconciliation/revision. Their posting is blocked until the user explicitly saves a classified version and reviews it. Historical posted originals remain immutable. Current main inspection found no Sales/customer financial records, so no financial conversion is required or performed. SQL acceptance inserts rollback-only synthetic legacy evidence and proves rejection/preservation without copying it.
