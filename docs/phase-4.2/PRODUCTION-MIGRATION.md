# Production migration

Read-only production inventory on 2026-11-06 confirmed 20 tables, 45 guards, 141 rows, eight documents and two existing administrators. Comparison to the P4.0 140-row inventory showed only the session table changed, from one to two rows. Other recorded table row-set fingerprints matched. The restricted runtime and guard checks are recorded in the local host inventory.

P4.0's structural rehearsal added 27 tables and 88 guards, preserved all original rows and resumed after interrupted DDL. Its reviewed structural plan is included as evidence in the management archive. It cannot be run as an operational production migrator.

Production remains blocked because the verified production profile and activation receipt still pin the original schema, guard plan and target hash. Money, labor, Hafta and cheque feature contracts require isolated configuration. Enabling flags or dropping those checks would bypass readiness and recovery contracts. The minimum operational implementation needs a reviewed versioned 47/133 production contract, exact guard definitions and grants, durable per-step migration receipts, source row reconciliation and valid signed accounting inputs. Rehearse that implementation on a separately restored copy after the independent operator verifies actual recovery. Do not run the structural-only plan against production.

Required accounting decisions:

- Approve cutoff date and document how existing posted client payments map to historical cash or bank coverage.
- Provide evidenced opening balances and dates for each applicable cash/bank account. Preserve explicit client/vendor openings and reconcile coverage gaps.
- Approve employee labor opening coverage and any liability treatment.
- Classify legacy cheque references. Preserve custody and clearance evidence and recognize only verified clearance under the approved policy.
- Decide the treatment of unresolved history. Preserve original IDs, credentials, documents, numbers, stock, ledger and audit records.

Independent operator checklist: use the owner-approved archive and separate offline USB capsule, verify both checksums, restore on a separate computer/account to an isolated schema, verify 20 tables, 45 guards and 140 archived rows, compare per-table fingerprints, then sign and return the acceptance receipt. Keep the key and passphrase in separate custody. The fresh live count is 141 and must be compared to its own authenticated backup receipt before cutover. Do not expect the older archived count to change.

Future backup requirements: a separately versioned 47/133 collector and decoder, transactionally consistent journal and labor/cheque evidence, exact schema and guard allowlist, ciphertext and authenticated attachment metadata if enabled, independent application-key and recovery-key custody, tamper rejection, restore testing and monitored backup failure. Preserve the current 20/45 collector and archive decoder. Attachments remain disabled pending scanning and recoverable key custody.

Fresh inventory at 17:35 PKT identified upms_v1 on MariaDB 10.11.19-MariaDB-cll-lve. Restricted grants and all 45 guards passed. The last successful encrypted backup was verified at 11:32 PKT on 2026-11-06 with 140 rows, 20 tables and 45 triggers. Its ciphertext SHA-256 is 7c32c58688999d04332850c6580f070c49e70c5e45a9308da3fa73305d5f19d6 and the archive remains present. The hosted collector matched SHA-256 236f1c7275553aa63bb4b71bc00de24d21d06f2bff161aa3cff883875cd75b01. The next Run attempt failed at collector-integrity during intermittent SSH access. No new backup or independent restore was recorded.
