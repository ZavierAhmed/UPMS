# Image source and approval matrix

> **Owner catalog update — 2026-11-05:** Plastic Buckets now downloads the supplied 3-page `Bucket.pdf`; Lubricant Cans and Plastic Cans share the supplied 25-page bottles brochure (web-optimized copies). See [current update and evidence](CATALOG-DOWNLOAD-UPDATE.md). Earlier information-sheet URLs remain available.


## Owner authorization

During UAT-3A the owner answered the image-source/publication question: `C:\Users\zasah\Downloads\New folder` — “this folder have sticker and carton images which can be user for website”. That explicit approval authorizes use of its images for this task. Original files remain unchanged and private. The independent `Downloads/open-empty-box.jpg.jpeg` was reviewed but only the folder copy is used by the reproducible optimizer.

The photographs of filled bottles show label applications. They do not establish Unique Plastic Industry ownership of any lubricant brand, a commercial relationship with those brands, or manufacture of the contents. Captions explicitly separate third-party branding from the website's sole company identity. No specifications printed on a label are imported into the sticker catalog.

## IMPLEMENTED / TESTED

| Original file in approved folder | Mapping | Original pixels | Visible identity/content | Publication decision |
|---|---|---|---|---|
| `4fffd507-1733-4696-bfec-cd6122bf54db.png` | stickers / label-yellow | 1086 x 1448 | Third-party label brands visible; representative application only | Owner-authorized folder; PUBLISHED as representative example |
| `9c876f8c-ce11-40c6-8113-ca03f6b5ab0b.png` | stickers / label-blue | 1086 x 1448 | Third-party label brands visible; representative application only | Owner-authorized folder; PUBLISHED as representative example |
| `c8c4fe89-9463-4a28-9175-94f4aa358a2e.png` | stickers / label-grey | 1086 x 1448 | Third-party label brands visible; representative application only | Owner-authorized folder; PUBLISHED as representative example |
| `f3383ac2-ec9a-4830-bf4d-170946afd090.png` | cartons / plain-carton | 1281 x 1227 | Unbranded carton | Owner-authorized folder; PUBLISHED as representative example |
| `open-empty-box.jpg.jpeg` | cartons / open-carton | 3369 x 2255 | Unbranded carton | Owner-authorized folder; PUBLISHED as representative example |
| `e1d15181-3574-4018-95b1-8755fce0a1d2.png` | Branded carton reference | 1281 x 1227 | Moto Shield carton with lubricant claims | PRESERVED / NOT PUBLISHED; unbranded alternative selected |

For each published original: exact source filename, SHA-256, approval statement, dimensions, captions and all derivative paths/byte sizes are in `upms.client/src/data/ownerProductImages.json`. These images supplement the unchanged W07 catalog, whose source PDF/page/object mapping remains in `docs/website/W07-catalog-image-manifest.md` and `src/data/catalog.js`.

```powershell
& $python scripts/prepare-owner-product-images.py 'C:/Users/zasah/Downloads/New folder'
```

The optimizer resizes with EXIF orientation correction, retains aspect ratio, creates 160/320/640/native-or-1200px WebPs, never upscales, strips metadata from public derivatives and does not retouch products or marks. Five examples, 20 derivatives. All loaded in Vite, local Node and extracted Node; gallery controls and mobile layout tested. Sticker/card/PDF captions identify representative imagery; carton dimensions remain unconfirmed.

## Preserved, excluded sources

- Previously supplied 22-byte catalog ZIP: empty; no usable image.
- Earlier briefs explicitly say sample images in old ChatGPT conversations would be staged later. Their presence was not assumed. The newly supplied folder was inspected instead.
- `Downloads/images.jpg`: unrelated panda artwork; excluded.
- Existing source PDFs and unrelated-brand logo assets: preserved privately; no new direct publication. The prohibited Z.A Khan Packages and Unique Lubricants identities were not added to public copy, media or downloads.
- Existing machinery image: approved brochure illustration, still labeled as such; not asserted to depict installed machinery.
- Approved original sticker/carton SVGs: retained as sources/fallbacks; replaced in the live category galleries by owner-supplied examples.

## OWNER APPROVAL REQUIRED / OPEN

Approve the representative captions during retest. The folder-use permission is complete. Camera authenticity, actual UPI production provenance and any specific customer relationship were not independently established and are not claimed. Verified photographs of UPI's own equipment/products would be a separate evidence upgrade.

## BLOCKED — MISSING/UNAPPROVED SOURCE

No identifiable HDPE machine photograph or verifiable company equipment specification was supplied. Nothing in the six-image folder establishes machinery ownership or in-house label/carton production.
