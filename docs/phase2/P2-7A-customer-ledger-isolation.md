# Financial isolation and P2.7B handoff

P2.7A services import no customer/money posting service and write no financial table. No credit notes/refunds, receivable reduction, receipt reversal/application, cheque compensation, vendor event, GST adjustment or replacement sale. Physical acceptance is not financial entitlement and never multiplies return quantity by a selling rate.

Read-only P2.7B evidence: return_documents identifies original challan/customer/classification and original version/hash; current immutable return_lines revision identifies exact source sales line/item/unit/variant; return_receipts records actual physical quantity/request link/policy/batch/actor; return_dispositions records inspected reusable/damaged/remainder and exact approval; return_stock_movements proves physical effects. Only POSTED receipt/disposition documents are authoritative completed physical events. Do not infer entitlement from drafts, requested quantity or a mutable status alone.

Future P2.7B must independently authorize/value credit, retain its own immutable source links and cumulative financial limits, and preserve source GST/NON_GST identity. It must not mutate physical histories, original manual tax, receipt allocations or cheque evidence. No API here approves future financial effects.

Return source/read projections exclude original financial payload, rate, amount, GST and receivable columns for every role. Separate existing Sales/Accounts APIs retain their own financial permissions. UI labels Financial credit not processed. Tests snapshot all affected financial journals/projections and original challan evidence across physical posting and fault/retry paths.
