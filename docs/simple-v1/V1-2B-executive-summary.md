# V1.2B executive summary

Source SHA: `1db1c4878d314a7f7050fcc9630371eada008830`.
Branch: `feature/upms-simple-v1-2b-payment-ux`.

The owner's blank-reference Client Payment failure was reproduced through the archived V1.2A API and frozen UI: HTTP400 TRANSACTION_REFERENCE_REQUIRED, surfaced as the reported generic error. Read-only inspection confirmed original Draft9 was a1000PKR cash receipt with verified opening, matching party version, valid date and no journal/number. It remains unchanged.

Cash client/vendor payments now post without an invented external reference. Successful posting atomically assigns CR-/VP- plus the existing immutable document ID, credits the client or debits the vendor once, and records the durable idempotency outcome. External references remain separate and searchable; cheque identification remains mandatory. No migration, new sequence, new runtime table right or change to DC numbering was required. Existing payment documents are not renumbered.

The approved two-panel reference informed payment cards, status hierarchy, action icons/colors, payment detail rows and activity history. Native minute-level time selection persists HH:mm as local wall-clock time, including optional blank; impossible values fail validation. Existing sidebar/navigation, bottle-only scope, stock/rate/discount behavior, ledgers, reports and public website remain intact.

Acceptance:180 backend,176 frontend,53 original SQL and16 new payment/time SQL reported tests passed. Real payment browser, stock/financial/history regressions, native keyboard time selection, responsive captures, XLSX/PDF inspection, build/lint, zero-vulnerability audits, W06 and extracted-package smoke checks passed. Failed reference-search evidence is preserved; its original assertion passed after a real read-model fix on fresh reserve07.

New synthetic UAT: http://127.0.0.1:3114/management. It includes a valid unposted Draft9 matching the reported scenario, posted CR/VP examples,300bottles,8500client receivable and2000vendor payable. Main3309/upms and demos3110–3113 business fingerprints match; original3306 is untouched. Created test targets01–08 and demo; each populated run is preserved. No merge, deployment or live activation. Owner acceptance remains pending.

Implementation files: server/src/simple-v1/{service,exact,errors,reconcile,register}.js; exact synthetic gates in catalog.js and identity/grants.js; management/src/{PaymentDocument,SimpleV1,BottleLineEditor}.jsx and simple-v1.css. Dedicated SQL/unit/browser tests and bounded V1.2B operator tools accompany the eight handoff reports and approved isolated plan.
