# Searchable entity selection

SearchableEntitySelect is the sole bottle/client/vendor selector. IDs remain controlled state and hidden form values; display labels are separate. Bottle labels include code, description, quality, colour and packing. Case-insensitive search includes those fields and party name/contact.

Combobox/listbox/option semantics, active descendant, arrow keys, Enter, Escape, pointer selection, clear, required validity, loading and no-results states are supported. Typed text without choosing a result cannot satisfy a required selector. Search changes do not change the selected ID. Saved draft IDs and history navigation are preserved.

Current secure V1 item/party endpoints return their complete authorized directory: neither is a paginated or truncated list. Local filtering therefore covers the actual complete source. There is no asynchronous search response to overwrite a newer query. Shared page reads already discard stale responses; Company Transactions additionally debounces filters200ms and rejects stale generations. If directory endpoints become paginated, replace the adapter with debounced secure server search and cancellation before enabling pagination; do not filter an incomplete page.

Applied to bottle lines/openings/corrections, transaction clients/vendors, ledgers and party reports, plus item filters in current stock/movements. Reference/original-entry and fixed classification controls remain ordinary selects because they are not entity directories.
