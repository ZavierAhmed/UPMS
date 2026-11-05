# Responsive and accessibility acceptance

Both surfaces were tested in actual Chrome at 390, 768, 1024, 1440 and 1920 pixels. Public evidence covers home/about/products, all five category pages, manufacturing, industries, contact and missing/retired routes. Management evidence covers dashboard, items, production entry, challans, clients, vendors, money accounts, Employee Hafta, expenses, reports and cheque register/entry.

The public page and management shell must have no horizontal overflow. Financial tables may scroll inside their own bounded wrapper. Navigation is collapsible on small screens, authorized entries remain filtered and Back/Forward is exercised. Focus styling, meaningful headings, native labels, live statuses and reduced-motion behavior are retained. Dialog bounds, label/control coordinates, control minimum height and action-row alignment are measured separately in `form-alignment.json`.

General before/after screenshots and targeted final cheque screenshots are in `evidence/browser`. Initial loading-only captures were rejected and replaced with loaded-state checks. Frozen management asset snapshots avoid invalidating a running test when another build writes new hashed files.

Lighthouse is a partial automated accessibility assessment, not a full screen-reader or device certification. Owner device retest remains necessary, especially the reported form alignment and mobile keyboard experience. Local scores and run warnings are recorded without asserting hosted equivalence.
