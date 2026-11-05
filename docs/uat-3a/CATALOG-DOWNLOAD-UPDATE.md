# Owner-requested catalog download update

## Owner instruction and mapping

The owner explicitly requested the PDFs newly staged in `C:/Users/zasah/Downloads/New folder` and clarified that both Lubricant Cans and Plastic Cans should use `Company_Profile_New_HD_Bottles (1).pdf`.

- Plastic Buckets: `Bucket.pdf`, 3 pages.
- Lubricant Cans: bottles brochure, 25 pages.
- Plastic Cans: same bottles brochure, 25 pages.
- Stickers and Cartons: original UAT-3A information sheets, unchanged.

The download action remains beside the existing “Packaging around your requirements” content on each relevant detail page. File sizes now use MB for large catalogs.

## IMPLEMENTED

The provided catalogs were reviewed across all 28 rendered pages. Only Unique Plastic Industry identity was found; no Z.A Khan Packages or Unique Lubricants material was published. Existing brochure colors, logos, layout, text and contact print are retained as owner-supplied catalog artwork; this does not change the website design language or current contact configuration.

Untouched sources remain in the supplied folder. Public copies are versioned under `/downloads/products/v2/`, preserving all source pages and extracted text. Image-stream optimization uses JPEG quality 94, 4:4:4 chroma, with no resizing and preserved masks/ICC color spaces. Vector/text geometry is untouched. This is explicitly a web-optimized copy, not a byte-identical copy of the source. Bucket: 10,886,897 → 10,870,502 bytes. Bottles brochure: 144,108,827 → 34,249,461 bytes. The latter stays below GitHub's individual-file limit; no full 144 MB original was added to Git.

Manifest schema v2 retains exact v1 information-sheet URLs and exposes only the two specifically approved new catalog paths. Original and optimized hashes, page counts and compression details: `evidence/source-catalog-downloads.json`. The strict Node/Vite allowlist and packaging whitelist cover these paths, with checksum validation and download disposition. Existing public routes and all previous owner records remain intact.

## TESTED

- Full existing suites after the implementation: 298/298 backend and 323/323 React tests passed.
- Additional focused assertions: 10/10 backend download/integrity/retained-URL tests and 8/8 React PDF/mapping/image/content tests passed. These include the new explicit owner mapping and all three old v1 URLs.
- All 28 original and optimized PDF pages have identical extracted text and page geometry. All 28 rendered pages compared at identical size; maximum per-channel RGB RMS difference is 1.179/255. Bucket pages are effectively unchanged; original/optimized bottles contact sheets were visually reviewed without missing artwork, altered layout or lost labels.
- Chrome: all three requested buttons clicked, downloaded, checksum-verified and opened in the real PDF viewer on local Node, Vite and extracted Node: nine downloads/viewer opens. Final checks wait for Chrome PDF viewer load state `success` and assert 3/25/25 pages before screenshots; initial premature loading-screen captures were replaced after this stronger readiness check. Source-catalog evidence is separate from initial UAT-3A evidence in `evidence/catalog-update/browser/`.
- Responsive checks: three changed product pages at 390 and 1440 pixels on local and extracted Node, twelve route/width checks; no horizontal overflow, broken images or page errors.
- Independently extracted review package: 254 files; locked production-only install; all eleven routes; checksum corruption rejected; SMTP disabled. Review ZIP SHA-256 `4f7752f854fa6ba66012615ef4299bbddc367609eeaeec339fd8f896ef322e32`, at `tmp/uat3a/catalog-update/artifacts/upms-node-deployment.zip`. The earlier review archive is preserved. No deployment.
- The earlier 70-viewpoint/Lighthouse results remain initial-milestone evidence; Lighthouse was not rerun for this download-only mapping update. No layout/CSS or image-gallery implementation changed.
- Public-only preview restarted after verifying its process identity on 3126. No management server, database, credential, production, SMTP or backup configuration changed.

## OWNER RETEST

Open http://127.0.0.1:3126/products and use Download Product PDF on the three categories. Expect 3/25/25 pages respectively. Brochure contact text is preserved as supplied; current website phone, WhatsApp, address and email configuration is unchanged. Machine-specific evidence and in-house sticker/carton manufacture remain open as previously documented.

## Reproduce

```powershell
& $python scripts/publish-owner-catalogs.py
& $python scripts/generate-product-pdfs.py
npm run build --prefix upms.client
$env:UAT3A_EVIDENCE_SET='catalog-update'
node scripts/uat3a-browser.mjs --catalogs-only
node scripts/uat3a-browser.mjs --vite --catalogs-only
```

Use the verified Node22 runtime for backend/package checks, and the bundled Python with Pillow/ReportLab/pypdf. The original generated sheets can still be verified with `scripts/verify-product-pdfs.py`.
