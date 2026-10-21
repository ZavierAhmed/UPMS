# Party ledgers, purchases, receipts and allocations

Confirmed business rules: R-07/R-10/R-11/R-15/R-16/R-26. The journal conventions, lock guards and proposed receipt structure are **PROPOSED**, not a full general ledger.

## Independent subledger balances

Each customer has up to two independent ledger rows keyed `(customer_id, ledger_class)` where class is GST or NON_GST. No automatic netting, transfer, matching or shared outstanding limit crosses those rows. Authorized consolidated reporting displays both and, optionally, a clearly labelled combined view without changing either. The same customer profile is not duplicated just to separate tax classes.

Proposed consistent debit/credit convention:

| Operational journal | Positive normal balance | Increases normal balance | Decreases normal balance |
| --- | --- | --- | --- |
| Customer ledger | Customer owes company | Debit: challan/approved upward correction/dishonour reversal of recognized credit | Credit: recognized receipt/approved return/approved downward correction |
| Vendor ledger | Company owes vendor | Credit: received purchase/approved increase | Debit: vendor settlement/approved decrease |

Customer balance = sum(debits − credits); vendor payable = sum(credits − debits). Signed party balances may expose historical credit/prepayment positions; allowing new overpayments/advances/refunds requires Q-12 policy and is not silently treated as revenue/expense. New receipt exceeding debt should fail closed until that policy is approved. The no-negative rule for **money accounts** is different from the display of a party credit balance.

Append-only entries include party-ledger FK, source posting batch/effect key, debit or credit (one positive side only), currency, effective business date, posting timestamp, document/line references and correction/recognition links. Do not keep independently editable sale totals, payments totals and ledger balances. Header totals are immutable calculation snapshots; lockable per-ledger/vendor balance caches are transactionally maintained from journal entries and regularly reconciled. Use deterministic `(business_date, posted_at, entry_id)` order for historical running views; distinguish posting order from a backdated presentation. Reports must state their ordering and period filters.

## Purchases and vendor payments

A received purchase contains supplier, supplier reference, business date, item/unit/quantity/rate/line amounts, total and optional immediate payment. Full, partial and credit purchase are one workflow. The posting transaction inserts stock-in plus **one gross payable credit**, then an optional vendor payment debit and matching money-account outflow. Its unpaid remainder is gross payable minus recognized settlement, not a second payable row. Supplier reference is searchable; proposed duplicate-warning/uniqueness policy must allow legitimate reused supplier references only with review, rather than assuming globally unique paper numbers.

The optional immediate payment uses a unique purchase-settlement source key and a first-class linked vendor-payment document in the same transaction. Later retry with a different key still finds that linked settlement; it cannot pay again. Staff cannot also expense that settlement. For V1 planning use settled cash/bank/cash-holder payment methods until outgoing vendor-cheque rules are confirmed. No automatic purchase valuation/COGS/profit/loss is designed.

Later vendor payment posts its own number, one vendor debit and one paying-account outflow after locking vendor/account balances. Partial settlement is permitted; overpayment, refunds, supplier returns and purchase corrections remain decisions requiring policy. A purchase cannot be reversed by blindly removing stock already consumed/dispatched. Draft/unreceived purchases have no stock/payable effects under the proposed received-purchase V1 workflow.

## Customer receipt and matching

Proposed one receipt = one customer ledger, one amount/currency and one method/instrument; a mixed payment is split into explicit linked receipts until mixed-tender policy is approved. Cash/bank/cash-holder receipt posts one customer credit and one account inflow atomically. A cheque receipt creates only the credit recognized by its snapshotted policy, as described in [cheque design](P2-0-accounts-cheques-expenses.md).

Receipt allocations can match part or all of recognized credit to multiple posted challans in the **same customer ledger and currency**. Unallocated recognized credit remains on that ledger. Allocation creates no customer/money journal movement. For Policy B pending cheques, matching can be draft intent only until credit is recognized. For Policy A, recognized but uncleared matches must remain visibly conditional on cheque settlement.

Use immutable allocation ADD/RELEASE events (each with receipt, challan, amount, reason and actor), not overwritten payment amounts. Later reallocation releases old matches and adds new ones in one versioned authorized operation. Prevent duplicate release and preserve its predecessor event reference. Under locks on ledger, receipt and affected challans:

- Active allocation sum per receipt ≤ its recognized credit minus any reversed recognition; never the instrument's face amount when it has no credit.
- Total active allocations per challan ≤ max(0, effective eligible sale debit after linked approved corrections/return credits). A new match is limited to that value minus existing active allocations; do not subtract existing allocations twice when testing the total.
- No match to draft/rejected/unrelated-customer/GST-class documents. Cross-ledger allocation is rejected even if combined balance is zero.
- A financial correction/return/dishonour that reduces eligibility must include approved deallocation/release events atomically or stop for reconciliation; it must not silently erase original receipt credit/history.

Credit notes need explicit target association when they reduce particular challan eligibility. A customer balance credit alone is not proof that a selected invoice can accept more allocations. Lock the parent ledger as an allocation serialization guard to prevent concurrent sums from overmatching. Snapshot reads without that lock are insufficient.

## Monetary precision and reconciliation

Amounts use proposed DECIMAL(20,2), rates DECIMAL(18,6), quantity DECIMAL(20,6); rounding/currency remain P-02/Q-09. Authoritative Node calculations must use an approved maintained decimal library or exact integer/decimal-string arithmetic, not Number arithmetic. MySQL drivers return decimals as strings; no float conversion on readback. Validate scale/range before insert because database rounding is not business approval.

Each posting's unique effects reconcile independently: purchase payable ↔ purchase gross, settlements ↔ account outflows, recognized receipts ↔ party credits, sale debits ↔ effective challan subtotal/GST. Allocations reconcile matching only. There is no fictional control/general-ledger entry to make operational journals look like double-entry accounts. Cash-basis bank balances, taxable compliance, inventory valuation and statutory statements cannot be inferred from these journals alone.

Receipt correction/refund/write-off/withholding and cross-class correction policies are unresolved; permissions do not substitute for policy. [Acceptance tests](P2-0-verification.md) include simultaneous allocation, settlement retry, exact decimal and negative-account checks.
