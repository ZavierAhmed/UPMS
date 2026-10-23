# Expense lifecycle

EXPENSE drafts contain an explicit date, currency, payee, optional linked vendor, unique payee/source reference, evidence, remarks and one or more manually valued category lines. Line amounts must be positive exact two-decimal values and sum to the stated total. Tax, payroll, advances, depreciation, inventory valuation and unrestricted journals are rejected. A vendor reference preserves identity without writing a vendor payable.

Under the accepted synthetic policy, Accounts may directly record a DRAFT at or below the threshold. Higher totals require SUBMITTED → exact Administrator APPROVED. Revisions invalidate approvals. A voluntary approval may also be used for a lower amount. The shared business header becomes POSTED; financial state is separately derived as RECORDED, PARTIALLY_PAID or PAID. No posted source, line, obligation or settlement can be edited/deleted.

EXPENSE with no payment is valid and creates one obligation and payable only. A full immediate payment is optional and commits atomically in the same transaction. Later PAYMENT documents reference a posted expense and expected payable version. CORRECTION documents retain linked metadata/category/amount-reduction/payment-reversal proposals and exact review history; all correction posting effects remain blocked. There is no destructive cancellation or reversal endpoint.
