# Remaining owner decisions and limits

GST/NON_GST separation is confirmed. Manual GST addition is proposed and accepted only synthetically. Real operational posting remains blocked.

| Pending decision | Safe current behavior |
|---|---|
| GST amount-entry authority, fields, registration and compliance | Explicit synthetic manual-entry policy only; no percentage/legal invoice claim |
| Currency, final precision/rounding | Explicit Sales/Purchases money consistency gates; no main acceptance |
| Cutoff and open period | Existing policy/date/period checks retained; no main activation |
| Prefix/numbering and customer-visible print layout | Shared sequence explicitly synthetic; no inferred separate tax sequence or final export |
| Historical openings | Separate unverified/null ledgers; import deferred to P2.8 |
| Cross-classification correction | Administrator-reviewable request, all posting effects blocked |
| Physical returns | P2.7; no automatic stock credit |
| Backdated documents | Blocked pending policy |
| Customer receipts and cross-ledger allocation | P2.6; shape requires one ledger, no implicit offsets or actual receipt posting |

MariaDB 10.4.32 on the recovered endpoint is development evidence, not production readiness. The original port3306 instance remains unhealthy and preserved. Production tax/hosting/security/backup requirements and independent technical/business review remain outstanding. No merge, deployment or P2.6 work follows automatically.
