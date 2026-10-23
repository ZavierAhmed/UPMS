# Open decisions and risks

Real credit posting remains blocked, including NON_GST, until the owner explicitly approves valuation, eligible reusable/damaged goods, quarantined handling, GST treatment, legal fields/numbering, currency/precision, cutoff/open period, historical customer openings, overpayment handling, refunds, backdating, reversal/correction procedure and settled-receipt/cheque interactions. Synthetic policies are not operational acceptance or tax advice.

Blocked paths: cash/cheque refunds; automatic surplus application/transfer; cross-ledger netting; extra charges; purchase/vendor corrections; credit-note reversal or edit after posting; uninspected/request-only returns; quarantined quantity credits; automatic rate/tax calculations; backdating; real activation. One original source line per note is supported. An erroneous posted note needs a separately reviewed future correction procedure, not destructive repair.

MariaDB 10.4.32 on recovered development port3309 is the tested endpoint; this does not certify production hosting or MySQL Server compatibility. Original unhealthy port3306 data/configuration and recovery evidence are preserved. Backup rollback uses a new isolated restore and independent review, never an overwrite or down migration. No merge/deployment or P2.7C work is authorized by completion.
