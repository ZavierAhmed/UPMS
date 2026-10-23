# Navigation corrective milestone — verification

Source SHA:0d1e9bc84578c491be2a504c01a96dbb21c7414f. Branch:feature/upms-ui-navigation-ux-fixes. Final SHA is provided by delivery and the commit-bound deployment manifest; this document does not embed its own future commit hash.

| Check | Result |
|---|---|
| Backend Node tests |162 passed |
| Frontend Vitest |146 passed,17 files (136 retained +10 navigation/usability tests) |
| Original SQL identity/business |17/16 passed in fresh regression02 |
| Original inventory SQL/browser |20 passed |
| Original purchasing SQL/browser |29 passed |
| Original GST classification SQL/browser |38 passed |
| Complete sales→receipts→cheques→returns→credits→expenses pipeline |133 passed in full03 |
| Real navigation Chrome acceptance |17 passed;0 financial POSTs |
| Original synthetic demo browser |19 passed,4 roles |
| Responsive visual browser |85 passed,85 screenshots,1440/768/390 |
| Public website regression |66 route/viewport checks +22 interactions passed |
| Lighthouse |Home96,catalog97,detail97,contact98 performance; accessibility/best-practices/SEO100 throughout |
| Frontend build and ESLint |Passed |
| Full and production dependency audits |0 vulnerabilities, server and client |
| Deployment package |113 files; separate extraction, production-only install, native hashing, manifest/corruption checks, public routes/assets/private probes passed |
| Main/recovery/profile preservation |100 business tables match;8 expense tables empty;administrator retained;7 profiles unchanged;1037 files each in original/offline source match |

MariaDB10.4.32 on recovered loopback3309, normal recovery0. These are local MariaDB compatibility results, not Oracle MySQL acceptance. New SQL test schemas/accounts contain only synthetic fixtures and remain preserved. Main upms and existing UAT02 were never SQL fixture targets. Demo login/audit/session records naturally change; all100 business tables remain byte-fingerprint identical.

Failure evidence is retained. Full01 stopped at a real Inventory child-draft route permission bug, corrected with separate receipt/inspection URLs. Full02 then passed return and credit browser acceptance but stopped at the original tool-only funding schema guard. The owner explicitly approved the exact full03 schema/account+environment-marker exception documented in UI-navigation-full-regression-forward-plan.md; full03 passed all133 original cases. Regression01 passed identity17 but the wrapper omitted its required receipt; corrected fresh regression02 passed17+16. No failed/populated schema was reused or reset. No original assertion was weakened.

All eleven migrations, runtime financial services, permissions and operational activation guards remain unchanged. The only server/src change is the private SPA/static HTTP boundary. The only financial-tool exception is owner-approved, exact-target synthetic test funding; it is excluded from deployment. Public source/assets are unchanged and the nine unrelated untracked source logos remain preserved/unpublished.

Logs:ignored tmp/ui-navigation (SQL, frontend/backend, build/lint, dependency audits, public/Lighthouse, package). Timestamped private browser/preservation receipts:server/.local/p27c. Operator test profiles/started/provisioning receipts:server/.local/ui-navigation, DPAPI encrypted credentials. No passwords or session secrets are committed.

Remaining acceptance: owner visual review and full manual UAT. No merge, deployment, real opening balance, operational posting activation or next business milestone is authorized.

Reproduce browser proof from the repository root with `./server/tools/Invoke-UPMSNavigationBrowser.ps1 -Action Navigation` or `-Action Visual`; these only use existing encrypted UAT02 profiles and never provision/reset. SQL provisioning/testing uses `Invoke-UPMSNavigationTests.ps1`; already-started targets must never be reused. All22 original form-submit handler ASTs across the eight modules also match the source commit exactly (private form-handler-review.json).
