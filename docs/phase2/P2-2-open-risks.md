# Open decisions and review gates

- MariaDB 10.4.32 is the approved local development engine only and is outside upstream maintenance. No production-readiness claim, upgrade or deployment is made.
- Existing owner-created wildcard accounts retain broad global rights. They were preserved unchanged as explicitly required; removing those rights needs a separate owner-authorized plan.
- Canonical type/size/quality/colour values and SMALL F/SMALL R/BIG F/BIG R mappings remain owner-defined. No historical taxonomy or financial data was imported.
- Currency, exact financial precision/rounding, GST/legal printing, operational prefixes, actual cutover/openings, backdating year/closed-period reopening, money-deficit scope and detailed module approval policies remain unresolved. P2.2 blocks their consequences rather than inventing defaults.
- Quantity DECIMAL(20,6), rate DECIMAL(18,6), money DECIMAL(20,2) remain storage proposals. No money calculation or zero balance is silently treated as a verified opening.
- The shared business guard serializes writes conservatively. Measured throughput is local synthetic evidence; finer locks, journal validation and nonnegative stock must be reviewed before P2.3. Future modules must use the coordinator and fixed item/unit identity, never direct uncoordinated writes.
- Posted-document protection currently exists in internal services and append-only issue/history permissions. Database administrators or a compromised runtime credential still have privileged table-update capabilities; this is not cryptographic tamper-proofing. No posting API is exposed.
- The first child legacy test attempt was caught as recursively skipped and its receipt was invalidated. A separately approved fresh schema was used for actual top-level seventeen-check identity execution. Failed test fixtures/logs were preserved; corrected append-only runs use unique names and nonoverlapping synthetic years.
- Initial browser timing failures were retained. Current evidence distinguishes actual executed checks from earlier attempts. No successful unit test substitutes for real SQL or browser evidence.

Recommendation: independent P2.2 review first. Do not begin P2.3, merge or deploy until the owner/reviewer accepts the schema, backups, permission matrix, coordinator contracts and open-policy gates. P2.3 will need reviewed stock journals and movement-to-item/unit references, authoritative exact calculations, nonnegative-stock concurrency tests and a separately approved opening workflow.
