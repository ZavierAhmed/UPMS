# Return release: manual deployment plan

Do not deploy, migrate the owner database, import company data, change DNS or enable live posting without separate reviewed owner approval. The cPanel compatibility verdict is **BLOCKED / UNVERIFIED**.

## Prepared artifacts

- `artifacts/upms-godaddy-cpanel-node22.zip`: deterministic prebuilt Node 22 blocked private Preview, including return implementation and current management bundle.
- Adjacent `.sha256` and `upms-godaddy-cpanel-release-receipt.json`: actual package bytes, source commit, sorted per-file SHA256 manifest and verification result. Artifacts are local outputs, excluded from Git.
- `docs/simple-v1/evidence/`: synthetic browser screenshots and machine-readable acceptance results. These are review evidence, excluded from the deployment ZIP.

The ZIP has root package.json, production start script and offline build verification script. Install with `npm ci --omit=dev`, run `npm run build` to check manifest hashes, then `npm start` on supported Node 22. It needs no frontend toolchain at runtime. No private config, passwords, tokens, test database exports, local databases or node_modules are packaged. The dedicated GoDaddy entry point always serves a blocked preview; it does not import a database pool or initialize an administrator.

## Preparation and review

1. Use the requested branch and verify its release commit and source file list. Preserve unrelated untracked source assets.
2. Run the Node 22 backend suite, frontend suite, lint, production build and npm audits. Use only isolated synthetic data for SQL and browser acceptance.
3. Build with `node scripts/package-cpanel.mjs` after the release commit. Its receipt records the source SHA and hashes. Repeating packaging from identical committed sources/build output must produce identical ZIP bytes.
4. Verify checksum and manifest using `node scripts/verify-cpanel-package.mjs`. Review `GODADDY-CPANEL-PREVIEW-VARIABLES.txt` separately. No secrets are needed for this diagnostic mode.

## Optional manual diagnostic Preview, after reviewed deployment approval

1. Keep the approved existing site and deployment as rollback material. Do not upload to the public website or change DNS.
2. Select only the reviewed private Node hosting Preview project. Verify exact Node patch, assigned port handling, HTTPS origins and immediate proxy peers.
3. Upload the verified ZIP, configure Preview-only variables, install production dependencies, verify the package and start its diagnostic entry point.
4. Confirm private noindex pages, `/healthz` reporting blocked, disabled sign-in and 503 management API. Confirm Publish credentials/live data were not supplied. The public site is not served by this diagnostic entry point.

## Operational staging and production remain separate future approvals

Obtain all provider observations in [compatibility](GODADDY-CPANEL-COMPATIBILITY.md). A later reviewed implementation must pin the exact endpoint, TLS peer, UUID/ID, schema, runtime account, approved origins and per-table privileges. Prove separate Preview/Publish write isolation and backup/independent restoration. An environment flag does not prove those facts.

Run operational synthetic acceptance on that provider before requesting production initialization. The cPanel database's existing contents must first be inspected read-only; unknown/populated data must be preserved. Initialization requires separate owner authorization and starts OPENING. Administrator creation is private with no default password. Review initial DC and proposed shared-ID DCR numbering, opening fingerprints and backup/restore receipts before a separate LIVE posting approval.

For a code rollback after any real posting, preserve the database and all posted return/journal evidence. Do not deploy an older reconciliation implementation that does not understand `CHALLAN_RETURN`, and do not restore an old backup over new transactions. Prefer a reviewed forward fix.
