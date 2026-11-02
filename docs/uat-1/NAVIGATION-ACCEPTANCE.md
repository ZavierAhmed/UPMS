# Browser navigation acceptance

The active code is PHP Simple V1 (`SimpleV1.jsx` / `MoneyAccounts.jsx`), not the older Management router. Inspection found `MoneyAccounts.url()` replacing the parent entry whenever a child view opened. The parent Simple V1 component also retained its earlier route while the money component changed local state.

Meaningful subview changes now push a new URL only when it differs and emit the existing `v1route` event. Money Accounts is keyed to the actual Simple V1 route, so Back/Forward remount from URL state rather than retaining the wrong subview. Account/date filters still replace the current entry. No effect writes another history entry on rerender. Unsaved fields remain in the authenticated parent draft map; intentional page changes retain existing confirmation/busy protection.

The browser test uses actual `page.goBack()` / `page.goForward()`:

1. Open client ledger, click Money Accounts, click Internal transfer.
2. Back restores the account cards and exact parent URL.
3. Forward restores the transfer form and `view=transfer` URL.
4. Enter 0.17 without posting. Back/Forward restores 0.17.
5. Typing/rerendering does not change `history.length`.

The same run opens statement links, document details, challan listings/search, expense entry, weekly expense reports and financial documents. Dialog keyboard tests cycle focus inside the native modal and verify opener restoration on Escape/Cancel. Filters remain non-navigational replacements; this change does not rewrite the legacy Node router.

See [actual navigation and response evidence](evidence/browser-after.json), [restored transfer screenshot](evidence/after-transfer-forward-restored.png) and [owner retest steps](OWNER-RETEST-GUIDE.md). Automated navigation never posts a real transfer or accesses owner UAT/production.
