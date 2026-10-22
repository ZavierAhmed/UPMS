# P2.6A executed acceptance

Executed on2026-10-22 with Node24.22.0 and real MariaDB10.4.32 on port3309, normal recovery0. No mocked SQL success, skipped assertions, owner business fixtures or reset/reused populated schemas count as passing.

| Suite | Actual result |
|---|---|
| Backend |143 passed: original137 plus six receipt checks |
| Frontend |113 passed across11 files: original110 plus three receipt checks |
| Identity SQL |17 passed, regression03 |
| Business SQL/browser |16 passed, regression03 |
| Inventory SQL/browser |20 passed, inventory01 |
| Purchasing SQL/browser |29 passed, purchasing01 |
| Original Sales SQL/browser |23 passed, sales01 |
| Expanded classification SQL/browser |38 passed, classification02: original23 plus15 classification cases |
| Receipt SQL/browser |48 passed, final receipts05: shared23 Sales baseline plus25 new receipt cases |
| Build/lint | Passed |
| Full backend/client dependency audits | Zero vulnerabilities each |

SQL totals include Node parent tests and embedded browser cases. The expanded/receipt suites repeat Sales fixture/baseline checks; they are not additional unique23 cases each. Original assertions remain enabled, with only schema/history/evidence metadata adapted for migration007. Customer originals retain their old exact assertions; current settlement behavior receives new explicit checks instead of weakening original evidence.

Receipt SQL proves full payment, last outstanding, multi-challan partial settlement, same-customer GST/NON_GST independence, duplicate/cross-customer/cross-ledger/currency denials, precision/zero/overflow/method gates, cash/bank/holder compatibility and verified openings. Fully/partly unapplied receipts distinguish gross/unapplied/net; later applications create no second credit. Two receipts race for one challan; two applications race for one credit; simultaneous classifications share one money account without losing updates.

Durable key conflict/replay, independent process restart, current revoked money authority, real receipt lock timeout, shared-guard deadlock and actual TCP COMMIT-ACK loss passed. Customer-credit, allocation, money, audit and numbering trigger failures roll back all financial/projection/number/idempotency effects. One invalid allocation among valid ones leaves all amounts unchanged. A positive receipt into a rollback-only synthetic overdraft requires no new deficit approval; original vendor outgoing-deficit tests still pass.

Posted source immutability, duplicate correction claims, staff self-approval denial, exact Administrator hash/version decisions and disabled reversal effects passed. Accounts direct posting requires no ordinary approval. Inventory/Sales receipt-write/account API denials and CSRF tests remain enabled. Reconciliation proves original debits preserved, current outstanding nonnegative, remaining/total credits consistent, immutable source hashes matching and combined money journals balanced. Intentional projection/source tampering is detected without repair and rolled back.

Real isolated browser sessions create/post GST and NON_GST receipts, partially allocate across two challans, retain deliberate remainder, verify correct current customer outstanding and one money credit, exclude the other classification, show Sales receipt/status history, review Administrator correction decisions, deny Inventory navigation and verify mobile. No page or unexpected console errors occurred. Loaded options/ready controls and exact input replacement are asserted.

Failure evidence: receipts01 stopped because its assertion parsed a legitimate negative net credit position with an unsigned money parser; the application value was correct and the test now explicitly parses signed net position. Receipts02 exposed a real receipt intent-read timeout outside the retry coordinator. Action-specific authorization moved inside the guarded retrying transaction, before idempotency replay; receipts03 passed48. Receipts04 reverified strengthened source reconciliation and classified activity state. Final receipts05 also verifies draft/application list amounts after read-display review. Failed schemas/accounts/logs/JSON remain preserved, and no failed target was reused. Early account-prefix overlap was avoided through distinct subsequent receipt `eNN` names and regression03.

Main evidence: exact74-table backup/isolated restore and recorded six historical-source hashes; only migration007 applied;83 physical/81 runtime tables/seven migrations; all original rows and Administrator retained; encrypted profile/signing-key hashes unchanged; all financial/operational activation state empty; all reconciliations matched without repair. Actual main SQL database identity rejected receipt and real GST activation. All1,037 original XAMPP files and their offline copies remained byte-identical.

Public regression passed66 route/viewport combinations and22 interactions. Lighthouse performance: home97, catalogue97, detail97, contact98; accessibility/best-practices/SEO100 on all four pages. The87-file package passed a clean production-only install, native Argon2 hashing, manifest integrity/corruption rejection, eleven public routes, an asset and seven private-path probes. SMTP remains Disabled. The final package is regenerated from the milestone commit and checked again from a fresh extraction with its exact source SHA.

Private detailed receipts/logs/backups remain ignored under `server/.local/p26a` and `tmp/w06/p26a`. No credentials, SQL dumps, customer records or recovery evidence enter Git or the package. No merge/deployment/P2.6B.
