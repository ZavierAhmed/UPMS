# Current product PDF manifest

Owner update 2026-11-05 supersedes the initial download mapping. Central authority remains `src/data/productDocuments.json`, generated with synchronized public build metadata. `productCatalogOverrides.json` records the explicitly authorized source-catalog overrides. Both Lubricant Cans and Plastic Cans use one shared brochure asset.

| Category | Active path | Download filename | Pages | Bytes | SHA-256 |
|---|---|---|---:|---:|---|
| buckets | `/downloads/products/v2/Bucket.pdf` | `Bucket.pdf` | 3 | 10,870,502 | `7bfd18a028647affa58c8485ae3871b600ce6cfaae1a5d785ccc9d5faaa6ff65` |
| cans | `/downloads/products/v2/Company_Profile_New_HD_Bottles.pdf` | `Company_Profile_New_HD_Bottles (1).pdf` | 25 | 34,249,461 | `a535f1c654f5d0d306d3706253c22564fc6cff9d86bbed787c90f854169f37f9` |
| containers | `/downloads/products/v2/Company_Profile_New_HD_Bottles.pdf` | `Company_Profile_New_HD_Bottles (1).pdf` | 25 | 34,249,461 | `a535f1c654f5d0d306d3706253c22564fc6cff9d86bbed787c90f854169f37f9` |
| stickers | `/downloads/products/v1/unique-plastic-stickers-product-information.pdf` | `unique-plastic-stickers-product-information.pdf` | 1 | 3,053,913 | `0b51c50e976ff326bc47cd595ef44423e284f9ee2218382de2f9c2273f90622a` |
| cartons | `/downloads/products/v1/unique-plastic-cartons-product-information.pdf` | `unique-plastic-cartons-product-information.pdf` | 1 | 1,293,752 | `6588e475cea32ec58ce31e5d0bfea9c76c7e2877db30b577270f755de6fda2f3` |

Every download is `application/pdf` with attachment disposition. Brochures preserve source page sizes, text and artwork rather than being reformatted as A4 sheets. The five original A4 information sheets are preserved. The three superseded v1 URLs remain independently allowlisted and verified under `retainedDocuments`; sticker/carton downloads remain unchanged.

`generate-product-pdfs.py` automatically reapplies the explicit catalog overrides, so regenerating information sheets does not silently revert the owner choice. `publish-owner-catalogs.py` reproduces the two public brochure copies from the untouched owner originals. It preserves all text/page geometry and image masks, re-encoding eligible RGB image streams as JPEG quality 94 with no resizing. It does not redesign pages, add contact text or change branding. Original brochure contact text (including its legacy email formatting) is preserved as supplied; website contact configuration remains unchanged.

See `CATALOG-DOWNLOAD-UPDATE.md` for actual browser, rendering and package verification results. Original source files remain private, unchanged in Downloads/New folder. Explicit owner authorization now permits publication of these two reviewed catalogs; it does not authorize any unrelated source brochure or alternate brand.
