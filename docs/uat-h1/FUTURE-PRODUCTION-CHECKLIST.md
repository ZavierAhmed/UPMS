# Future production release requirements

This milestone is isolated UAT only. Successful local acceptance is not production readiness approval. Production feature readiness explicitly rejects a production profile.

Before proposing a hosted release:

- Obtain owner acceptance of piecework rates, verified opening evidence and the no-advance/no-backdate policy. Resolve any requested wage corrections/reversals with an explicit immutable correction design.
- Design and review the hosted additive migration, maintenance identity, target-bound release evidence, exact hashes, permissions and complete guard verification. Do not run the isolated installer on GoDaddy.
- Inventory the actual hosted release and data model. Do not assume this local 34/88 model equals the deployed 20/45 system or upgrade it using an old staging package.
- Extend protected recurring off-host backups to the new versioned manifest and perform an independent authenticated restore containing earnings/payments, money links, audits and command receipts. Keep the existing working backup job until the reviewed replacement is verified.
- Reverify exact runtime grants and guard behavior with the real account. Accept explicitly that database CRUD does not provide row isolation or prevent consistent forged inserts under compromised credentials.
- Test release integrity, both administrator accounts, password rotation, sessions, cookies, CSRF, authorization, host boundaries, financial chronology and all regressions on an authorized isolated hosted target.
- Preserve a protected pre-change recovery point and a reviewed failure/rollback procedure that does not erase posted labor or recreate administrators.
- Obtain separate explicit production activation approval. Keep feature default-off and SMTP unchanged until its own configuration/testing approval.

No operational backup configuration or production setting was changed by UAT-H1.
