# Updated release gates

| Gate | State | Evidence or next action |
|---|---|---|
| Baseline | PASS | Local and remote 2899adb90ba66600776ef8324a0480f03082dede verified. |
| External TLS, asset identity and redirects | PASS | P4.1 external receipt. |
| External private path and host separation | FAIL | Unexpected 200 remains externally. Origin-network probes deny tested paths. Provider correlation required. |
| Three original management pages | PASS | Challans, Vendors and Cheques loaded without errors in all five viewport widths on the corrected 60-case Chrome run. |
| Targeted filter and navigation | PASS | 768 px filter entry and clear passed on all three pages. Cheque rows restored to 32. Vendor and challan fixture lists were empty. No unsafe HTTP requests. |
| Single-session management functional Chrome | PASS | All 60 route and viewport cases, mobile navigation and reduced motion passed. No failed API calls, alerts or unsafe requests. |
| Overlapping management browser load | FAIL | An overlapping run returned a correlated Money Accounts PDO lock timeout HTTP 503 at 1920 px. Standalone retry passed. Production concurrency acceptance remains open. |
| Static catalogue and candidate Apache routing | PASS | Local Apache verified routes, seven PDFs, gallery assets, metadata, caching, redirects and negative paths. |
| Hosted staging | BLOCKED | Independent hosted gateway, external route denial and host platform still require validation. |
| Dependency-only review ZIP | PASS | Archive and all 38 change entries verified locally. Hosted before hashes and web SAPI remain unverified. |
| PDF and Excel regression | PASS | Four Chrome PDFs, 11 rendered pages and two verified workbooks. |
| Fresh application and financial regression | PASS | Node 304, React 325, PHP 169 and all 12 financial/security scenarios. |
| Independent recovery | BLOCKED | Actual offline USB and separate operator/device restore and signed acceptance. |
| Production Node entitlement | BLOCKED | Existing selector disabled. Decision and provider evidence required. |
| Operational inquiries | BLOCKED | Static candidate explicitly disables online submission. Operational integration and SMTP require review. |
| Current production dependency remediation | BLOCKED | Review the isolated patch, verify hosted web platform and obtain separate publication approval. |
| Operational migration | BLOCKED | Production contract, receipts, reconciled business inputs, independent recovery and staging. |
| Attachments and activation | BLOCKED | Separate protection and acceptance requirements remain. |

The standalone Money Accounts retry passed. Keep the prior correlated HTTP 503 as a concurrency failure until the overall release acceptance criteria are met.
