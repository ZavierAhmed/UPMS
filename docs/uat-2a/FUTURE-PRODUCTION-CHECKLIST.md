# Future operational release requirements

This branch provides isolated UAT functionality. The current production deployment and its backup job retain their existing approved scope.

Before an operational release, obtain owner/accountant approval for clearance-only recognition, complete-instrument settlement, overpayment blocking, exceptional self-approval, custody dispositions and terminal cleared history. Verify issuing-bank identities through an approved institution directory and keep them distinct from receiving-bank money accounts.

Operational attachments remain BLOCKED until malware scanning, parser isolation, storage capacity, retention, incident handling and scanner failure behavior are approved and tested. Content validation alone supplies no malware-scanning assurance.

Establish protected off-host recovery for the extended database, every encrypted attachment and the separate application encryption key. Exercise recovery under the intended recovery identity and plan for loss of the Windows DPAPI profile. Preserve the original key for historical files through any future key-rotation design. The existing 20-table production backup cannot be claimed to cover this 47-table extension.

Use a separately approved migration and deployment workflow with genuine current recovery evidence, actual runtime grants, authenticated SQL identity, host isolation, trusted HTTPS, release integrity and readiness. Validate the intended production PHP and MariaDB versions. The recorded local automated PHP runtime was 8.3.36 with MariaDB 10.11.19 on pinned port 3330. This milestone performs no hosted version acceptance.

Rehearse additive DDL and recovery against a fresh source backup before requesting the operational maintenance window. Preserve administrative accounts, password state, original references, numbering and posted history. Stop on any failed check and retain evidence rather than reinitializing data.

Application authorization remains application-enforced. Shared SQL credentials retain the documented ability to fabricate permitted inserts and actor claims. Verify all native UPDATE/DELETE protections, guard definers and the new audited bank-insert rule. Verify authenticated file binding, negative mutations, CSRF, cookies, sessions, logout and idempotency again on the intended target.

Inspect effective inherited privileges from the authenticated runtime connection. A named account's own grants can omit the PUBLIC privileges visible in its own SHOW GRANTS output. The local empty sample scopes were removed after inspection. Review and authorize any separate hosting privilege correction through its approved workflow.

Public SMTP inquiry delivery remains subject to its existing configuration and test approval. Financial smoke acceptance must use the explicitly authorized scope and preserve real customer, stock, challan, ledger and payment records.
