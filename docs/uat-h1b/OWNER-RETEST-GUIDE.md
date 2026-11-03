# Owner retest guide

Open `http://127.0.0.1:5180/management` and refresh to load the latest management build. Use your existing Employee Hafta workspace login and password. Do **not** initialize another workspace or reset an administrator. The original workspace on port 5173 remains separate and unchanged.

## Resolve Production Draft 1

1. Open the existing production draft. Check the production date, Ahmed/selected employee, item identity, quantities, labor rates and reference. Draft labor is an **estimate**, not yet earned.
2. Review **Opening-stock verification**. Every affected item is named. Missing openings show **Stock opening required**; later-dated openings identify their actual date.
3. For a missing opening, choose **Set Up Stock Opening**. The unfinished production stays intact. The opening date must be on or before the production date.
4. Enter the factual opening quantity. Use **0 only if there genuinely was no prior stock**, not merely to remove an error. Save its draft, review the item/date/quantity and explicitly confirm the zero statement when applicable. Finalize the opening through the normal authorized posting confirmation.
5. Choose **Return to production draft**. If you need to edit the opening draft first, its Edit Draft path retains the date limit and return link. The production employee, items, rates, quantities and reference should match what you left.
6. Wait for authoritative verification to finish, or choose **Refresh opening verification**. All item openings and the employee snapshot must pass before Finalize is enabled.
7. Review the production consequences. For 200 bottles at PKR 10 per piece, the estimate is PKR 2,000.00. Finalizing increases stock and records employee labor once. It does not debit cash or change a customer/vendor balance.
8. After posting, verify POSTED status and **Labor earned**, then open the employee's Hafta. Wage opening/payable coverage may still be **UNVERIFIED**: stock opening verification does not establish historical employee payable.

If an opening is already posted **after** the production date, do not create another opening or rewrite posted history. Review the factual production date and use the supported edit/review workflow. If the dates cannot be reconciled honestly, stop and report the named item and diagnostic request reference.

## UI and preservation checks

- At desktop widths, verify `# / Item / Quantity / Labor Rate / Piece / Labor Amount / Action` align. Money should be right-aligned and use PKR separators.
- At 390/768/1024 widths, labels remain explicit, controls fit, and the page does not scroll sideways. At 1440/1920 the desktop header remains visible.
- Use Add Employee and Escape/Cancel. The production form must retain its values and keyboard focus must return to the action. Clear/unallocated controls should be compact and distinct.
- Add and remove a second item. Check each item's opening state and rate independently.
- Save a draft before closing the tab or signing out. SPA opening navigation preserves unsaved values in the existing in-memory cache; it does not promise recovery of unsaved forms after a browser/session shutdown.
- Print the production draft and posted document. The former says **Estimated labor — not yet earned**, the latter **Labor earned**. Company identity, items, quantities, rates and signatures remain intact.

The agent's successful 200-bottle posting was performed only in a fresh synthetic acceptance database. Your Draft 1 was not posted, opened with a fabricated zero, renumbered or rewritten by this milestone.
