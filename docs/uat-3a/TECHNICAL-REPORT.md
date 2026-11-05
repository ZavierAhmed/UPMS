# UAT-3A technical report

Date: 2026-11-05. Baseline verified locally and against origin: `80e30710fbbe119be7554e017a5d26487052388f`. Branch: `feature/upms-uat3a-website-content-completion`.

## IMPLEMENTED

- Five original branded A4 information sheets, generated from the same approved `company.js` catalog used by React, with logo, category image, descriptions, verified capacities, inquiry guidance and exact UAT-3 contacts. No source brochure is publicly copied.
- Visible Download Product PDF action on every category detail page; PDF type and actual file size displayed.
- Central generated `productDocuments.json`: versioned URL, filename, MIME, byte count, SHA-256 and image provenance. Public build metadata is generated from the same bytes; validation compares both copies. The existing W07 catalog manifest and new owner-image manifest retain per-image provenance.
- A narrowly scoped Git binary attribute preserves product PDF bytes across Windows checkouts; text normalization must not alter PDF offset tables or manifest hashes.
- Exact five-file allowlist on Node and Vite. Node verifies PDF magic bytes, length, SHA-256, category set, filename and path at startup. Tampered assets fail closed. GET/HEAD only; correct `application/pdf`, attachment filename and `nosniff`. No broad brochure/upload route. PDFs revalidate after one hour; unlike hashed images, mutable v1 filenames do not receive immutable cache policy.
- Owner explicitly supplied and approved `Downloads/New folder` for website use during this task. Three label-on-bottle images and two unbranded carton examples now have 20 local responsive WebPs, without stretching, upscaling, recoloring or removing marks. Original six files remain untouched. The branded carton is preserved but excluded because an unbranded alternative is available.
- About and Manufacturing distinguish confirmed plastic manufacturing, packaging supply/coordination discussions and quotation requirements. No in-house sticker/carton manufacturing assertion.
- HDPE Blow Moulding section with an accessible five-step general process diagram, authoritative technical reference links and an explicit boundary around company-specific equipment claims.
- Approved graphite/orange/warm-white identity, contacts, existing W07 gallery assets, routes, canonical metadata and inquiry security preserved.

## TESTED

| Check | Actual result |
|---|---|
| Full React suite | 323 / 323 passed, 47 files, including existing management component tests |
| Full Node suite | 298 / 298 passed; seven new PDF delivery/integrity tests |
| Public build | 11 prerendered routes plus 404; unchanged management bundle also builds |
| PDF validation | Five valid one-page A4 documents, searchable text, embedded images, verified capacities/contacts, email/WhatsApp links, SHA-256 and deterministic byte-for-byte regeneration |
| PDF visual review | All five full-page Poppler renders inspected; no clipping, overlap, missing logo or conflicting company identity |
| Chrome responsive | 35 route/width cases in local Node and 35 in extracted package, widths 390/768/1024/1440/1920; no horizontal overflow, broken images, page errors or failed requests |
| Chrome download/viewer | 5 / 5 on each of Vite, local Node and extracted Node; 15 actual downloads authenticated by checksum and opened in Chrome's PDF extension viewer |
| Controls/gallery | Download bounds fit parent/viewport in all 25 category/width combinations; sticker/carton Next and keyboard navigation exercised at 390px |
| Owner image variants | All 20 variants served with expected byte sizes in all three runtimes |
| Node package | 252 allowlisted files; independent extraction; locked production-only install; all eleven routes, security probes, disabled synthetic inquiry; corruption rejected |
| Lighthouse | Five pages x mobile/desktop. Accessibility, best practices and SEO 100 throughout. Mobile performance 90-99; desktop 100 |

Backend coverage includes public routes/SEO/canonical metadata, host/proxy validation, inquiry normalization, anti-abuse, concurrency/idempotency, telephone and WhatsApp links, disabled delivery, and identity/security regressions. New tests cover PDF headers, GET/HEAD, unsafe methods, unknown paths, foreign Host, manifest substitution, missing files and corruption.

Evidence: `evidence/regressions/*-verified.log`, `build.log`, `pdf-validation.json`, `package-parity.json`, `lighthouse.json`, `control-bounds.json`, `browser/{local,package,vite}/results.json`, full-page screenshots and PDF renders. Initial sandbox test attempts were stopped after local worker/file-rename restrictions; the authorized reruns completed with zero failures. Initial Chrome instrumentation incorrectly looked for a PDF embed in the top document; the successful reruns detect Chrome's actual out-of-process viewer and retain rendered viewer screenshots.

No PHP, management application, accounting, database, permissions, migration, production configuration or SMTP changes were made. No database tests against owner records were needed or run. The pre-existing dirty UAT evidence files and owner-supplied untracked assets were preserved and excluded from staging.

## OWNER APPROVAL REQUIRED

Owner retest of the five sheets, representative-image captions and work classifications. Owner permission to use the supplied folder is recorded; no claim is made that the depicted lubricant brands belong to Unique Plastic Industry, that the pictured filled products were manufactured here, or that camera provenance has been independently established.

## BLOCKED — MISSING/UNAPPROVED SOURCE

Company-specific HDPE machine photograph, equipment/model/capacity details and confirmed in-house sticker/carton manufacturing evidence remain unavailable. These are OPEN content gaps, not fabricated claims. The general process section is complete independently of those gaps.

## Local delivery

Preview: http://127.0.0.1:3126/ (public-only; management and SMTP disabled). Owner workspaces are untouched.
Review-only archive: `tmp/uat3a/artifacts/upms-node-deployment.zip`, SHA-256 `6382e801f0867f88449838fd6f14ceb419eea90e6af331921d8b96e6b96465b7`. It was assembled before this milestone commit: the deployment manifest truthfully records the checkout baseline and hashes of the actual reviewed bytes. It is not a production release or deployment. Do not substitute it into any existing deployment.
