# PHP-7 inquiry parity and operating contract

Baseline: `e5fa64a50ddca96d621a5a0a53f6559f860c52e0`. Authority remains the unchanged
`server/src/inquiries/{api,validation,submissions,delivery}.js` and public React form.

## HTTP and validation

`PublicInquiries` intercepts the public API before Laravel input/session middleware.
Management still runs through its existing HTTPS/origin/session/CSRF boundary. Public
submissions do not open a management database connection, issue cookies, require a
session, or require CSRF tokens. Management cookies, if supplied, are ignored here.

The method/path checks, case-insensitive endpoint and one optional trailing slash,
UUID keys (including nil rejection, case-insensitive replay and version-independent
UUID syntax), JSON content type, encoded-body rejection, 16,384-byte limit, eight
container levels, UTF-8 decoding/BOM handling, field matching/trim, UTF-16 field lengths,
honeypot, errors and category labels follow Express. A null body retains its distinct
message. Unknown fields are ignored after depth checks. No PHP email filter replaces
the source email validator. Validation errors are arrays of messages under field names.

The parser reversibly preserves escaped lone UTF-16 surrogate code units for replay
identity while producing the same UTF-8 replacement bytes as Node for mail/outbox.
Real private-use characters cannot collide with that internal encoding. Tests cover
both surrogate halves, valid pairs, literal markers, quoted/backslash text and conflict
with an actual replacement character. Invalid UTF-8 bytes still fail decoding.

Source configuration defaults are preserved: five attempts per ten-minute window,
15-second delivery deadline, with configured limits bounded to 1–100 attempts and
1–30 seconds. Existing INQUIRY_PUBLIC_ORIGIN/PUBLIC_ORIGIN and SMTP_* names are accepted
when the corresponding PHP-specific INQUIRY_ORIGIN/INQUIRY_SMTP_* settings are absent.

Rate counting precedes key/body validation, but follows origin/content/declarative-size
checks. A rate failure returns 429 and a positive integer Retry-After. Every response
has its own unpredictable 32-hex correlation ID and no-store caching. Symfony adds
`private` to Cache-Control; this is an intentional stricter cache directive, with no
JSON contract difference. Successful replay preserves the inquiry reference and outcome,
but receives a new correlation ID. No exception text, SQL, credentials or mail debug
is returned or logged by the inquiry path.

| Outcome | HTTP | Public discriminator |
| --- | ---: | --- |
| SMTP final DATA accepted | 200 | smtp_accepted |
| Private development outbox saved | 200 | development_saved |
| Disabled/misconfigured/unreachable service before handoff | 503 | delivery_unavailable |
| SMTP 4xx/5xx rejection, including authentication rejection | 502 | delivery_rejected |
| Timeout, uncertain SMTP response or abandoned handoff | 503 | delivery_unknown |
| Different normalized details under an existing key | 409 | idempotency_conflict |
| Journal unavailable/corrupt/full | 503 | busy |

Success explicitly says SMTP accepted delivery and **does not confirm inbox receipt**.
Development success explicitly says no email was sent. Unknown responses include the
original inquiry reference and ask the customer to contact the company before resubmitting.

## Private cross-worker journal

Neither installed PHP runtime has SQLite enabled. The implementation uses native
`flock`, a stable lock file, exclusive temporary files, fsync and same-directory atomic
rename. No SQL table, owner schema, management cache/session table or Redis service is
used. The single-host private directory must support reliable local locking and atomic
replacement; multi-host/NFS operation is not approved. All workers must use the same
absolute INQUIRY_STORAGE path. Keep it outside **every** document root and backup it
privately. Runtime checks reject the Laravel/public root, the current server document
root, symlinked state/lock paths, oversized/corrupt journal structures and public Unix
directory permissions. Windows requires an owner/service-only NTFS ACL; chmod is not
an ACL verifier. The account that can edit the private directory is trusted.

The journal contains SHA256 IP identifiers, normalized request fingerprints, random
references, deadlines, outcomes and expiries; no inquiry body or SMTP secret. Caps are
10,000 fixed ten-minute IP windows and 1,000 inquiry keys, with a two-megabyte journal
read ceiling. Cap exhaustion fails closed. A lock acquisition is bounded to two seconds.
SMTP never holds the journal lock. Files are created with 0600 and directories with 0700
on Unix. Journal temporary files left by stopped writers are removed while holding the exclusive
journal lock before creating another, bounding crash debris without touching outbox files.

A durable pending reservation is written **before** SMTP. Competing workers wait for
the same result rather than sending another message. An abandoned reservation becomes
unknown after its deadline, retaining its reference; it is never automatically resent.
If persisting completion fails, the pending reservation remains, preventing an unsafe
retry. Preserve the journal during worker restarts and backup/restore. Never reset it
to cure a busy/unknown response while delivery may still be in flight.

