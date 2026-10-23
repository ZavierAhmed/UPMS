# Management URL routing and browser proof

Source: feature/upms-management-ui-redesign at 0d1e9bc84578c491be2a504c01a96dbb21c7414f. Delivery branch: feature/upms-ui-navigation-ux-fixes.

History API writes, parsing and permission mapping are centralized in managementRouting.js. Management derives the visible workspace from the URL. Existing modules bridge list, local draft, detail and history state to this router; routing never calls a financial command. Same-URL selections do not push history. Authenticated memory holds filters and local drafts; confidential field values are never stored in URL/history.state or browser storage. Successful saves replace the new-draft entry. Logout clears cached modules, read models and routing memory before replacing the current path. Required-password sessions show only profile, and existing API enforcement remains authoritative.

| Path under /management | Actual destination |
|---|---|
| root | Overview |
| inventory | Stock overview; /documents, /history, /reconcile, /configuration |
| purchases | Purchases; /vendors, /money, /reconciliation |
| sales | Challans; /customers, /configuration, /reconciliation |
| customers | Existing classified customer ledger |
| receipts, cheques, returns, credits, expenses | Respective document list; /reconciliation |
| masters, users, audit, profile | Existing authorized administration/profile workspaces |
| inventory, purchases, sales, receipts, cheques, returns, credits, expenses + /new | Existing draft creation, subject to actual create permission |
| returns/new/receipt, returns/new/inspection | Source-dependent Inventory child drafts; exact receive/inspect permissions |
| cheques/drafts/:id | Saved unposted cheque receipt draft loaded through authorized receipt API |
| transaction workspace + /documents/:id | Existing document review |
| transaction workspace + /documents/:id/history | Existing immutable history within document review |

Unknown routes show internal not-found. Unauthorized paths show access denied. Administration paths cannot masquerade as document routes. Refresh keeps route; a local unsaved draft cannot survive a full reload, so native beforeunload warns. Safe internal transitions retain it in memory. Replacing a draft and signing out with dirty data require confirmation. A source-dependent physical receipt/inspection deep link without retained source state explains how to select its posted source; it never invents a source or posts.

Express serves the management entry only for intended management paths; dotfiles/extensions and absent management assets are404. API paths retain JSON404, public pages retain their prerendered entries. Existing sessions, CSRF and no-store headers remain intact.

## Real Chrome acceptance

server/tools/ui-navigation-browser.mjs passed17 checks against preserved synthetic UAT02: Dashboard→Purchases→Back; Purchases→Sales→Back; Forward; active-item history deduplication; authenticated Expenses deep link; nested refresh; detail/list Back/Forward; Sales filter restoration; unsaved local draft preservation; native exit warning with Cancel; logout Back safety; Inventory denial; internal not-found; mobile drawer selection; role-switch cache isolation; navigation/reopening causes no financial POST; API/static/private404 boundaries. Assertions inspect URLs, visible content, history and actual requests. All100 demo business-table fingerprints remained identical, financial POST count0, page/console errors0. Required-password restriction also passes component and original real SQL identity acceptance; it is not claimed as a separate forced-password Chrome fixture.

Private timestamped receipts: server/.local/p27c/ui-navigation-browser-*.json. Test logs and screenshots: ignored tmp/ui-navigation. First navigation rerun raced the pending filter read; the browser adapter now waits for the real loading indicator before choosing its next row, without changing assertions.
