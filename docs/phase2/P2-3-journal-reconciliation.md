# Journal reconciliation

The inquiry compares each item/condition balance with the exact SUM of immutable signed journal deltas, starting at explicitly authorized new-item zero. It also detects journal groups with no balance. It returns mismatches and repairPerformed=false. No reconciliation route edits quantities, journals or source documents.

Movement before/after values, balance versions, last-movement links, actor/reason and source/batch/effect references support investigation. Normal inquiry distinguishes unverified absent balance from authorized zero. Legacy openings will need reviewed provenance in the separate opening-stock milestone.

Final fresh inventory run 05 reconciled successfully after mixed production, consumption, count adjustments and inverse corrections and after the concurrent workload. An isolated real SQL transaction intentionally changed a synthetic balance, confirmed mismatch detection without repair, then rolled back the injected fault. Final normal reconciliation matched; no negative committed balance existed. These stock operations were synthetic only. Main tables are migrated but remain empty; final main SQL reconciliation also matched with zero negative balances.

If a discrepancy occurs, preserve evidence and stop for investigation. A compensating approved document may be appropriate after diagnosis; silent overwrites and journal edits are prohibited.
