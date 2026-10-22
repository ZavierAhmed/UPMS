# Owner decisions and operational limits

No actual owner financial policy has been accepted. Synthetic policy evidence is not company approval. Main purchase/vendor/money tables must remain unactivated.

| Decision | Current status and safe behavior |
|---|---|
| Receipt versus invoice recognition/date evidence | Unresolved. Separate records implemented; only explicitly accepted current-Pakistan-date path supported. Historical supplier dates remain blocked. |
| Currency, rate/amount scale, rounding, zero/free items | Unresolved. Supported proposed option is single explicit currency, rate6/money2, per-line half-up, positive nonzero rounded lines. No real posting before explicit acceptance. |
| Taxes/GST/withholding/charges | Unresolved. No tax fields/calculation/legal invoice claim. Only explicitly accepted no-tax-supported path can post. |
| Purchase/invoice/payment/correction prefixes | Unresolved; prepare creates unapproved types only. No automatic acceptance or issued number. |
| Vendor and money historical openings | Unresolved; unverified/absent balance is not zero. No opening import. Only audited no-history new-entity activation is implemented. |
| Operating cutoff and period/backdating | Unresolved. Purchasing and inventory policies are independent. No open period or cutoff is created in main. |
| Instruments and account-specific deficits | Unresolved. Accept exact settled account types and separate deficit-type scope; cheque types unavailable. |
| Supplier invoice uniqueness | Unresolved for live use. Supported reviewed option is conservative per-vendor case-insensitive normalization/SQL collation uniqueness. |
| Purchase/settlement corrections, returns, refunds, advances | Unresolved; linked requests retain evidence but effects are blocked. No silent reversal or surplus balance. |

Receipt-only policy could be separated from monetary policy in a future reviewed version; this implementation deliberately requires a complete explicit purchasing contract even for receipt-only posting. Partial/consolidated supplier invoicing, mixed instruments, FX, stock condition reclassification and historical dates need future supported contracts rather than inferred defaults.

Original port-3306 XAMPP remains unhealthy and untouched. The recovered MariaDB 10.4.32 endpoint is local-development evidence only. Backup retention/off-host recovery objectives, production hosting, performance and independent security/accountant review remain outstanding. No purchasing/Accounts production readiness, merge, deployment or P2.5 is authorized.

Recommended next action: independent P2.4 review and owner/accountant decision sign-off, then a separately authorized activation/opening milestone. Do not start the next implementation milestone automatically.
