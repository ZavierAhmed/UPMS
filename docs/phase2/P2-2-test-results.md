# P2.2 test results

Current acceptance evidence is local MariaDB 10.4.32 and Node 24.22.0. No mock fallback, owner-schema fault injection or destructive reset was used.

| Check | Result and evidence |
| --- | --- |
| Build, backend, frontend, lint | Passed; 119 backend tests, 98 frontend tests in seven files; tmp/w06/p22-release-verify.log |
| Original identity SQL regression | Actual top-level execution: 17 passed, zero skipped; private server/.local/p22/identity-regression.json points to full log |
| Business SQL/browser suite | 16 passed, zero failed/skipped; tmp/w06/p22-review-acceptance.log |
| Backup and restore drill | Passed: all eleven source tables restored privately with matching content fingerprints |
| Main additive migration | Passed; 38 total tables, original identity migration unchanged, every pre-existing identity row preserved |
| Restricted main runtime | Passed: upms_runtime@localhost, exact 36 application-table scopes, no global/audit mutation rights; two tracking tables remain operator-only |
| Department/CSRF boundaries | Real restricted API denials for Inventory/Sales finance and vendor access, Accounts inventory writes, anonymous access and missing CSRF |
| Duplicate/precision/identity | Normalized duplicate codes, canonical variant duplicates, invalid category/dimensions, immutable item identity, referenced unit scale, stale versions and deactivation history tested |
| Idempotency and atomicity | Concurrent claim, conflict, failed-transaction rollback, same-key retry and separate-process replay passed |
| Lock/fault behavior | Real MariaDB timeout and deadlock; actual dropped COMMIT acknowledgement followed by one-effect durable replay passed |
| Numbering | Concurrent unique numbers, independent types, Pakistan year boundary, draft-number denial, rollback candidate handling, duplicate prevention, linked-original preservation and closed/backdated restrictions passed |
| Approvals | Delegated staff self-approval denial, justified admin self-approval, rejection reason, stale hash/version, invalidation and real audit-trigger failure rollback passed |
| Master UI browser | Actual admin login/master creation/duplicate feedback/mobile layout; zero page errors |
| Dependency audits | Root production and complete frontend dependency trees: zero reported vulnerabilities |
| Extracted archive | Production-only install, integrity corruption rejection, eleven public routes, seven private-path probes and SMTP-disabled behavior passed; tmp/w06/p22/review-package-results.json |
| Public browser/Lighthouse | Passed: 66 route/viewport checks, 22 interactions; performance 96/97/97/98; accessibility/best practices/SEO all 100; tmp/w06/p22-public-browser-paced/ |

Main final counts: four confirmed categories; zero inventory items, customers, vendors, money accounts, documents, number issues, posting batches, periods or policy versions. One administrator remains. These are empty business masters, not verified zero stock or financial openings. No real business posting occurred.

The initial nested legacy test invocation returned a recursive-run warning rather than executing tests. This was detected, its receipt invalidated and preserved, and a separately approved new identity schema/account was used for actual top-level execution. Its completed evidence is the only seventeen-test claim. The populated business schema was preserved; later runs append unique synthetic names and nonoverlapping years. Earlier harness failures (lock timing, selector readiness and fast public search input) remain in ignored logs and are not counted as passes.

The SQL COMMIT fault test uses a local TCP proxy only in the dedicated synthetic schema. It forwards COMMIT, consumes the server OK and disconnects the client before acknowledgement. The coordinator returns COMMAND_OUTCOME_UNKNOWN; a new authorized same-key request returns the durable result with exactly one audit effect. This is distinct from merely mocking a transaction or throwing before commit.

The original migration SHA-256 remains `4c4e290353031d7cf3663a9fa6685b0ea5632dad87477a9c1ca3edeeb8e0deef`. Starting Git SHA is `11675eb6fb631935b52d3d728c1a98fa36ea03fc`; final SHA is reported in the milestone handoff after commit. No merge or deployment.

The final public run retained every original assertion and used 50 ms paced keyboard input for the controlled URL-backed search. Two earlier instantaneous-input runs timed out and were preserved; no public source was modified. Canonical bottle-dimension names are additionally deduplicated by the transaction-guarded service after whitespace normalization and case-insensitive comparison; the SQL four-ID composite key is the authoritative variant constraint.

Final handoff date: 2026-10-22 (Asia/Karachi). All listed acceptance checks passed. Independent milestone review remains required; no P2.3 work is authorized.

Final diff review tightened correction links to DRAFT corrections against POSTED originals, preserving approval snapshots; the full real SQL/browser suite passed again. The local listener was restarted with the same signing secret and existing credentials, and returned ready without bootstrap or password reset.
