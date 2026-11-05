# UAT-3 implementation and verification

Baseline `b0f4b744c5a02c39169ccc05763775bea1d4ce22` was verified against the remote UAT-2A branch before creating `feature/upms-uat3-unified-uiux-website`. Pre-existing owner assets and dirty milestone files are excluded from the release commits.

## Implementation

The PHP Simple V1 architecture and Node public hosting architecture remain separate. No accounting PHP, SQL migration, grant, guard, production configuration or SMTP implementation was changed. Shared management screen standards are in `workspace.css`; the public refinements are in `unified.css`. Existing W07 photography, gallery behavior and responsive image variants are retained.

Management now has searchable, grouped navigation using the caller's original permission-filtered entries, accurate active states, a page-aware top bar, consistent focus treatment, forms, table containers and dialogs. The existing history, draft cache, idempotency keys and permission checks remain the authority. Menu searching does not navigate or change history. Logout retains the existing draft-clear behavior.

The owner clarified the failed cheque acceptance condition as **form fields and buttons not aligned**. Real Chrome geometry reproduced selector/native-label misalignment and a dialog footer constrained to half the inherited form grid. The correction gives paired labels and controls consistent geometry, groups issuing-bank creation with its selector, makes the dialog a single-column form, aligns Save/Cancel, and places attachment clearing beside its file control. Small screens use a single-column form. The cleared acknowledgment no longer says clearance is pending. Cheque acknowledgment printing uses A4 portrait; the register retains landscape and repeated headings.

Public calling numbers come only from `src/data/company.js`: primary `+92 315 2209511`, secondary `+92 314 2113472`. WhatsApp remains `923142113472`. Existing management print contact snapshots remain unchanged.

Actual extracted-package testing found stale packaging allowlists for the retired custom route and the management SVG logo. The allowlists now recognize the eleven current approved routes and built SVGs. The package still rejects unexpected files and checksum corruption. No framework or business API rewrite was needed.

## Evidence and limits

- Local PHP 8.3.36 passed 169 tests and 1,912 assertions. React passed 311 tests across 45 files. Management lint and production builds passed.
- Supported Node 22.23.4 passed 291 backend tests. The system Node 26 run was rejected by existing runtime guards; it is not accepted as hosting evidence.
- The isolated cheque extension HTTP suite passed 17 checks, including concurrency, financial rollback, encrypted evidence, native mutation rejection and recovery. Its schema remains 47 tables / 133 guards; base compatibility remains 44 / 124.
- Real Chrome covers both surfaces at 390, 768, 1024, 1440 and 1920 pixels. Geometry assertions target the owner's field/button defect. Seven cheque workflow browser scenarios and the separate management navigation checks have machine evidence.
- Lighthouse 13.5.0 measured home/products/contact mobile Performance 95/97/98 and desktop Performance 100/100/100. Accessibility, Best Practices and SEO were 100 for each tested page and preset. These are local measurements, not claims about hosted production.
- The extracted Node package uses locked production-only dependencies, rejects deliberate checksum corruption, serves all eleven public routes and retains disabled inquiry delivery. See `evidence/package-parity.json`.

The print fixture includes 24 independently registered custody-only instruments at PKR 123.45 each, adding PKR 2,962.80 without payment recognition. The canonical PKR 50,000 clearance receipt remains distinct from the separately tested PKR 1,000 clearance. Known bank closing is PKR 51,000 from a zero opening. PDF/Excel checks use those independent fixture facts and exact integer arithmetic.

Browser harness corrections are documented rather than counted as product fixes: initial captures preceded asynchronous data, a test used an outdated homepage heading, concurrent test load exceeded a short deadline, and Chrome's network-idle bookkeeping stalled after an Excel download despite no pending requests. Final acceptance waits for loaded report controls and verifies actual content. A preliminary bank expectation omitted the separate PKR 1,000 synthetic clearance; the corrected independent expectation includes both posted fixture sources.

## Protected environments

Read-only before/after fingerprints verify original 5173, Hafta 5180, cheque 5196 and UAT-2A 5197 bindings, records and guards. Their schema counts remain 29/72, 38/103, 44/124 and 47/133 respectively. All writes for tests use separate synthetic databases. No administrator reset, owner migration, hosted connection, production deployment, SMTP activation or operational attachment activation occurred.

Owner acceptance is **PENDING RETEST**, particularly cheque field/button alignment. Automated checks are not owner approval. Malware scanning and protected off-host attachment-key recovery remain operational blockers from UAT-2A.

Exact commands and manual scenarios are in `OWNER-RETEST-GUIDE.md`. The changed-file inventory accompanies this report. The final Git SHA and remote comparison are produced after the release commit in the final handoff receipt; embedding a commit's own hash inside that commit would be circular.

The baseline public screenshots were regenerated from an isolated archive/build of the verified starting commit with images loaded. The final source and built assets were synchronized after the last wording change; final package and artifact checks then ran against those bytes. Prior regression helpers initially wrote their historical evidence paths. Fresh results were retained under this milestone and pre-existing evidence was restored byte-exact; the UAT-3 wrapper now preserves the source replacement patterns when assigning the new evidence namespace.

Final independent recovery restored 276 synthetic rows and five attachments with all 19 negative checks rejected, exact authenticated runtime CRUD and all 133 guards verified. Fifteen targeted registration/dialog, deposit and clearance layout cases passed. Public code/CSS gzip increased by 914 bytes; management remained close to its UAT-2A baseline with no new dependency. Detailed byte counts are in `bundle-comparison.json`. Seven PDFs were rendered and visually reviewed; the pathological 27-row long-name register uses six landscape pages without clipped values or broken heading words.
