# UI redesign test results

Final automated acceptance passed on2026-10-23. No backend/migration changes or weakened security assertions.

Backend160 passed. Frontend136 passed (125 existing plus11 new), including navigation, responsive drawer/Escape, active state, role visibility, dashboard read permissions, classification separation, empty/status cards, error boundaries, explicit review cancellation and retained form input. Existing rapid GST/NON_GST ledger switching, module validation, busy states and financial presentation tests remain intact. Build and lint pass.

Fresh SQL regression04: original identity17 and business16; separate classification04:38; final inventory05:20 and purchasing05:29 pass, including actual browser master CRUD, stock and supplier financial workflows. Final fresh expenses08 cross-module pipeline passed133 checks (110 retained plus23 expense), running the original sales/receipt/cheque/return/credit assertions; the38-check classification branch runs separately, along with23 expense scenarios and independent business-module browser workflows. Counts overlap by design, not distinct additive totals. All SQL is real MariaDB10.4.32 on3309 with restricted runtime grants in dedicated synthetic schemas. Main and UAT02 are never used for financial fixture tests.

Original four-role UAT browser19 checks also pass with the redesigned screens; health and all-module reconciliation match. Read-only visual demo52 checks/58 screenshots at1440/768/390 pass,100 business table fingerprints unchanged. Main preservation100 business tables,109 restricted runtime scopes, one administrator and seven private profiles pass. Original/offline recovery manifests match1037 files each. Public W06 regression66 route/viewports and22 interactions pass; Lighthouse performance96/96/97/98 and accessibility/best-practices/SEO100 all four. Evidence is in ignored tmp/ui-redesign and private server/.local/p27c/ui-redesign-*.json. No credentials or data dumps are published.

Failed runs04/05/06/07 and their exact causes are recorded in UI-redesign-open-issues.md; no failed schema was reused. Final owner manual UAT remains NOT YET EXECUTED.

Final extracted113-file package passes production-only dependency installation, native Argon hashing,11 public routes and asset, seven denied private probes, disabled SMTP and corruption rejection. The final archive manifest is rebound to the delivery commit and verified after commit; no deployment occurs. Final posting-review screenshots include actual selected account names and the explicit synthetic warning.
