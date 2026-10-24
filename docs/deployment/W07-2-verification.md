# W07.2 verification and handoff

Verified starting SHA: `604c78afc1c16f9ce8df26299201f8bb08b4d192`. Review branch: `feature/upms-w07-2-godaddy-release`.

## Capabilities correction

About → Our Capabilities now uses an authentic two-product composition: blue 20L bucket with lid (Bucket.pdf page 1, Im0.png) and green 20L jerrycan (Bucket.pdf page 3, Im1.png). Reused approved W07 photographs; only whitespace trimming, proportional scaling and layout on white are applied. No generated product, removed marking or invented specification. Existing section structure, typography, capability links and motion remain.

Reproducible tool: `scripts/compose-capabilities.py` using Pillow and the approved local W07 WebPs. Manifest: `upms.client/src/data/capabilities.js`. Responsive outputs at 320/640/1200px are 9,274 / 23,716 / 58,260 bytes respectively. Alt text identifies the actual bucket and jerrycan.

Visually inspected actual Apache-served screenshots: `docs/screenshots/w072/capabilities-1440.png`, `capabilities-768.png`, `capabilities-390.png`. Desktop retains two columns; mobile stacks without overflow. Owner visual acceptance remains pending.

## Verification completed

- Node 24.22.0; backend 179/179 passed; frontend 182/182 across 23 files passed, including management UI and new static-form suppression coverage.
- Public/management builds and frontend lint passed. Management source/runtime/database gates remain unchanged; management asset names retain the W07.1 baseline. Existing management chunk-size advisory remains.
- Backend production and frontend security audits: zero vulnerabilities.
- Public browser regression: ten routes at six widths = 60 passing route/viewport combinations; 20 navigation/inquiry/WhatsApp interactions passed.
- Existing W07 gallery/browser acceptance: 55 checks passed, including keyboard, thumbnails, real mobile swipe and pre-hydration missing-image fallback.
- Static package: 113 files, of which 112 are individually hashed plus the manifest. Extracted and served by a separate loopback Apache instance with actual `.htaccess`; ten public paths pass; private/retired paths are blocked, Jars returns real 404, POST to a public page returns 405, direct internal prerenders are blocked, and the manifest is not downloadable. Gallery controls and permanently disabled online inquiry form passed in Chrome. Archive digest and changed-byte integrity predicate checked.
- Full-stack package: 203 files; independently extracted, clean `npm ci --omit=dev`, checksum/corruption checks, ten public routes, seven private/source probes and disabled-delivery inquiry passed. No operational database connected.
- Thirteen read-only `unique-plastic.com` configuration checks passed: exact-host validation, proxy trust boundary, management disabled, SMTP mode disabled and unchanged production MariaDB/remote-DB/Simple-V1-live rejection gates.
- Deterministic packaging repeated against existing byte-verified rollback copies without differences. Final packages are regenerated after the final commit and validated again; their exact final digests/source SHA are in the local release receipt and final handoff, not the precommit evidence.

| Page | Performance | Accessibility | Best practices | SEO | CLS |
|---|---:|---:|---:|---:|---:|
| home | 94 | 100 | 100 | 100 | 0 |
| catalog | 97 | 100 | 100 | 100 | 0 |
| detail | 94 | 100 | 100 | 100 | 0 |
| contact | 98 | 100 | 100 | 100 | 0 |

Lighthouse 13.5.0 mobile runs report no accessibility failures and zero CLS. The values above are local measurements, not actual GoDaddy hosting performance.

## Release contents and remaining gates

Use `scripts/package-godaddy.mjs` to create `artifacts/upms-public-website.zip` and `artifacts/upms-fullstack-node.zip`, their SHA256 sidecars and `artifacts/W07-2-release-receipt.json`. Full-stack packaging reuses the existing file allowlists and shared deterministic ZIP encoding; adds a valid package main entry without bundling credentials. Static packaging explicitly excludes management/server/private content, supplies exact Apache routes, and marks static mode to disable submission and explain direct contact alternatives. Original user assets, local databases/profiles, recovery material and historical W06 reports are preserved.

The owner identified GoDaddy Web Hosting; exact tier, actual cPanel features and target runtime have not been verified. Current official managed Node documentation says Node 22. It is incompatible with the repository's Node 24 requirement. Current database policy also rejects production MariaDB and remote DB hosts; Simple V1 remains synthetic-only. Do not weaken any gate to deploy. Linux argon2, purchased-host process/proxy/SSL behavior, production authentication/database/restore tests and a separately approved live cutover remain pending.

See `GoDaddy-unique-plastic-deployment.md` for the separate static, conditional Node and private-UPMS procedures. No hosting account was accessed, nothing was uploaded, DNS/SSL were not changed, SMTP was not enabled and no real company balances were imported. Stop for owner review before those actions.
