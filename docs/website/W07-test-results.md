# W07 acceptance results — 2026-10-24

- Backend: 180/180 passed. Initial sandboxed transport check failed on local permissions; full permitted rerun passed.
- Frontend: 182/182 passed across 22 files, including six new gallery/provenance tests. Final rerun after correcting legacy jar image dimensions also passed.
- Build and frontend lint passed. Existing management bundle advisory remains unchanged.
- Backend production and frontend dependency audits: zero vulnerabilities.
- Public browser regression: 66 route/viewport combinations across 11 routes at 360/390/768/1024/1440/1920px; original 22 interactions passed, including filters, inquiries and navigation.
- Targeted Chrome gallery acceptance: 61 checks passed; real mobile swipe, keyboard, thumbnails, wrapping, overflow, single image, illustration and intercepted-404 fallback.
- Production-only package: 202 packaged files; clean dependency installation, all public routes, asset response, seven private probes and disabled-delivery synthetic inquiry passed. Final archive is regenerated against the final commit and checked again before push; delivery receipt remains local.

| Page | Performance | Accessibility | Best practices | SEO | CLS |
|---|---:|---:|---:|---:|---:|
| home | 94 | 100 | 100 | 100 | 0 |
| catalog | 96 | 100 | 100 | 100 | 0 |
| detail | 94 | 100 | 100 | 100 | 0 |
| contact | 98 | 100 | 100 | 100 | 0 |

Lighthouse 13.5.0 mobile runs report no accessibility failures. Performance differs from earlier runs (94/96/94/98 here); these are measured values, not a claim of improvement. The richer catalog remains above 90. All measured CLS values are zero.

The unchanged full-page regression waited indefinitely on horizontally offscreen lazy thumbnails. A private copy now marks images eager only during its complete image-decode scan; route/interaction assertions are unchanged. The 404 browser check exposed and verified a real pre-hydration failure fix. This public milestone does not run database-write suites because no database behavior changes.

Evidence: `docs/website/W07-verification-evidence.json`, screenshots `docs/screenshots/w07/`; detailed logs and full Lighthouse reports remain private under `tmp/w07/`. Existing W06 reports were restored unchanged after the package verifier wrote its standard report location.
