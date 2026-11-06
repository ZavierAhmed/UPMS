# Attachment security

Operational activation: **BLOCKED; disabled**.

The optional cheque extension encrypts attachment ciphertext in private SQL, not in the public document root. Current limits are two files per event, 256 KiB per file, PDF/JPEG/PNG, constrained names and image dimensions, PDF parser timeout and active-content checks. PDF parsing is not malware scanning.

Fresh isolated tests covered authorized access, denial, ciphertext and metadata tampering, missing metadata, wrong application key/recipient and encrypted cumulative recovery. These tests do not establish an operational malware scanner. `malwareScannerUsed:false` must remain explicit.

Before enablement require a tested malware/quarantine pipeline, content and resource limits, authorization and audit, protected retention/deletion policy and independently recoverable application key. Attachment keys depend on the application key; escrow it separately from database archives and Git. Current recurring production backup is still the original 20/45 collector, not an approved future 47/133 backup.

Keep `UPMS_CHEQUE_EXTRAS_ENABLED=false` and operational attachments disabled. Core cheque accounting policy approval does not authorize attachments or publication of private banking evidence.
