# Shared condition movements

Use exact existing AVAILABLE, QUARANTINED and DAMAGED conditions in inventory_balances. Three additive catalogue codes point to return_stock_movements. Receipt adds only QUARANTINED. A reusable disposition debits QUARANTINED and credits AVAILABLE; damage debits QUARANTINED and credits DAMAGED. Each pair has equal absolute quantity and zero net physical total; damage does not imply scrapping.

Shared lockStockPlans locks aggregate item/condition plans in deterministic order, rejects missing/unverified balances and negative/overflow results. Per-movement advanceStockBalance preserves exact before/after/version arithmetic and existing history state. Multiple same-condition entries use the updated locked balance, avoiding duplicate stale snapshots. No stock opening or competing balance subsystem.

stockReconciliation aggregates inventory, purchasing, Sales dispatch and return movement deltas once per condition. Inventory history includes sanitized return movements. Source reconciliation separately checks physical allowance, receipt remainder, approved source/version, pair counts and effects. Neither reconciler repairs discrepancies.

Example: AVAILABLE1000; dispatch400 gives600; return100 gives QUARANTINED100; partial dispositions40/10 then30/20 give AVAILABLE670, QUARANTINED0, DAMAGED30, total700. Customer financial outstanding remains unchanged.
