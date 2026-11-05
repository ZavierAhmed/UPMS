# Attachment security and recovery

Attachments are optional at registration, deposit and clearance. Each event accepts at most two files of 256 KiB each. PDF, JPEG and PNG are the supported types. Required textual bank evidence, reasons and clearance approval remain mandatory.

## Content handling

The server validates field shape, encoded and decoded size, filename, extension, actual MIME, file signatures and image bounds. Incomplete image tails, malformed PDFs and known active-content markers are rejected. PDF inspection invokes the configured local Poppler `pdfinfo` binary directly with stdin, bounded output and a deadline. An unavailable parser blocks PDF submission. Validation is conservative and can reject some otherwise readable PDFs.

Malware scanning was not performed. Poppler parsing, MIME checks and marker checks provide content validation. Operational attachment activation remains BLOCKED pending an approved scanner and operational security review. The synthetic UAT paths remain protected by the existing isolated-only engine and deployment gate.

## Storage and authorization

Bytes are encrypted with XChaCha20-Poly1305 using a separately held application-derived key. Authenticated metadata binds the random attachment ID, instrument, event, filename, type, length, plaintext SHA-256, actor and timestamp. Copying ciphertext to another event or instrument invalidates authentication.

Ciphertext and metadata reside in the private MariaDB tables, outside the public web root. Filenames are metadata and never filesystem paths. Storage identities contain 128 random bits. The application key is held in the protected environment rather than the SQL tables or archive manifest.

File insertion occurs inside the same business transaction as the exact lifecycle event. Immutable command receipts additionally anchor the complete attachment metadata and ciphertext hashes. Native guards reject runtime UPDATE, DELETE and insertion after the event audit is finalized. The API provides no reassignment operation.

Every download reauthorizes the operator and cheque-view permission, authenticates the content and verifies reconciliation before sending bytes. Responses use attachment disposition, octet-stream, no-store, nosniff and a restrictive sandbox CSP. The local binary bridge preserves these headers. PDFs hide the administrative evidence list, internal timeline and file locations.

## Failure and cleanup

Uploads are read into bounded memory. No plaintext upload or abandoned temporary filesystem object is created. Database rollback removes uncommitted ciphertext and metadata together with any attempted payment and bank movement. A real interrupted HTTP request created no instrument or orphan attachment. A controlled native insert failure after canonical financial writes rolled back the complete command.

Client file errors keep submission blocked until a valid selection or explicit clearing. Stale file reads and duplicate checks are ignored. Fields and selected data remain in the authenticated workspace's memory during navigation and are cleared with the existing logout flow.

## Recovery

The new recovery format includes all 47 tables, 133 guard definitions, directory receipts, encrypted bytes, metadata and immutable attachment claims. The independent restore rechecks original rows, native definitions, source relationships, hashes and authenticated decryption. Negative tests alter attachment identity, source, metadata, ciphertext, key, manifest and recipient. Missing attachments cannot silently disappear from their command claims.

The application key and archive recipient are separate recovery requirements. Windows DPAPI CurrentUser roundtrips, wrong-context rejection and tamper rejection were verified without recovered plaintext files. The pre-upgrade owner environment is protected separately. Loss of that Windows identity or profile requires an approved recoverable key-custody arrangement. Cross-identity and operational off-host attachment recovery are pending. Original production backup infrastructure retains its existing scope.

Runtime SQL credentials alone remain able to fabricate permitted new business rows and actor claims. Application authorization supplies business access decisions. Native UPDATE/DELETE guards and authenticated attachment binding provide their specific protections. Maintenance access and application-key compromise require separate controls and protected recovery evidence.
