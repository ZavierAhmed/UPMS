# V1.2 corrective handoff

Starting SHA16dbac8064c895db14275c467703170348cd6dd9 was verified after fetching origin/feature/upms-simple-v1-1-usability-ledger. Branch: feature/upms-simple-v1-2-entry-fixes. Existing untracked source logos remain unstaged and unpublished.

The owner confirmed using3110. All three reported failures were reproduced with the original V1 API and the shared V1.1 frontend. Each rejected only the empty reason field.3110/3111 now serve their own frozen frontend builds, and V1.2 has a distinct3112 UAT/cookie and an interface-version check before browser mutations. See the root-cause report.

V1.2 adds concurrency-safe immutable ITM codes, nullable default selling prices, duplicate-line rejection, authoritative stock limits, readonly automatic challan rates, explicit stale-price refresh and exact bill discounts. Line headings replace repeated numbered labels. Existing reports/ledgers use discounted final sale totals; approved delivery-note printing remains non-priced.

Only fresh approved V1.2 schemas receive the additive extension. Protected main and existing populated demos are not migrated. No merge, deployment or company activation. Stop for owner testing after handoff.
