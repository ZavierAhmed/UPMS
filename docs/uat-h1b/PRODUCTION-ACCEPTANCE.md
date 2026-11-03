# Production acceptance evidence

The required scenario was exercised in real Chrome through the actual local Node adapter, Laravel PHP kernel and isolated MariaDB. No mocked business API or owner database was used.

| Step | Observed result |
|---|---|
| Create ITM-0001 and Ahmed | Active item has no verified stock opening |
| Save 200 bottles × PKR 10.00 draft | PKR 2,000.00 estimated labor; no stock or earnings posted |
| Attempt finalization without opening | Disabled UI with named warning; direct API returns 409 `STOCK_OPENING_UNVERIFIED`, ITM-0001 guidance and separate request reference; document/stock/command/labor fingerprints unchanged |
| Set Up Stock Opening | Selected item and production date carried; zero is entered by the test operator, not automatically supplied |
| Review and post opening 0 | Confirmation required; date is on/before production; explicit stock opening posts normally |
| Return to production | Original saved payload/version identical, including employee, quantity, rate and reference; fresh READY check |
| Finalize production | Primary stock **200 bottles**, one immutable earning **PKR 2,000.00**, document POSTED |
| Financial effects | **0 money movements**, **0 customer/vendor journal movements** |
| Retry same post | Original idempotent result; still one earning for the production |
| Hafta | Earned **2000.00**, closing payable **null / UNVERIFIED**, because labor opening was not invented |

Additional cases passed: valid nonzero opening, three simultaneous opening states (READY/LATER/MISSING), duplicate opening rejection, later-date rejection, inactive item, reactivated-but-stale draft, unallocated labor, rejected unconfirmed zero rate, confirmed zero-rate posting, and unsaved employee/rate/reference preservation through setup navigation. Broader existing integration proves actual stock-before-earning and money-before-settlement failure rollback and concurrency/idempotency protections.

Responsive screenshots cover **390, 768, 1024, 1440 and 1920**. Geometry asserts no horizontal page overflow, consistent input/button heights and desktop alignment. Add/remove controls and non-production editor isolation passed. Both real Chrome production PDFs were rendered and visually inspected; independent arithmetic verifies 200×10.00 = 2000.00, with no zero-money substitution, blank page or clipped text.

`final-checks.json` records genuine encrypted recovery of this acceptance fixture: **34 tables, 88 guards, 147 rows**, exact row/reconciliation/foreign-key checks passed, wrong recipient and corrupt ciphertext rejected, old consumer refused the new format. This is a point-in-time snapshot before later read-only browser checks. The independent broad regression restored 656 rows of its own larger fixture; these are different databases and do not represent competing counts.

Actual supporting files: `browser.json`, `final-checks.json`, `opening-edit-return.json`, `print-verification.json`, `full-integration/`, `employee-browser/`, `startup-browser/`, the four financial regression folders and `validation.json`. Private session material and encrypted test archives stay in the protected ignored fixture directory and are excluded from Git.

No production connection, operational backup change, schema/guard change, administrator reset or mutation of either owner's existing business records was authorized or performed.
