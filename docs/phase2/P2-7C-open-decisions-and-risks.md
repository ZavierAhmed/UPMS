# Open decisions and risks

Real expenses remain blocked pending owner approval of recognition rules, category catalogue, currency/precision/rounding, ordinary spending thresholds, eligible payment types, exact deficit rules, cutoff/periods, references, official prefixes, historical payable/account openings, adjustments/reversals, tax/withholding and backdating. Synthetic categories and the15000 threshold are test examples, not operational accounting policy or legal/tax acceptance.

Unsupported: outgoing cheques, credit cards/gateways, FX, payroll/advances, recurring expenses, tax calculations, arbitrary journal edits, overpayment advances and financial/payment-reversal correction effects. Posted evidence remains immutable. Correction review is available but effect posting fails closed. Linked vendor references never create P2.4 vendor payable.

The recovered MariaDB10.4.32 development endpoint is tested, not certified production hosting/MySQL Server. Original unhealthy XAMPP3306 data/config, snapshots, profiles and backup evidence remain protected. Main upms is not a demo and remains unactivated. Rollback preserves journals and uses a fresh isolated restore with independent review, never down migration or overwrite.

UAT generation01 failed early because the initial seeder referenced a nonexistent session-order column; it is retained and cannot be reused. Generation02 is the functional demo. Only explicit generations01/02/03 with matching runtime flag/schema are permitted;03 is reserved for a fresh owner rebuild. Browser failures during logout navigation were preserved and fixed with an explicit navigation wait. Automated success is separate from owner manual UAT, which remains NOT YET EXECUTED. No merge, deployment or P2.8.
