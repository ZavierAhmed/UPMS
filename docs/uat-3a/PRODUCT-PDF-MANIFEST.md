# Product PDF manifest

## IMPLEMENTED / TESTED

Machine-readable authority: `upms.client/src/data/productDocuments.json`; synchronized package metadata: `upms.client/public/product-documents.json`. All five PDFs are versioned static assets and original new information sheets, not republished source brochures.

| Category | Download path | Bytes | SHA-256 |
|---|---|---:|---|
| buckets | `/downloads/products/v1/unique-plastic-buckets-product-information.pdf` | 810,898 | `f84f3d23e1eb58165cb3a3b1f31a27a8d34238a79a5a6a0ee6e8919f9ee4d90e` |
| cans | `/downloads/products/v1/unique-plastic-cans-product-information.pdf` | 439,989 | `806e26046f46c5d9bf0165737ae6d27fa7cd7035f67a84903e84ee6ff09da571` |
| containers | `/downloads/products/v1/unique-plastic-containers-product-information.pdf` | 702,362 | `a55a92b9de4e5b2c2fc206c5efb6b15c52ff92116ba41660d84645253e80cff2` |
| stickers | `/downloads/products/v1/unique-plastic-stickers-product-information.pdf` | 3,053,913 | `0b51c50e976ff326bc47cd595ef44423e284f9ee2218382de2f9c2273f90622a` |
| cartons | `/downloads/products/v1/unique-plastic-cartons-product-information.pdf` | 1,293,752 | `6588e475cea32ec58ce31e5d0bfea9c76c7e2877db30b577270f755de6fda2f3` |

Every file: MIME `application/pdf`; attachment filename equals the final path segment; one A4 page, selectable text, official logo, approved category image, exact verified company contacts, availability/quotation caveats. Human-viewed renders: `evidence/pdfs/`. Actual Chrome viewer captures: `evidence/browser/{local,package,vite}/pdf-viewer-*.jpg`. Delivery copies in `output/pdf/` match the static public assets exactly.

## Reproduce

From the repository root (Node with installed root and frontend dependencies, Chrome, Python with ReportLab/Pillow/pypdf):

```powershell
node scripts/product-pdf-data.mjs
& $python scripts/generate-product-pdfs.py
& $python scripts/verify-product-pdfs.py
npm run build --prefix upms.client
```

`$python` is the Python interpreter with those libraries (on this computer: `C:/Users/zasah/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe`). Export reads the approved React catalog via Vite SSR and renders only the official SVG logo/illustrations in Chrome. It does not read private source brochures, databases or credentials. ReportLab uses invariant metadata; repeated generation on the tested runtime was byte-identical. Keep the Chrome/Python/ReportLab versions fixed for byte-level reproducibility across computers. To regenerate the optional legacy SVG fallback, the same exporter supports the approved original illustrations.

PDF content changes require regeneration of all synchronized manifest copies and a new reviewed build/package. Use a new version directory for a subsequent published document revision and update the strict allowlist at that time.

## OWNER APPROVAL REQUIRED

Retest category content and captions. No unverified sticker/carton sizes, grades, certifications, MOQs, prices or machinery data were introduced.
