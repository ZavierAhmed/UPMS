# PHP-7.9 product changes

Baseline: cc9452887213eb82ad884c713e99df54568066aa. Branch: feature/upms-php-7-9-product-and-ui-refresh. All earlier UAT source/vendor trees remain separate from this checkout.

The public catalog now has exactly five categories, in order: Plastic Buckets, Lubricant Cans, Plastic Cans, Stickers and Cartons. The first three retain their descriptions, sizes, catalog galleries and approved photograph bytes. Custom Packaging is no longer a product definition, card, filter option or category link. General company copy about design collaboration/customization is retained where it is not describing the retired product category.

New routes:

- `/products/stickers`: label/sticker requirements, dimensions, artwork, application, quantities and material/finish preferences to discuss.
- `/products/cartons`: product/carton dimensions, quantities, branding and handling/delivery requirements to discuss.

No sizes, adhesive/finish performance, cardboard grades, load capacities, equipment, pricing, minimum quantities or in-house sticker/carton production claims are invented. Lubricant Cans remains a packaging category, not a branded lubricant business. Unique Plastic Industry remains the only represented company.

Home/catalog/footer cards, related-product data, Industries links, Manufacturing's obsolete custom-category link, inquiry preselection, WhatsApp messages and metadata use the revised definitions. The catalog filter is Labels & Cartons. The page says five categories. The public route manifest/prerender output has eleven routes; the existing sitemap generator reads that registry. Actual local sitemap contains both new routes and no retired custom route.

## Retired route

`/products/custom` and its trailing-slash form intentionally return **404** in the new Apache preview and the public deployment example. The SPA has no matching product and renders the existing honest NotFound page, with noindex and no canonical. The route is excluded from prerender registration/sitemap; its old generated category HTML is absent. It is not silently renamed to Stickers or Cartons. Existing general design inquiries can still use Contact.

## Original temporary illustrations and replacement

Source assets:

- `upms.client/src/assets/products/stickers-illustration.svg`
- `upms.client/src/assets/products/cartons-illustration.svg`

Both are original 800 × 600 local SVGs. Labels/rolls and carton forms have distinct silhouettes, warm neutral surfaces and restrained orange details, without fabricated customer brands or certifications. The detail pages visibly say that imagery is illustrative and actual product photographs will be added when supplied; meaningful alt text is set in the product data. Single-image categories have no arrows or empty thumbnails.

To replace either image, add an approved local photograph and update only that product's `image`, `alt` and `imageCaption` values in company.js (or its import). Gallery/detail components need no rewrite. Keep the caption illustrative until a verified photograph is supplied. Small SVGs are bundled locally by Vite; there are no image-generation/CDN dependencies or remote hotlinks.

The approved phone 0314-2113472, full F-260/A address, WhatsApp, email, map and directions are unchanged. Public images/fonts from the prior release are byte-identical; source/build hashes and bundle sizes are in ASSET-MANIFEST and ASSETS.json. No source brochure or unrelated owner asset was imported.
