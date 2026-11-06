# Hosted routing evidence

P4.1 documented the Apache rewrite order and observed origin 403 denials while external HTTPS sometimes returned unrelated HTML 200. No confirmed private source or secret disclosure was observed. P4.1B runs passive GET probes with certificate validation, response fingerprints and published asset hash checks. It uses a wrong-host state route instead of a session initialization endpoint.

The candidate management rules retain the ACME allowlist, host and HTTPS boundaries, exact gateway routing and explicit private path denials. The static Apache test reproduces the nested dashboard document root. Local acceptance does not establish provider edge or WAF behavior.

Provider correlation is required for unresolved external responses. Supply the timestamp, host, path, status and body fingerprint from evidence/host-https.json. Compare matching origin and edge transactions before changing rewrite rules. Hosted virtual host, edge logs and WAF attribution remain unverified. No live rule edit is part of this release.

The fresh external probes validated TLS but failed asset identity, redirects, private-path denial and API isolation. Both hosts returned 403 for the three dotfile probes and HTML 200 for the other five negative paths, including direct gateway and unknown API paths. Wrong-host API checks also returned 200. HTTP root probes returned 200 without redirect. The fresh origin-network SSH attempt timed out at port 22. The prior origin evidence remains historical.
