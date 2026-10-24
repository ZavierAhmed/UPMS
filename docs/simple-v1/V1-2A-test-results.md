# V1.2A test results

All results below are actual local runs on2026-10-24.

| Check | Result | Evidence |
|---|---|---|
|Backend suite|176 passed|tmp/v12a-backend-final.log|
|Frontend suite|173 passed|tmp/v12a-frontend-final2.log|
|Original V1 compatibility SQL|33 passed, fresh01|tmp/v12a-legacy-sql.log|
|Original V1.2 SQL assertions|20 passed, fresh03|tmp/v12a-sql.log|
|Real browser workflow|11 groups passed on fresh04; final11 groups passed on fresh02|tmp/v12-browser-a-{04,02}/results.json|
|Retained financial browser|6 groups passed, cumulative04|tmp/v12a-financial-browser/results.json|
|Stock refresh/history|3 assertions passed, cumulative04|tmp/v12a-freshness/results.json|
|Final built UI read-only browser|7 groups passed, new demo|tmp/v12-browser-a-demo/results.json|
|Responsive geometry|45 combinations; full width, no overflow|tmp/v12-browser-a-demo/layout.json|
|Build/lint|Passed|tmp/v12a-build-final.log;tmp/v12a-lint-final.log|
|Backend production/client dependency audits|0 vulnerabilities each|tmp/v12a-audit-{server,client}.json|
|Public W06|66 route/width checks +22 interactions|tmp/v12a-public.log|
|Public Lighthouse|Performance96/97/97/98; other categories100|tmp/v12a-public.log|
|Extracted deployment package|121files, production install, corruption rejection,7private probes, routes/assets/SMTP disabled passed|tmp/v12a-package-precommit-results.json|
|Actual XLSX/PDF inspection|6 source-matching numeric register rows; client balance4500; non-priced1page note;1page register|tmp/v12-browser-a-demo/export-print-verification.json|
|Preservation|All111 main tables and10 business tables per old demo unchanged|server/.local/simple-v12a/preservation.json;final Verify action|

SQL assertions retain automatic code generation/idempotency/concurrency, duplicate rejection, approved default prices, fixed/percentage discounts and half-up cents, stale-price review, immutable posts, journal reconciliation, stock conflicts, lost-COMMIT replay and exact DC boundaries. No assertion was removed. SQL endpoint/account metadata permits the exact new approved targets. Browser amount expectations reflect requested comma grouping; all original financial values remain asserted.

Real stock browser workflow explicitly verifies opening0 +production500 =available500, quantities200/500 valid,501/600 excessive, empty/zero/negative/fraction invalid, then200 sold with10% discount: subtotal5000,discount500,net4500,stock300. Final review uses latest authoritative stock and blocks invalid finalization.

Initial diagnostics were retained: restricted backend run failed development-file transport; the authorized full run passed. An added unit query ambiguously matched both the bottle input and discount select; it now identifies Bottle explicitly. The first supplementary freshness browser stopped at hidden mobile navigation before any fixture was written. The continuation asserts the freshness fixture is absent, uses1440px navigation, then passes350→355 with unchanged selected ID. No database reset, schema reuse for a fresh run, DDL repair or financial assertion relaxation occurred.

The existing Vite private-bundle warning remains. Owner manual UAT and production activation are outside this acceptance. Final commit/package identity is recorded in the handoff response and ignored package receipt.

All four demo HTTP endpoints returned200 and each served JavaScript asset matched its own frozen file byte-for-byte (`tmp/v12a-serving.json`). The final full browser run on fresh02 passed after the final draft-finalization guard was added; populated04 was retained. No reserve05/06 was created.
