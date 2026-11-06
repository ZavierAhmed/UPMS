# Release gates

| Gate | State | Evidence or next action |
|---|---|---|
| Existing account, schema and release | PASS | Fresh strict SSH inventory, upms_v1 with 20 tables, 45 guards, 144 rows, restricted grants and verified release. |
| Fresh protected recovery point | PASS | New encrypted archive passed checksum and authenticated decryption. Current hosted release preserved and public rollback bytes captured. |
| Independent restore | BLOCKED | Separate operator, offline key custody and signed archive-specific recovery acceptance. |
| External HTTPS identity and denial | FAIL | Compare fresh external and direct-origin probes. Provider correlation still required for the response differences. |
| Catalogue publication | BLOCKED | External denial and hosted acceptance must pass, then obtain separate owner approval. |
| Production-compatible clean initializer | BLOCKED | Exact 47/133 production profile, definer/runtime grants, durable receipts and isolated rehearsal required. |
| Proposed separate schema and identities | BLOCKED | Confirm exact cPanel target, availability, empty state and grants before requesting approval to provision. |
| Distinct-user and in-flight revocation | BLOCKED | Retain P4.1B isolated evidence and complete distinct-operator staging. |
| Symfony live security patch | BLOCKED | Verify deployed before hashes and web SAPI, stage and obtain separate approval if pursued. |
| Management cutover and financial operation | BLOCKED | Review exact new-schema scope and initializer, independently verify recovery and staging, then obtain separate publication and operation approvals. |
| SMTP and operational attachments | NOT APPLICABLE | Disabled for this release. |

The owner confirmed disposable test history. The recommended new-schema cutover proposes zero drops in upms_v1. Scope clarification does not authorize provision, credential reset, publication, rebuild or financial activation. A same-schema rebuild requires separate exact destructive approval.
