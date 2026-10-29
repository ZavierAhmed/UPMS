# PHP-7.9 asset manifest

Public build comparison against PHP-7.8: 111 files before, 112 after; 96 unchanged, 12 changed at stable paths, 3 removed and 4 added. Every existing approved image/font is byte-identical. No owner-supplied untracked asset was imported. Full old/new SHA-256 values are in PHP-7-9-ASSETS.json.

The two original 800 × 600 SVGs are source-local, intentionally illustrative, without customer branding or specifications. Vite may inline small SVGs into the local JavaScript bundle; no remote image/CDN request or new image dependency is required. Their predictable source names and exact hashes:

| Source | Bytes | SHA-256 |
| --- | ---: | --- |
| upms.client/src/assets/products/stickers-illustration.svg | 2698 | ad49922e6a2f6b00601b9394504a60093631f64bda6867e5911f41b1db8a5036 |
| upms.client/src/assets/products/cartons-illustration.svg | 2200 | ffee27f4809dfdad3890f0903a54a992c2a2aad1c0445fb8f26a90f74058318f |

Change either product’s image reference, alt and imageCaption in company.js to replace the temporary illustration with an owner-approved photograph. Existing gallery/detail logic needs no rewrite.

| Active bundle group | Name | Bytes | Gzip bytes |
| --- | --- | ---: | ---: |
| oldPublic | index-BAM1Eu6g.css | 31932 | 7124 |
| oldPublic | index-lgGo1hj2.js | 335093 | 99314 |
| newPublic | index-CjzmU7P7.js | 342597 | 101655 |
| newPublic | index-C9c62GkN.css | 32285 | 7185 |
| oldManagement | index-daM4cj0q.js | 537758 | 145593 |
| oldManagement | index-2OMGiDI_.css | 60518 | 11801 |
| newManagement | index-DhTT7502.js | 541096 | 146845 |
| newManagement | index-UzaSqto8.css | 70293 | 13738 |

Only HTML-referenced active bundles are counted, excluding unreferenced prior fixture copies. The existing private minified chunk warning remains. No dependency or lockfile changes.

| Disposition | Public artifact |
| --- | --- |
| Changed | upms.client/dist/index.html |
| Changed | upms.client/dist/public-routes.json |
| Changed | upms.client/dist/_pages/404.html |
| Changed | upms.client/dist/_pages/about.html |
| Changed | upms.client/dist/_pages/contact.html |
| Changed | upms.client/dist/_pages/home.html |
| Changed | upms.client/dist/_pages/industries.html |
| Changed | upms.client/dist/_pages/manufacturing.html |
| Changed | upms.client/dist/_pages/products-buckets.html |
| Changed | upms.client/dist/_pages/products-cans.html |
| Changed | upms.client/dist/_pages/products-containers.html |
| Changed | upms.client/dist/_pages/products.html |
| Removed | upms.client/dist/assets/index-BAM1Eu6g.css |
| Removed | upms.client/dist/assets/index-lgGo1hj2.js |
| Removed | upms.client/dist/_pages/products-custom.html |
| Added | upms.client/dist/assets/index-C9c62GkN.css |
| Added | upms.client/dist/assets/index-CjzmU7P7.js |
| Added | upms.client/dist/_pages/products-cartons.html |
| Added | upms.client/dist/_pages/products-stickers.html |

The new preview separately writes a local-only eleven-route sitemap and Disallow-all robots file; these are UAT runtime artifacts, not a production package. The normal route manifest feeds the existing production sitemap generator, now with Stickers/Cartons and without custom. No deployment or ZIP was generated.
