# Partial inspection and exact disposition

Inventory records inspection date (businessDate), inspector, mandatory notes/evidence and the exact physical receipt line. Snapshot current remaining quarantine quantity/version. Reusable + damaged + remaining must equal that quantity; reusable + damaged must be positive and unit-compatible. Lossless fixed DECIMAL(20,6) snapshot formatting is accepted; nonzero fractions below unit scale are rejected.

Submitted inspection is a versioned proposal, not a stock movement. Unposted/rejected/stale proposals do not count as disposed units. Authoritative inspected/disposed totals derive from immutable posted return_dispositions; current remaining is received minus posted reusable/damaged totals. A later partial document consumes the remaining quantity. Competing proposals may be recorded, but only one matching expected version can post; others fail stale rather than double dispose units.

Administrator approves/rejects the exact payload hash/version with justification, then posts. Revalidate enabled approver, Administrator role/action authority and shared approval before posting. Inventory has no approval/post-disposition authority; Accounts and Sales have no physical posting authority. Shared justified Administrator self-approval remains explicitly permitted, while staff self-approval is forbidden.

Draft revision invalidates approval and preserves the old line snapshot. Any number, stock update, movement, audit or projection failure rolls back the entire disposition. Posted inspection/receipt corrections and financial credit remain blocked pending separate reviewed workflows.