Intentional Map differences: windows and keys survive request/worker restarts; completed
keys are retained until creation + 30 minutes + delivery budget + three seconds, rather
than exactly creation + 30 minutes. The extra interval avoids expiry while a supervised
handoff is active. At expiry, a key can represent a new inquiry, as in Express. This is
bounded-window deduplication, not permanent exactly-once email. Atomic file replacement
is tested for process/request restarts, not host power-loss guarantees or distributed
filesystems. Restoring stale state can remove recent deduplication receipts; quiesce
delivery and reconcile uncertain references before restoring or resuming.

## SMTP implementation and reviewed difference

Symfony Mailer **7.4.19**, already locked through Laravel, handles SMTP and MIME on PHP
8.3/8.4. SMTP requires credentials, sender, recipient, TLS-on-connect or required
STARTTLS, authenticated capability, certificate/hostname verification and TLS 1.2+.
An optional CA bundle adds trust without disabling verification. Reply-To is the
customer address; subject/reference and plain-text body match the source. No HTML,
attachments, CC/BCC, URL loading or real customer mailbox is used by the tests.

A supervised PHP CLI child enforces the total delivery deadline, including DNS/TLS,
slow SMTP replies and cleanup. Credentials/body pass through stdin, never command-line
arguments. The parent kills a timed-out child and records Unknown. Socket timeouts also
apply in the child. Windows anonymous pipes cannot be made nonblocking, so the supervisor
uses native private temporary file descriptors for stdin/outcome and discards stderr.
They close/delete on normal completion; verify the account temporary-directory ACL,
quota and abnormal-process cleanup policy as well as the journal/outbox directory.
Slow-but-responsive SMTP fixtures prove a total deadline rather than just an idle timeout.
INQUIRY_TIMEOUT_SECONDS retains the source default 15 seconds and range 1–30;
the optional INQUIRY_TIMEOUT_MS override uses the same 1,000–30,000 ms bounds.
`proc_open`, process termination, private temporary descriptors and a matching PHP CLI with the required
extensions are prerequisites. Set INQUIRY_PHP_BINARY to its absolute path where the
FPM directory does not contain the CLI executable. Without these capabilities SMTP
cannot be approved on a shared-hosting account; there is no insecure fallback.

**Explicit conservative transport difference:** a connection lost after the send phase
starts is Unknown in PHP. Nodemailer can report ECONNECTION and the source maps that
to Unavailable even after DATA. PHP retains the unknown/reference guidance because
remote receipt is uncertain. This difference is exposed for review, not hidden as an
exact low-level transport-error match. It does not change accepted/rejected/timeout
response schemas or any management calculation.

DevelopmentFile is permitted only for local/testing APP_ENV and writes the exact
plain-text body to a private exclusive temporary file, fsyncs, then renames to
`outbox/<reference>.txt`. These files contain personal details: use synthetic data,
private ACLs, disk quotas and a reviewed retention policy. Journal caps do not impose
an outbox retention limit. Do not enable DevelopmentFile for a production environment.

## Routing and hosting boundary

INQUIRY_ORIGIN is the approved public HTTPS origin; UPMS_ORIGIN is the separate private
management origin. Public host equality is additionally enforced when configured.
Origin values are normalized for scheme/host/default port, as with URL.origin; paths
and userinfo do not become an origin. Cross-site requests fail. No CORS wildcard exists.
Forwarded host/proto/IP headers are not trusted in this direct Apache TLS layout.

Apache owns static React routes and the public security headers. The reviewed
`deployment/public.htaccess.example` contains host validation, 307 HTTPS redirection,
CSP, HSTS, frame/content/referrer/permissions headers, private-UI denial and API routing.
Replace its PUBLIC_HOST placeholder only during a separately approved hosting review.
The local acceptance profile uses HTTPS-only loopback listeners and the same public
CSP; no DNS, hosts file, installed Apache service or live web root was changed.

## Reproduce

Run `scripts/php-7-inquiries.mjs` with PHP7_BINARY and optional PHP7_ARGS (JSON array).
It creates private ignored test state, starts isolated TLS SMTP fixtures, and runs
Express alongside independent real Laravel-kernel PHP processes. It needs no database.
Tests cover both TLS modes, final acceptance, 550/535 rejection, malformed/uncertain
reply, total timeout, untrusted certificate, post-DATA disconnect, exact plain text,
same-key replay/conflict, eight-worker SMTP/outbox races, abandoned reservations,
capacity/expiry, corrupt/unavailable storage, validation and security envelopes.
Only generated correlation IDs/references are normalized in comparisons.
