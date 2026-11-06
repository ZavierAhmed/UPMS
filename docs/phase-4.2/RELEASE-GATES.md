# Release gates

| Gate | State | Smallest next action |
|---|---|---|
| Live inventory and existing release integrity | PASS | Fresh read-only inventory and pinned release verification completed. |
| External HTTPS identity and denial | FAIL | GoDaddy must correlate unexpected 200 responses and prove redirects, assets and hard denials. |
| Public rollback | BLOCKED | Capture and verify the live rollback archive over stable SSH. |
| Catalogue-only publication | BLOCKED | Require external gate, rollback archive, hosted staging and explicit website approval. |
| Fresh recurring protected backup | FAIL | Collector hash matched during a successful connection, then the backup stopped at the collector integrity stage. Restore stable SSH and run the existing owner-authorized backup. |
| Independent recovery | BLOCKED | Actual owner USB custody, separate operator and signed 20/45 restore receipt. |
| Symfony production patch | BLOCKED | Live before hashes, web-SAPI proof, isolated security staging and separate publication approval. |
| Management multi-user | BLOCKED | Distinct authenticated operators and revocation during a live read still need isolated acceptance. P4.1B same-operator concurrency evidence is retained. |
| Operational migration | BLOCKED | Production profile and guard contract, signed historical treatment, independently restored rehearsal and durable receipts. |
| Hosted staging | BLOCKED | Establish separate HTTPS and isolated writable database. |
| Management cutover and financial activation | BLOCKED | Separate approvals for the rehearsed migration, PHP publication and resuming operations. |
| SMTP and operational attachments | NOT APPLICABLE | Keep disabled in this rollout. |

Owner approval actions are separate: catalogue-only website publication, security-only vendor publication if pursued, production migration, matching PHP/React publication and resuming financial operations. The historical accounting decisions and signed independent recovery receipt are mandatory inputs before requesting management cutover approval.

Local catalogue package and PHP management archive byte verification passed. Catalogue live publication remains blocked. The current management package can support isolated review. The operational migration and hosted staging gates remain mandatory.
