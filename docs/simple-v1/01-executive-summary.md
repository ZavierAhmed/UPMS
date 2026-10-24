# Simplified Bottle Management V1

Source/checkpoint SHA: `7fdd9918f3e2c00297570534a1a80800ce193250`. Verified remote source: `feature/upms-ui-business-usability`. Preserved remotely as `backup/upms-pre-simplification`; implementation: `feature/upms-simple-v1`. No prior branch was rewritten. Nine supplied untracked source logos remain untouched and unpublished.

V1 provides eleven working pages: Dashboard, Items, Clients, Vendors, Stock In, Delivery Challans, Client Payments, Vendor Payments, Ledgers, Reports and Settings. It retains the pastel management design while removing department/approval/GST/material workflow dependencies. Existing authentication, CSRF, hashing, sessions and audit remain.

Production and purchased bottles increase stock; finalized challans atomically deduct stock, debit a client and issue the exact approved number. Explicit party openings support receivable/payable/advance/zero directions. Account-level payments, immediate cheque credit and traceable reversals feed signed Excel-style ledgers. Reports and ledgers export real XLSX files. The non-priced delivery note reproduces the photographed fields using Unique Plastic Industry identity only.

Ten additive V1 tables are installed only in new isolated synthetic schemas. Main remains111 legacy tables/eleven migrations, with no V1 activation. Legacy business APIs are blocked in V1 mode and V1 runtime accounts have no legacy business rights. Legacy mode/code/tables remain preserved.

Demo: http://127.0.0.1:3110/management, schema `upms_test_simplev1_demo_20261024_01`, recovered MariaDB3309. Safe access and UAT steps:12-owner-uat-guide.md. Results:11-test-results.md. Owner review and company-data cutover remain pending. No merge, deployment or live activation.

Local technical verification passed:167 backend,166 frontend,28 final V1 SQL,25 browser workflow plus4 draft/navigation checks,14 read-only demo checks; legacy17 identity/17 business/20 inventory/29 purchasing/134 cross-module; W06 public66+22; security audits0. Final candidate package118 files verified. Final commit SHA is reported in the handoff and matching deployment manifest; the commit-bound archive is verified before push.
