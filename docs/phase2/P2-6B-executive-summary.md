# Customer cheque foundation

Baseline433089062e80ac95a5ae7c4317101a8f9df49df3; branch feature/upms-p2-6b-cheque-management. Cheques extend the existing classified receipt and shared money journals. Owner-confirmed immediate customer credit is distinct from settlement: receipt credits only verified pending custody, clearance transfers custody to bank, and exact Administrator-approved dishonour compensates the original credit and every funded allocation.

Real policies/openings remain blocked by actual SQL database-name checks. Main business state must remain unactivated. No public website changes, imports, merge, deployment or P2.7. Implementation and acceptance evidence are recorded separately; no production-readiness claim.

Local acceptance completed: migration008,90 physical/88 runtime tables/eight migrations, unchanged owner state and recovery evidence. Backend149/frontend116; identity17/business16/inventory20/purchasing29/Sales23/classification38/receipts48; complete cheque66 reported checks with overlap explicitly documented. Public W06/build/lint/audits/extracted-package checks pass. See test-results for failed-run preservation and exact counting; main activation remains blocked. Stop for independent review after the requested commit/push.
