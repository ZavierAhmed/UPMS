# UPMS production deployment guide

This is a preparation guide. W04 did not deploy publicly, change DNS, activate SMTP or configure a real production domain. Read [audit](W04-audit.md) and [verification](W04-verification.md) before release.

## Prerequisites and artifact

Use a supported .NET 10 SDK and Node/npm compatible with Vite 8 on the build machine. Verified locally with .NET SDK 10.0.401 and Node 26.4.0. A deployed server needs the ASP.NET Core 10 runtime (or the .NET 10 Hosting Bundle for IIS), not Node, npm, Vite or the temporary renderer.

From the repository root:

```powershell
npm --prefix upms.client ci
npm --prefix upms.client run build
npm --prefix upms.client run lint
npm --prefix upms.client test
dotnet restore
dotnet build
dotnet test
dotnet publish UPMS.Server -c Release -o artifacts/release
```

Build the frontend before running HTTP integration tests or starting a fresh checkout: those tests load the generated public route manifest. Publishing also runs the complete frontend build through the existing JavaScript project reference. The build generates eleven public HTML documents and a 404 document under `wwwroot/_pages`, plus `public-routes.json`, hashed assets and font licenses. The server dispatches page files internally; they are not directly accessible by URL. No runtime Node renderer is required.

Deploy the entire publish output as one versioned release, including `wwwroot`, assemblies, runtime metadata, appsettings and (on IIS) generated `web.config`. Do not deploy only the client `dist`. Do not copy `node_modules`, `.prerender`, source assets, `.local` outbox data or development secrets. Preserve originals in the source repository. The published development settings file is inactive when ASPNETCORE_ENVIRONMENT is Production; it contains no SMTP credentials.

## Required live configuration

Supply settings through the hosting environment or an external secret store. Double underscores map to configuration sections. These are placeholders, not a proposed production domain:

| Setting | Requirement |
| --- | --- |
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `Website__PublicOrigin` | The real root HTTPS origin, for example `https://YOUR-REAL-DOMAIN`; replace the placeholder. No credentials, non-default port, subpath, query, fragment, loopback or local hostname. |
| `AllowedHosts` | Explicit semicolon-separated hostnames including the canonical hostname. No wildcard. Add aliases only if they are deliberately served/redirected by the proxy. |
| `ASPNETCORE_HTTPS_PORT` | External HTTPS port; defaults to 443. Only local lab verification used 7443. |
| `ReverseProxy__KnownProxies__0` (and additional indexed entries) | Exact verified IP addresses of the directly connected trusted proxy, if using a generic proxy. Leave empty for direct TLS or standard IIS/ANCM integration. |
| `Inquiries__Mode` | Defaults to `Disabled`. Do not enable until SMTP settings and company approval are ready. |
| `Inquiries__PublicOrigin` | Prefer the same real HTTPS origin as Website__PublicOrigin. Blank uses the actual request scheme/host, after trusted forwarding. |

Without Website__PublicOrigin, HTML has no canonical/og:url, both initial and activated pages remain noindex, robots disallows crawling and sitemap returns 503. No localhost URL is substituted. The checked-in AllowedHosts allows only localhost/loopback until explicit live configuration is supplied. Invalid origins, production wildcard hosts, mismatched canonical hostname and the trust-all forwarding shortcut fail startup. Configured canonical URLs are derived from configuration and the route registry, never from untrusted Host/forwarded-host headers. Query parameters are excluded from canonical URLs and sitemap entries.

The temporary `https://www.example.test` origin used in W04 tests is **not a company domain and must not be used for launch**. Its only role was testing absolute URLs on local Kestrel. No public DNS lookup or deployment is required to run those tests.

## Windows / IIS

Install the .NET 10 Hosting Bundle and restart IIS after installation. Create a dedicated application pool (No Managed Code, appropriate x64 process), point the site to the full publish directory and grant its identity read/execute access. Bind the approved hostname to a valid HTTPS certificate. Keep secrets outside publicly readable files and give only the application identity the minimum secret access it needs. Use Production environment settings for the application.

Use the generated ASP.NET Core Module web.config. Do not add a catch-all IIS rewrite to index.html: that would override correct page/API status handling. Route requests through ASP.NET so its HTML dispatch, CSP, cache policy and 404 responses remain authoritative. Standard IIS/ANCM integration supplies its restricted forwarding behavior; do not enable the trust-all environment shortcut or add a second generic proxy configuration unless the actual extra proxy topology has been reviewed. Verify certificate bindings and HTTP-to-HTTPS behavior on the real host. IIS installation, certificate provisioning and live bindings were not exercised by the local Windows Kestrel validation.

## Generic ASP.NET Core hosting and proxies

Run `dotnet UPMS.Server.dll` with the working/content root set to the publish directory, under an unprivileged service identity. A service manager should restart on failure and retain logs without request bodies, SMTP credentials or customer inquiry details. Serve the app at the domain root; subpath hosting is not implemented in this milestone.

For direct Kestrel TLS, configure a valid production certificate using the platform secret/certificate store or Kestrel endpoint configuration. Development certificates are for local verification only. HTTPS redirection runs before pages/assets/APIs, and HSTS applies to HTTPS public hosts (180 days, no preload/subdomain assumption). Framework HSTS exclusions for localhost remain intact.

