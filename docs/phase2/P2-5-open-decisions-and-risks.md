# Owner decisions and remaining limits

The owner has confirmed ordinary direct posting, manual selling rates, immutable posted challans, Administrator correction review, absolute nonnegative stock and one operational customer ledger. These are implemented without a second approval for ordinary Sales actions.

| Remaining decision | Current safe behavior |
|---|---|
| Currency and final precision/rounding | Main acceptance empty. Supported option is explicit money2/rate6/half-up per line; synthetic evidence is not company approval. |
| Cutoff/open period and challan/correction prefixes | No main activation. Current-Pakistan-date numbering only after explicit acceptance; period/cutoff/prefix gates remain mandatory. |
| Customer historical balances | UNVERIFIED/null display; P2.8 reconciliation/import deferred. Only audited genuine-new/no-history authorization may create zero. |
| Backdated challans and exceptions | Blocked; no invented calendar/year rule for historical dates. |
| Detailed correction and financial-credit semantics | Reviewable requests/Administrator decisions exist; all effects blocked. No direct source edits or cumulative credit bypass. |
| Physical returns/inspection | P2.7; no uninspected stock release or automatic stock for price credit. |
| Customer-facing print fields/layout | Private browser preview only, DRAFT/unissued clearly marked; final print/export disabled. |
| Customer receipts/matching/cheques | P2.6; challan outstanding remains unpaid and cannot silently reduce. |

Legacy general-purpose classification metadata remains unchanged but unused; the new module creates no classifications and exposes none. This intentionally supersedes earlier architecture proposals without destroying historical structures.

Recovered MariaDB10.4.32 is local-development evidence, not production readiness. Original port3306 remains unhealthy and unchanged. Both environments, snapshots, backups and failed test schemas remain preserved. Coarse guards favor correctness over high-throughput capacity; production hosting, off-host backup/restore objectives and independent review remain outstanding.

Next action: independent P2.5 technical/business review and explicit owner decisions. Do not merge, deploy or begin P2.6 automatically.
