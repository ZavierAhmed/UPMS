# Inquiry mode decision

Mode A is the static review release. Its static metadata makes the form visibly unavailable. Phone, email and WhatsApp remain usable. The static Apache rules reject API paths and Chrome verifies the disabled fieldset. Release owner approval is required for catalogue-only publication.

Mode B would use the existing Laravel PublicInquiries middleware through an isolated public PHP gateway. The service already implements JSON and body limits, origin checks, validation, honeypot, per-IP rate limits and idempotency. The PHP delivery code defaults to Disabled and uses a private storage root. DevelopmentFile is permitted only in local or testing mode. Reuse this implementation rather than introduce another storage or mail system.

Local PHP compatibility and existing inquiry contract tests support further staging. Mode B remains BLOCKED for publication until the actual web SAPI, separate public/private route boundaries, private storage permissions, trusted origin and client-IP handling, and approved SMTP delivery are independently verified. The public form may be enabled only on a reviewed package with an operational endpoint. A disabled or uncertain delivery response must never show success.

The existing public gateway template is deployment/layout/public/inquiry.php. It requires the exact public HTTPS origin and exact inquiry path before loading the private Laravel backend. A Mode B staging overlay would explicitly route only the exact inquiry endpoint to that gateway, deny direct gateway access, and use an isolated private storage directory. React covers unavailable delivery and the static disabled form. A full hosted Mode B package remains blocked pending delivery acceptance.