For a single trusted reverse proxy terminating TLS:

1. Bind Kestrel to a private interface, normally loopback on the same host, and prevent public access to its HTTP port.
2. Preserve the approved Host and forward the original scheme with X-Forwarded-Proto and client IP with X-Forwarded-For. Strip/overwrite client-supplied forwarding headers at the edge.
3. Set ReverseProxy__KnownProxies to the actual connected peer IP(s). The app trusts one hop, only for client IP/scheme; it does not trust X-Forwarded-Host. IPv4-mapped peer forms are supported.
4. Confirm HTTPS forwarding before relying on redirects, same-origin inquiry checks and IP throttling. Never set ASPNETCORE_FORWARDEDHEADERS_ENABLED=true. Do not clear trust lists or trust arbitrary networks. Multi-hop proxy chains require separate review.

A same-host nginx location may use `proxy_pass http://127.0.0.1:5000`, `proxy_set_header Host $host`, `proxy_set_header X-Forwarded-Proto $scheme` and `proxy_set_header X-Forwarded-For $remote_addr`, with an explicitly verified 127.0.0.1 peer in the app and proper outer HTTPS certificate/bindings. This is topology guidance, not a provisioned nginx configuration. Public HTTP and alternate-domain redirects should target the fixed approved hostname. Do not serve a separate SPA fallback or bypass application security/status behavior at the proxy.

## SMTP and inquiry controls

See [W03 operations](W03-inquiries.md). Production delivery remains Disabled by default. DevelopmentFile cannot deliver in Production and private outbox files are excluded from publish. For an authorized later activation, configure Inquiries__Mode=Smtp and all Inquiries__Smtp__Host/Port/TlsMode/Username/Password/From/Recipient values through secrets. Use authenticated TLS (StartTls or SslOnConnect as supported by the provider); do not store credentials in Git. Set the approved sender/recipient and domain authentication with the mail provider, then independently verify an authorized test handoff and delivery. W04 sent no real email.

Existing request validation, JSON bounds, same-origin checks, honeypot, correlation identifiers, 5 attempts per 10 minutes per client IP, and process-local retry/idempotency behavior are retained. SMTP acceptance still does not guarantee inbox receipt. Retry protection is process-local and bounded; it does not provide durable exactly-once delivery across restarts or multiple instances. Treat unknown delivery statuses as uncertain. Do not enable production body/header logging. API responses are no-store and excluded from response compression.

## Content, security and caching

The same-origin CSP permits local scripts, styles, images, fonts and inquiry requests, and blocks inline scripts/object embedding/framing. It permits normal HTTPS WhatsApp/Maps anchor navigation; no third-party iframe/API is required. Fonts are self-hosted with OFL notices under `/licenses/`. Images retain the approved brochure quality and dimensions. Content-type, framing, referrer and permissions headers are set globally. No CORS widening is enabled. Versioned `/assets` files have one-year immutable caching; HTML, sitemap and robots revalidate; unversioned icons/licenses have one-hour caching. Keep only fingerprinted files under `/assets`. Do not enable a CDN override that caches inquiry errors or changes public 404s to 200.

To add a public route: add its React Route/page component in App.jsx and its title/description in pageMeta (or product data for a product detail). `src/data/publicRoutes.js` exports the supported list; build-time rendering exports that list to the server and sitemap. Rebuild the complete artifact and extend HTTP/browser tests. Register future management endpoints independently on the server; do not add them to this public registry. Explicit controllers/endpoints take precedence over the public fallback; unknown management/admin paths get plain 404, not public HTML.

## Launch verification and rollback

With the real approved domain configured, inspect actual HTTP source and headers, not only the DOM:

```powershell
curl.exe -I https://YOUR-REAL-DOMAIN/
curl.exe -i https://YOUR-REAL-DOMAIN/products/buckets
curl.exe -i https://YOUR-REAL-DOMAIN/not-a-page
curl.exe -i https://YOUR-REAL-DOMAIN/api/not-a-route
curl.exe -i https://YOUR-REAL-DOMAIN/robots.txt
curl.exe -i https://YOUR-REAL-DOMAIN/sitemap.xml
```

Expect known pages 200 with page-specific initial HTML; unknown pages/assets and API routes 404; API errors JSON; all eleven absolute sitemap URLs use the real origin; no test or local domains appear. Confirm HTTP redirects to the correct HTTPS hostname/port, HSTS over public HTTPS, strict host validation, content types/cache/compression, no browser CSP/hydration/font failures, all six responsive widths, inquiry validation/draft retention, and unchanged WhatsApp and map destinations. Perform an independently authorized SMTP test only after activation approval. Repeat Lighthouse on live infrastructure and collect real-user measurements; local W04 scores cannot establish production performance.

Keep the previous **complete** publish artifact and its environment/secret configuration. Switch releases atomically or stop the app briefly while replacing it; never mix new HTML with missing hashed assets. Retain old fingerprinted assets at the edge during a cache transition. Roll back the whole artifact and compatible configuration together. Keep SMTP Disabled if delivery configuration is uncertain. Process restarts discard in-memory inquiry retry state: do not automatically resend submissions with unknown outcomes. There are no database migrations in W04.
