# Public hosting decision

| Option | Runtime and inquiry | Security, operations and backups | Cost evidence | Gate |
|---|---|---|---|---|
| A. GoDaddy supported Node | Existing cPanel selector reports disabled and no versions. GoDaddy documents Node 24 and a separately managed app workflow. Confirm the account's exact entitlement, Node patch and persistent process lifecycle. | Verify TLS/proxy trust, secret storage and whether inquiry delivery needs durable storage or a separate backup. | GoDaddy advertises one published app slot on eligible Economy subscriptions. This account's eligibility and renewal cost are unverified. | BLOCKED |
| B. Static public site on current Apache | Prerendered pages, assets and PDFs. Online inquiry remains visibly unavailable until approved server integration. Email and WhatsApp contact links remain available. | Small deployable surface. Preserve approved files and archive rollback. No Express execution, SMTP or public-site database. | Reuses existing hosting allocation subject to provider compatibility. No additional service quote assumed. | Candidate, hosted acceptance BLOCKED |
| C. Managed Node on Render | Render supports Express, pinned Node versions and managed TLS. Verify exact supported Node patch, lifecycle, network restrictions and inquiry behavior on a paid service before cutover. | Separate deployment and TLS/proxy boundary. Keep PHP management and database isolated. Confirm durable store and backup scope if required by inquiry mode. | Use current service pricing, region and usage quote before approval. No billed resources created. | BLOCKED |

Recommend B for the public catalogue if the owner accepts the existing visibly unavailable online inquiry mode. If an operational online form is a launch requirement, prefer C for the existing Express integration once the runtime, cost and SMTP controls are verified. Option A needs an entitlement and supported patch confirmation before it is actionable. Keep PHP management separate in all cases.

- [GoDaddy Node hosting and slot eligibility](https://www.godaddy.com/en-ca/hosting/nodejs)
- [GoDaddy Node application requirements](https://developer.godaddy.com/en/docs/api-users/hosting/app-requirements)
- [cPanel document roots](https://docs.cpanel.net/knowledge-base/cpanel-product/how-domains-serve-content/)
- [Render web services](https://render.com/docs/web-services)
- [Render Node version selection](https://render.com/docs/node-version)
- [Render pricing](https://render.com/pricing)

Render's published Starter comparison lists USD 7/month for 512 MB and 0.5 vCPU compute, before applicable extras. Free instances sleep and block SMTP 25/465/587. Render blocks outbound port 25 on every tier. For a future approved paid deployment verify 465 or 587 with the chosen relay, bind to the provider PORT on 0.0.0.0, and verify trusted proxy hops without enabling broad proxy trust. [Starter compute comparison](https://render.com/articles/render-vs-railway) · [SMTP restrictions](https://render.com/docs/free)

Local Apache verified every prerendered route, all seven approved PDFs, the gallery assets and favicon byte-for-byte, title/description/canonical metadata, hashed asset cache policy, 307 HTTP redirect and explicit negative routing. The production host gate remains separate. Static package content retains the inquiry UI in disabled mode and provides the contact alternatives.

The existing Node entry requires LISTEN_HOST=0.0.0.0 for a Render staging service, explicit ALLOWED_HOSTS, and the provider-assigned PORT. It only accepts exact trusted proxy IPs. Render's documented outbound ranges do not establish ingress proxy addresses. Obtain and verify an ingress trust model before approving option C. Keep the candidate in disabled inquiry mode until SMTP and delivery controls pass separately.
