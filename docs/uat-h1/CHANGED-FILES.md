# Changed-file inventory

UAT-H1 staged source, tests, documentation and synthetic evidence. Private runtime credentials, archives, temporary renders and unrelated owner assets are excluded. Baseline: `7c8e6184c4be16ed33adb03b71d47fac9b2a53fd`.

## PHP runtime and tests

- `upms.php/.env.example`
- `upms.php/app/Http/Controllers/EmployeeHaftaController.php`
- `upms.php/app/Http/Controllers/ExpenseController.php`
- `upms.php/app/Http/Controllers/MoneyAccountsController.php`
- `upms.php/app/Http/Controllers/SimpleV1Controller.php`
- `upms.php/app/Upms/Documents.php`
- `upms.php/app/Upms/EmployeeHafta.php`
- `upms.php/app/Upms/EmployeeHaftaGuards.php`
- `upms.php/app/Upms/EmployeeHaftaReconciliation.php`
- `upms.php/app/Upms/EmployeeHaftaRecovery.php`
- `upms.php/app/Upms/EmployeeHaftaSchema.php`
- `upms.php/app/Upms/Integrity.php`
- `upms.php/app/Upms/MoneyAccounts.php`
- `upms.php/app/Upms/Reconciliation.php`
- `upms.php/app/Upms/SimpleV1.php`
- `upms.php/app/Upms/V1Input.php`
- `upms.php/config/upms.php`
- `upms.php/resources/employee-hafta-schema-hashes.json`
- `upms.php/resources/employee-hafta-schema.json`
- `upms.php/routes/api.php`
- `upms.php/tests/Support/labor-local.php`
- `upms.php/tests/Unit/EmployeeHaftaTest.php`

## Management UI and tests

- `upms.client/management/src/BottleLineEditor.jsx`
- `upms.client/management/src/EmployeeHafta.jsx`
- `upms.client/management/src/ExpenseMasters.jsx`
- `upms.client/management/src/HaftaReport.jsx`
- `upms.client/management/src/MoneyDocumentEffect.jsx`
- `upms.client/management/src/ProductionLabor.jsx`
- `upms.client/management/src/SimpleV1.jsx`
- `upms.client/management/src/employee-hafta.css`
- `upms.client/management/src/employeeHaftaUtils.js`
- `upms.client/management/src/haftaReportUtils.js`
- `upms.client/src/test/EmployeeHafta.test.jsx`

## Isolated acceptance and owner startup

- `scripts/start-uath1-preview.ps1`
- `scripts/uath1-browser.mjs`
- `scripts/uath1-final-recovery.mjs`
- `scripts/uath1-integration.mjs`
- `scripts/uath1-labor-scenario.mjs`
- `scripts/uath1-money-detail-security.mjs`
- `scripts/uath1-owner-preservation.mjs`
- `scripts/uath1-php-suite.mjs`
- `scripts/uath1-preview.mjs`
- `scripts/uath1-print-verify.py`
- `scripts/uath1-regressions.mjs`
- `scripts/uath1-render-review.py`

## Review artifacts

- `output/pdf/uat-h1/client-weekly-statement.pdf`
- `output/pdf/uat-h1/employee-all.pdf`
- `output/pdf/uat-h1/employee-single.pdf`
- `output/pdf/uat-h1/employee-week.pdf`
- `output/pdf/uat-h1/hafta-payment.pdf`

## Documentation and evidence

- `docs/uat-h1/EMPLOYEE-HAFTA-POLICY.md`
- `docs/uat-h1/FUTURE-PRODUCTION-CHECKLIST.md`
- `docs/uat-h1/OWNER-UAT-GUIDE.md`
- `docs/uat-h1/PRODUCTION-LABOR-DESIGN.md`
- `docs/uat-h1/RECONCILIATION-AND-RECOVERY.md`
- `docs/uat-h1/TECHNICAL-REPORT.md`
- `docs/uat-h1/evidence/after-client-weekly-statement.png`
- `docs/uat-h1/evidence/after-employee-all.png`
- `docs/uat-h1/evidence/after-employee-mobile.png`
- `docs/uat-h1/evidence/after-employee-single.png`
- `docs/uat-h1/evidence/after-employee-week.png`
- `docs/uat-h1/evidence/after-hafta-payment.png`
- `docs/uat-h1/evidence/after-payment-posted.png`
- `docs/uat-h1/evidence/after-payment-review.png`
- `docs/uat-h1/evidence/after-production-draft-unearned.png`
- `docs/uat-h1/evidence/after-production-employee-popup-1440.png`
- `docs/uat-h1/evidence/after-production-employee-popup-390.png`
- `docs/uat-h1/evidence/after-production-employee-popup-768.png`
- `docs/uat-h1/evidence/after-production-labor-entered.png`
- `docs/uat-h1/evidence/browser-oracles.json`
- `docs/uat-h1/evidence/browser.json`
- `docs/uat-h1/evidence/client-weekly-statement.xlsx`
- `docs/uat-h1/evidence/consolidated.json`
- `docs/uat-h1/evidence/documents-regression/integration.json`
- `docs/uat-h1/evidence/employee-all.xlsx`
- `docs/uat-h1/evidence/employee-single.xlsx`
- `docs/uat-h1/evidence/employee-week.xlsx`
- `docs/uat-h1/evidence/expenses-regression/integration.json`
- `docs/uat-h1/evidence/final-recovery.json`
- `docs/uat-h1/evidence/foundation-regression/integration.json`
- `docs/uat-h1/evidence/labor-integration.json`
- `docs/uat-h1/evidence/labor-oracle.json`
- `docs/uat-h1/evidence/money-detail-authorization.json`
- `docs/uat-h1/evidence/owner-preservation.json`
- `docs/uat-h1/evidence/pricing-regression.json`
- `docs/uat-h1/evidence/print-verification.json`
- `docs/uat-h1/evidence/refunds-regression/integration.json`
- `docs/uat-h1/evidence/uath1-base-contracts.json`
- `docs/uat-h1/evidence/validation.json`
- `docs/uat-h1/evidence/visual-review.json`

- `docs/uat-h1/evidence/php-full-suite.log`
- `docs/uat-h1/evidence/php-reconciliation-contracts.log`
- `docs/uat-h1/evidence/php-fixtures.log`

This inventory file itself is also included. No existing production deployment, backup infrastructure, original guard class or client financial calculation resource is changed.
