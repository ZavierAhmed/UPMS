# W03 inquiry API and operations

Unique Plastic Industry is the only represented company. This feature adds a focused inquiry handoff, not customer accounts, sales, inventory, payments or a management database.

## API contract

`POST /api/v1/public/inquiries`

Headers: `Content-Type: application/json`, `Idempotency-Key: <non-empty UUID in D format>`. Use a new key for a new intentional inquiry. Preserve the same key and unchanged payload when delivery is uncertain.

```json
{
  "customerName": "Test Buyer",
  "companyName": "Example Company",
  "email": "buyer@example.test",
  "phone": "+92 300 1234567",
  "productCategory": "buckets",
  "quantity": "500",
  "capacity": "20L",
  "message": "Please discuss packaging requirements and a sample.",
  "website": ""
}
```

The sample is synthetic, not a real customer. Do not use a configured production SMTP relay during automated testing.

| Field | Rule |
| --- | --- |
| customerName | Required; 1–100 characters after trimming; single line |
| companyName | Optional; at most 150; single line |
| email | Required; at most 254; valid single mailbox without display-name/header syntax, whitespace or control characters |
| phone | Required; at most 40 characters, 7–20 ASCII digits; spaces, +, -, dot and parentheses allowed |
| productCategory | Required; exactly `buckets`, `cans`, `jars`, `containers` or `custom` |
| quantity | Optional; at most 80; text for approximate requirements, not an order |
| capacity | Optional; at most 80; requirements text, not an assertion of availability |
| message | Required; 10–4000 characters; multiline plain text |
| website | Honeypot; must be empty |

Control characters are rejected except CR/LF/tab in the message. JSON body size is limited to 16 KiB, including chunked bodies; JSON nesting depth is limited to 8. Long multi-byte messages can reach the byte limit before the character limit. Content encoding is rejected. Only JSON is accepted; this endpoint does not process file uploads or URL-encoded forms.

## Accurate handoff states

HTTP 200 is returned only after the configured transport confirms its handoff:

```json
{
  "status": "smtp_accepted",
  "message": "Your inquiry was accepted by our mail server for delivery to our team. Inbox receipt is not yet confirmed.",
  "reference": "32-character-hex-reference",
  "correlationId": "32-character-hex-correlation"
}
```

`development_saved` instead means the local development file was written/flushed and moved to the outbox; its response explicitly says **No email was sent**. The interface distinguishes both states. No simulated production success exists.

Errors use `{code,message,correlationId,errors?}` with optional field-to-message-array validation errors. `X-Correlation-ID` is generated server-side on API requests, and API responses use `Cache-Control: no-store`.

| Status | Examples |
| --- | --- |
| 400 | Validation errors, malformed JSON, invalid/missing UUID key, rejected honeypot |
| 403 | Cross-origin or cross-site POST |
| 404 | Unknown API path/method; never the public SPA shell |
| 409 | Same request key with different validated details |
| 413 | Request body limit exceeded |
| 415 | Unsupported media type or content encoding |
| 429 | Rate limit exceeded; `Retry-After` supplied |
| 502 | SMTP explicitly rejected the message |
| 503 | Transport missing/unavailable, bounded cache full, or delivery uncertain |
| 500 | Unexpected request processing failure; safe generic text |

`delivery_unknown` is intentionally different from a rejection: a timeout or interrupted SMTP connection after sending might occur after acceptance. Contact the team with the support reference before submitting a different inquiry. Internal exceptions, SMTP response text, stack traces and paths are never returned.

## Configuration

Settings are bound from `Inquiries` in standard ASP.NET configuration. Values below describe names and requirements; no actual credentials are committed.

- `Inquiries__Mode`: `Disabled` (base/production default), `DevelopmentFile`, or `Smtp`.
- `Inquiries__PublicOrigin`: exact public origin, for example `https://your-approved-domain.example`. No production domain is assumed. When empty, the request scheme/host define the expected same origin. Use the explicit origin behind a TLS-terminating proxy.
- `Inquiries__TimeoutSeconds`: delivery deadline, default 15, clamped to 1–30 seconds. Frontend deadline is 40 seconds. No automatic delivery retries.
- `Inquiries__RateLimit`: per remote IP per ten-minute fixed window, default 5, clamped to 1–100. Queue length is zero.
- `Inquiries__Smtp__Host`: SMTP host.
- `Inquiries__Smtp__Port`: valid port; default 587.
- `Inquiries__Smtp__TlsMode`: `StartTls` (required STARTTLS) or `SslOnConnect` (commonly port 465). Opportunistic/plaintext SMTP is not supported.
- `Inquiries__Smtp__Username`, `Inquiries__Smtp__Password`: required SMTP authentication. Supply through deployment secrets/environment; never source files.
- `Inquiries__Smtp__From`: verified sending mailbox for the relay.
- `Inquiries__Smtp__Recipient`: the approved business inquiry mailbox.

All SMTP fields must be configured correctly before the transport becomes available. Certificate validation uses MailKit defaults; there is no bypass. From/To and subject are fixed by server configuration; the validated customer email is Reply-To. Notifications are plain text. User content is not inserted into HTML or routing headers. A successful SendAsync means SMTP acceptance; inbox receipt, spam-folder placement and human response are not guaranteed.

