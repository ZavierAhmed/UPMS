# Production labor design

The existing PHP Simple V1 document workflow remains authoritative. The production editor reuses the searchable employee directory and Add Employee dialog. Only active employees appear for new selections. Closing the dialog preserves the document's items, quantity, reference and labor rates; creating an employee selects it without submitting the surrounding document form. The dialog retains focus trapping, Escape return focus and responsive button sizes.

Each assigned production has one employee and a normalized employee snapshot. Each line carries its own exact two-decimal labor rate and amount, independent of its stock/sale rate. The API validates missing, malformed, negative and unconfirmed zero labor rates. Unassigned documents contain no inferred wage allocation. Disabled feature profiles reject labor input.

Posting rechecks the employee's active identity and snapshot, line arithmetic and existing stock/item versions. Earnings append only after the posted document and posting audit exist, in the same `BusinessCommand` transaction as stock, document status and command receipt. Existing global control locking serializes competing commands. Unique earning `line_id` prevents double accrual. Idempotency retries return the original result. A real denied earning INSERT proved that prior stock writes and posting state roll back together.

Five additive resources are described in `upms.php/resources/employee-hafta-schema.json`, version `uath1-v1`:

| Table | Purpose |
|---|---|
| labor_schema_receipts | Version and installation evidence |
| labor_openings | One reviewed opening per employee |
| labor_earnings | Immutable production-line earning snapshots |
| labor_payments | Immutable settlements linked to one money batch |
| labor_audit | Immutable canonical entry hashes and actors |

The baseline 29 tables and 72 guard definitions remain unchanged. Isolated installation yields **34 tables and 88 guards**. Sixteen new guards protect labor history and reserved labor-money source shape. Foreign keys, exact amount checks, unique line, employee/reference, money-batch and audit-entry constraints add native protection. Observed MariaDB DDL hashes are versioned and compared on later installs.

Money payments use a reserved `UPMS-LABOR:<opaque-id>` canonical outgoing source. Generic money source/reversal APIs reject that namespace. A payment inserts one settlement, money batch, money movement and audit evidence inside one business transaction. A denied settlement INSERT proved that an earlier money deduction rolls back completely. Separate ordinary employee expenses do not deduct wages again.

Runtime receives CRUD only, without DDL/TRIGGER privileges. Maintenance verifies complete guard definitions; runtime verifies target-bound protected maintenance evidence, schema hashes and actual count because MariaDB does not expose full trigger definitions to the CRUD identity. Existing guard classes were not loosened.

Native immutable protection blocks runtime updates/deletes of recorded labor history. It does not prove physical money delivery or prevent a compromised CRUD credential from manufacturing mutually consistent new inserts. Reconciliation explicitly retains `authenticityVerified=false`; arithmetic and structural consistency are not independent authenticity proof.
