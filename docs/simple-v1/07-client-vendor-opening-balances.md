# Explicit opening balances

Clients and vendors are separate party kinds. Contact fields: name, phone, address, remarks and active status. Creation asks for an opening amount (including explicitly entered0), date, direction and reason, then creates an immutable opening entry. A failed opening leaves the party unverified and navigates to its detail for review; metadata creation never silently implies zero.

OWED_TO_COMPANY is a client receivable or company advance to a vendor (debit). OWED_BY_COMPANY is a vendor payable or client advance (credit). Missing/invalid direction is rejected. A unique verified-opening state blocks duplicate recognition, including zero. Transactions require a verified opening and cannot predate it.

Opening correction is a linked, reviewed replacement target amount/direction. The journal records only the difference, retaining the original evidence. It is blocked after non-opening activity. Later financial corrections require an independently reviewed future policy. These synthetic amounts are not validated company figures; no legacy GST/NON_GST aggregation/import occurs.