Set `ASPNETCORE_ENVIRONMENT=Production` for production. Configure HTTPS at the host/proxy, approved origin/hostnames, SMTP sender verification and credentials. Verify the approved recipient and relay behavior before opening online inquiries. This milestone did not send an external email or verify real credentials. Retain phone/email alternatives while transport is disabled.

Use deployment-managed secrets or ASP.NET user secrets for local SMTP experiments. For user secrets, initialize the server project with `dotnet user-secrets init --project UPMS.Server`, then set configuration privately; do not paste secrets into repository files or logs. Tests require no SMTP configuration.

## Development-safe outbox

`appsettings.Development.json` explicitly selects `DevelopmentFile`. This mode is allowed only when the host environment is Development; selecting it in Production/Testing returns unavailable. Tests use an explicitly injected fake under Testing rather than enabling a simulated production transport.

Outbox: `<server content root>/.local/inquiry-outbox/<reference>.txt`. Files are written using a temporary file, flushed, then moved before success is reported. The folder is outside wwwroot, Git-ignored, and explicitly excluded from project publishing. Build production artifacts into a clean output directory; do not package a reused development output folder containing runtime outbox files. No mail is sent. These files contain entered contact information and messages: restrict local access and remove them when no longer needed. Do not treat this local development feature as a production queue, retention policy or customer database.

Development with the existing integration:

```powershell
# root
$env:ASPNETCORE_ENVIRONMENT='Development'
dotnet run --project UPMS.Server --launch-profile https
# separate terminal, upms.client
npm run dev
```

The existing SPA proxy may start Vite automatically. The Vite `/api` proxy forwards requests to the existing .NET target, normally `https://localhost:7081`, without broad CORS. Public production pages and API are served by the same .NET site after publish. A Vite-only preview has no API server/proxy and cannot confirm an inquiry; use the published .NET site or integrated development setup for submissions.

## Abuse, privacy and retry boundaries

- ASP.NET per-IP fixed-window rate limiter; no forwarded-IP header is trusted by this code. Configure only trusted reverse proxies at deployment if forwarded client IPs are required; otherwise a proxy's shared IP receives the limit. Do not blindly trust X-Forwarded-For from the internet.
- Exact Origin verification plus Sec-Fetch-Site rejection for cross-site POST, including trailing-slash/case variations of the route. No permissive CORS and no credential-bearing customer session. JSON-only requests prevent simple cross-origin form posts. Clients without browser Origin headers can use the public JSON API, subject to the same validation/rate limits.
- Honeypot, body/depth/field limits and fixed validated mail headers reduce basic abuse; these controls are not a comprehensive DDoS defense or a captcha service.
- A bounded process-local cache holds at most 1000 UUID-keyed submissions for 30 minutes. Matching retries and concurrent requests share the same delivery task and reference; changed content with the same key is rejected. A full cache returns unavailable rather than evicting active retry protection.
- Outcomes, including failures/unknowns, are cached. Known no-handoff failures let the frontend start a fresh attempt; uncertain outcomes keep the original key and body, even if a later retry is rate limited. A changed inquiry after uncertainty is blocked in the UI. Drafts and retry keys live only in component memory; reload/navigation can lose them.
- This is not exactly-once delivery across restarts, expiry, new keys or multiple app instances. Before scaling to multiple instances or promising durable intake, propose a shared durable outbox/queue and operational retry policy separately. W03 deliberately introduces no database or queue.
- Once a valid submission begins handoff, it uses a server-owned deadline/shutdown token rather than the disconnected browser's token. This allows the same-key retry to retrieve a completed outcome if the first response was lost.
- Ordinary application logs contain only outcome/reference/correlation identifiers, not inquiry bodies, email addresses or phone numbers. SMTP protocol logging is not enabled. Keep generic request-body/HTTP logging disabled for this endpoint at deployment.

## Verification

Frontend: `npm ci`, `npm run build`, `npm run lint`, `npm test`. Backend: `dotnet restore`, `dotnet build`, `dotnet test UPMS.Server.Tests`. Publish: `dotnet publish UPMS.Server -c Release -o tmp/w03/publish`.

Backend tests use WebApplicationFactory and a fake transport in an explicit Testing environment; production-mode tests reset SMTP settings to empty. No external messages are sent. They cover field/categories/lengths, JSON/body limits, honeypot, origin boundaries, rate limiting, duplicate/concurrent keys, unavailable/rejected/unknown transport results, timeouts, log privacy and precise SMTP acceptance semantics. Actual file writing and the HTTPS proxy were also checked locally with synthetic input.

See [W03 verification](W03-verification.md), [browser evidence](W03-browser-results.json), and [Lighthouse summary](W03-lighthouse-summary.json).

Primary references used: [ASP.NET rate limiting](https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit?view=aspnetcore-10.0), [integration tests](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests?view=aspnetcore-10.0), [MailKit SendAsync](https://mimekit.net/docs/html/M_MailKit_Net_Smtp_SmtpClient_SendAsync_1.htm), and the [Microsoft PKCS security advisory](https://github.com/dotnet/runtime/security/advisories/GHSA-846f-f764-76mx). MailKit's transitive System.Security.Cryptography.Pkcs is pinned to patched 10.0.13; final restore/build has no NuGet vulnerability warnings.
