# UAT-H1B issue resolution

| Issue | Cause | Correction and evidence |
|---|---|---|
| H1B-01: production cannot finalize without useful opening guidance | UI knew a generic verified flag but not the authoritative posted opening date; the backend error lacked item context | Read-only per-item/date guidance, individual missing/later warnings, explicit opening action, zero-confirmation explanation and actionable item-specific backend error. `browser.json` proves denial without mutations, reviewed opening and successful return/post. |
| H1B-02: oversized unallocated button and uneven employee row | Employee controls inherited the two-column form layout and uncontrolled sizing | Scoped employee control grid, contained 44px buttons, separate unallocated choice/help; existing searchable clear button and popup retained. Five-width screenshots and geometry checks passed. |
| H1B-03: missing/mismatched production grid header | Labor cells were appended to a four-column grid and a fragile selector hid its header | Explicit six-column production layout, matching header, right-aligned money, mobile labels and responsive cards. No labor class/fields in the four other stock/sales editors. |
| H1B-04: generic PKR 0.00 confused with wages | Stock document financial total was displayed as though it described labor | Production-specific quantity/allocation/status summaries; draft estimate versus immutable posted earning; no cash or party-ledger fiction. Both Chrome PDFs show PKR 2,000.00 and no zero-amount card. |
| H1B-05: setup navigation could lose a production or opening-edit context | Opening links were not a complete SPA return workflow | Saved payload/version unchanged; unsaved employee/rates/reference survive navigation. Opening date is bounded, return link remains through Edit Draft, and fresh readiness is required on return. |
| H1B-06: stale preflight could appear ready after a date change | A previous read could remain rendered while another request started | Query-specific readiness is invalidated immediately, focus/explicit refresh is supported, finalization rechecks before posting, and PHP still validates/locks stock. New React stale-date test and backend stale-item cases pass. |

Before/after examples:

- `evidence/before-production-1440.png` → `evidence/after-production-1440.png`
- `evidence/before-production-390.png` → `evidence/after-production-390.png`
- `evidence/before-production-draft.png` → `evidence/production-draft-review.png`
- `evidence/production-posted.png`, `hafta-2000-unverified.png` and `multiple-opening-states.png` show resulting behavior.

Before screenshots use the verified baseline build and a separate synthetic ITM-0001/Ahmed/200×10 fixture. After screenshots use the final build. They do not expose or modify owner records.
