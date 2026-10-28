# PHP-7.1 release decisions and residual risks

**Verdict: review-ready for isolated synthetic owner UAT; production remains no-go.**
PHP-7.5 is not executed or authorized by this milestone. Safe coordinated corrections
do not establish that the owner's unexamined database is clean or that hosting is ready.

| Decision | Status | Required disposition before production |
| --- | --- | --- |
| Expense party evidence | Fixed and verified | Investigate any actual retained finding; do not repair payloads automatically. |
| SQL/payload dates | Fixed discrepancy/malformed checks; future-date import provenance mitigated by warnings | Review consistent future or unverifiable imported evidence; never change dates automatically. |
| Command format/actor/result consistency | Mitigated with evidence-backed checks | Original fingerprint authentication is unavailable. Owner must accept that boundary or approve separate evidence/architecture work. No claim of authentic original inputs is permitted. |
| Persisted financial types | Fixed and verified | Investigate invalid types/values. Existing corrupted rows are not converted or rewritten. |
| Reversal party snapshots | Fixed for new/mutable drafts; old contradictory snapshots detected | Historical anomalies require explicit review; their correct journals do not authenticate contradictory snapshots. |
| Database posted-row/identity enforcement | Existing application trust boundary; separately approved architecture required for stronger guarantees | Column grants permit document fields and password-change columns. No row-level posted immutability or self-row-only password guarantee is claimed. |
| Full-system UAT/restore/native tools | Pending, release-blocking | Owner worksheet, historical/import review, native Excel/printing and backup/restore signoff. |
| Hosting and production profile | Pending, release-blocking | Approved origins/roots/ACLs/resources, PHP CLI/process capability, file locks/quotas/retention, verified SMTP TLS and reviewed runtime grants. No production DB profile or release package is enabled. |

## Command evidence is not authenticated source input

The schema lacks the original operation/input and an authenticated independent anchor.
A syntactically valid replacement fingerprint can remain matched; the response still
says authenticityVerified false. Id-only results cannot distinguish a draft save from
a party save sharing the same id. Retained actors can be checked for existence and
posted receipts against posting-audit actors, but consistent replacement of both rows
is not authenticated. Missing post receipts are reported as legacy/import-unverifiable
warnings, not silently considered complete command coverage.

This requirement cannot be completed by inventing canonical inputs from current rows.
The forward-only proposal in PHP-7-1-INTEGRITY-REVIEW.md requires separately approved
schema/grants/rollout and possibly an independent authenticated audit anchor. Historical
provenance cannot be manufactured by that future migration. That correction stops at
the design/review boundary here; no migration, trigger or stored procedure is applied.

## SQL privileges: proven limits

Each runtime's fresh synthetic account passed 26 denied operations/constraint checks
and four allowed no-op operations rolled back, with complete business state unchanged.
Denied cases include journal/line/audit/command UPDATE/DELETE, DDL, user enable/display/
insert/delete, role changes and operator/cutover mutation. Duplicate command insertion
is rejected by the primary key. Existing counter updates still work.

The allowed no-ops explicitly demonstrate counter columns, document payload on a posted
row, and password_hash/authorization_version/updated_at. A compromised SQL capability
could bypass application row/actor guards in those columns. API status/version/identity
guards, transaction serialization and unique reversal protection remain verified, but
are not substitutes for database row policies. These boundaries require explicit owner
risk disposition before production, rather than being labelled passed SQL immutability.

## Inquiry uncertainty procedure — preserved PHP-7 boundary

1. Retain the inquiry reference and original idempotency key privately. Treat post-DATA
   disconnect/timeout as Unknown; SMTP acceptance alone never proves inbox receipt.
2. Contact the company by the existing phone/email channel with that reference before
   starting another submission. An operator may inspect the private journal and trusted
   mail-provider evidence for that reference, without exposing credentials/personal data.
3. A matching retry uses the same key and details and replays the retained outcome; do
   not delete pending state, clear the journal or change keys to force another delivery.
4. Expiry, missing inbox mail or a restored older journal does not prove non-delivery.
   Resolve uncertain references with the recipient/operator before any explicitly
   approved new send. Quiesce delivery before journal restore; reconcile in-flight work.
5. Keep single-host private storage/ACLs, temporary-directory ACLs, flock/atomic rename,
   process creation/termination, matching local PHP CLI, disk quotas/outbox retention
   and verified TLS/CA trust. A missing hosting capability is a blocker, not permission
   for an insecure fallback. No live SMTP submissions were used in PHP-7.1.

## Go/no-go

Any unexplained mismatch, provenance warning without disposition, duplicate financial
effect/email, unauthorized privilege, insecure transport or failed restore blocks
acceptance/release. A clean synthetic matched result does not authenticate missing
history. Production also remains blocked by the existing no-production-access gate and
the absent owner/hosting signoffs. No real financial posting, administrator reset,
deployment, DNS change, live mailbox test or deployment archive is authorized here.
