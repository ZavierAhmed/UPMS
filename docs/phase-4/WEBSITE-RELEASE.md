# Public website release

Candidate architecture: React/Vite frontend plus a public-only Node/Express process. `server/src/public-app.js` and `public-index.js` exclude management identity and financial routes. The release packager maps the public entry to the artifact startup entry. Management remains a separate PHP artifact.

Node 22.23.4 was used locally. Supported production range is 22.23.4+ or 24.22+ within the declared major ranges. Disabled SMTP fails closed, including injected delivery callbacks. Three focused public-surface tests pass within the final 304-test Node suite.

Only approved Unique Plastic Industry branding and allowlisted published product documents belong in the artifact. Untracked source assets containing other companies are excluded. Source brochures are preserved locally, not implicitly approved for publication.

Separate draft ZIP and hashes are in `evidence/artifacts-draft-verified.json`. They are review artifacts, not a committed final release. `operationalReady:false` and `liveDeploymentAuthorized:false` are intentional. Final committed-source artifacts and extracted-package acceptance remain required before release.

Hosting gate is BLOCKED: actual GoDaddy Node selector is disabled with no available versions. Ask the provider to establish a supported runtime and lifecycle, or separately approve verified Linux Node hosting. No DNS, purchase, process registration or deployment was performed. Keep SMTP disabled until separately configured and tested.

The committed-source candidate supersedes the draft for review. Source 6710201de393595c399de01842bf6cc498dc8665, 156 files, SHA-256 ecc9a5eaadf5b88c6ea39962dba284baf93c57b45de148ecd5a4453fc877d2de. Extracted Node startup, locked production install, all 11 public routes, seven denied paths, corruption rejection and disabled SMTP passed in public-package-smoke.json.

Chrome passed 35 responsive cases, five PDF download/viewer checks and 20 image variants against the extracted candidate. See evidence/website/browser/package/results.json.
