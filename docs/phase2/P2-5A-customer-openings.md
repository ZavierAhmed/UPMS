# Classification-scoped customer openings

Opening state is scoped by customer, ledger classification and currency. Absence means UNVERIFIED/null, not zero. GST authorization never verifies NON_GST, and vice versa. Customer master IDs/contact data remain unchanged.

Administrator activation requires explicit classification, currency, expected initial version, justification and attestation that this customer has no prior financial history in that classification. It initializes only that ledger to NEW_OPERATIONAL/zero, with audit evidence. Repeated authorization is rejected. Historical import and arbitrary starting amounts have no endpoint.

A customer may therefore have GST opening verified while NON_GST remains pending. Posting checks only the selected verified opening and matching currency, independently of item stock verification and inventory policy. Existing unclassified tracking/balances block automatic authorization and require reconciliation. The main database receives no synthetic policy or opening authorizations.
