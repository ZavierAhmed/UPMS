# Protected recovery preflight — isolated only

## Architecture inspected, not executed

The existing `deployment/operations/backup-offhost.ps1` obtains a read-only remote snapshot, downloads ciphertext into an owner/SYSTEM-only ACL directory, verifies SHA256, and authenticates/decrypt-validates through `backup-client.php` in memory. The remote exporter uses a sealed recipient key and authenticated secretstream with a final tag. Its supported legacy contract is **UPMS_SECRETSTREAM_V1, 20 tables / 45 guards**. The Windows private recipient uses DPAPI CurrentUser and remains local; only the public recipient is uploaded. A lock prevents overlapping runs, success is retained in last-success, and a failed phase writes sanitized last-failure evidence.

The recurring automation is a separate caller; its live schedule and current execution were not inspected or changed in this milestone. Static code inspection finds no automatic archive-pruning policy in the Run path. Actual retention/quota, recovery objectives, alert delivery, computer-awake availability and escalation policy remain owner/operations gates. No existing archive, key, protected production path or schedule was touched or replaced. Baseline comparisons of the collector, consumer and PowerShell runner are in [preflight evidence](evidence/release-preflight.json).

## New isolated capability

`FinancialArchive` adds **UPMS_ISOLATED_FINANCIAL_ARCHIVE_V1**, an authenticated encrypted envelope around the existing P3.2B3 refund-aware snapshot. Its encrypted manifest binds the complete canonical snapshot digest, source target, policy version, 29-table/72-guard identity and cumulative plan hashes. Existing recovery checks all table DDL, rows/columns, FKs/orphans, guard definitions, money movement/audit/source evidence, expense history/snapshots and refund links before/after isolated restore. It refuses nonempty restore targets. No new production route invokes this class.

Sealed-box encryption verifies ciphertext integrity for the recipient; it is not a source signature. Anyone with a public recipient can encrypt a different consistent snapshot. Trusted collection, source identity and separately verified archive/checksum provenance remain necessary; this synthetic envelope does not certify independent production evidence.

`p32b4-recovery.mjs` and `p32b4-dpapi.ps1` use new synthetic recipients and owner-protected ignored local fixture files only. The actual Windows test protects/unprotects the synthetic recipient with DPAPI CurrentUser, rejects modified protected bytes and wrong entropy, and uses the unprotected recipient for authenticated archive acceptance. Temporary synthetic key representations remain in the private ignored fixture directory; plaintext database snapshots are not written to disk or printed. No production key is read.

The isolated archive test rejects truncated/corrupted ciphertext, wrong recipient, unsupported envelope version, inconsistent manifest and the legacy snapshot passed to the newer envelope consumer; a missing archive is rejected separately. This intentional version separation preserves the unchanged legacy production consumer. The original P3.2B3 snapshot path is also restored independently; the newer envelope does not silently reinterpret legacy archives.

The successful fixture restores **231 synthetic rows, 29 tables, all 72 guards** and verifies that pre-backup source, stock, party and money rows reproduce exactly. All recovered master, money/source and refund reconciliation blocks match. See [actual Windows and recovery results](evidence/recovery.json).

## Remaining gates

| Gate | Status | Reason |
| --- | --- | --- |
| Real Windows CurrentUser DPAPI roundtrip/tamper/context | PASS | Executed on Windows, not simulated cross-platform |
| Synthetic encrypted 29/72 recovery and rejected invalid archives | PASS | Actual isolated PHP/MariaDB tests |
| Existing legacy production implementation unchanged | PASS | Source comparison; this is not a new live-archive test |
| Access rejection under another Windows account | BLOCKED | A second authorized identity was not available; wrong entropy is not misrepresented as another account |
| Genuine protected off-host production archive independently restored | BLOCKED | Production/archive access is not authorized in this milestone |
| Hosted streaming collector + DPAPI consumer upgraded to 29/72 | BLOCKED | This milestone adds an isolated, in-memory envelope prototype, not a live streaming replacement |
| Live schedule, retention, failure-notification delivery and quota | BLOCKED | No live schedule/retention/alert inspection or mutation performed |

Memory-bound synthetic snapshot tests are not operational proof for production size, RTO/RPO, streaming failure handling or genuine independent recovery. Deployment remains blocked until those gates and explicit owner approval are satisfied.
