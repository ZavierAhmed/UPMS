# PHP-7.6 public asset differences

Old build: 111 files. New build: 111 files. 97 are byte-identical, 12 HTML files and public-routes.json change, and one hashed public JavaScript bundle is replaced. Every changed file is listed below; old/new SHA-256 for every file is in PHP-7-6-PUBLIC-ASSETS.json. The historical PHP-7 manifest is retained unchanged.

| File | Change | Explanation |
| --- | --- | --- |
| upms.client/dist/index.html | Modified | Corrected rendered footer address and replacement main JavaScript reference; all other normalized HTML is identical. |
| upms.client/dist/public-routes.json | Modified | Contact route metadata includes the corrected address; route inventory and canonical settings are unchanged. |
| upms.client/dist/_pages/404.html | Modified | Corrected rendered footer address and replacement main JavaScript reference; all other normalized HTML is identical. |
| upms.client/dist/_pages/about.html | Modified | Corrected rendered footer address and replacement main JavaScript reference; all other normalized HTML is identical. |
| upms.client/dist/_pages/contact.html | Modified | Corrected Contact/footer address and address-derived metadata, plus replacement main JavaScript reference. |
| upms.client/dist/_pages/home.html | Modified | Corrected rendered footer address and replacement main JavaScript reference; all other normalized HTML is identical. |
| upms.client/dist/_pages/industries.html | Modified | Corrected rendered footer address and replacement main JavaScript reference; all other normalized HTML is identical. |
| upms.client/dist/_pages/manufacturing.html | Modified | Corrected rendered footer address and replacement main JavaScript reference; all other normalized HTML is identical. |
| upms.client/dist/_pages/products-buckets.html | Modified | Corrected rendered footer address and replacement main JavaScript reference; all other normalized HTML is identical. |
| upms.client/dist/_pages/products-cans.html | Modified | Corrected rendered footer address and replacement main JavaScript reference; all other normalized HTML is identical. |
| upms.client/dist/_pages/products-containers.html | Modified | Corrected rendered footer address and replacement main JavaScript reference; all other normalized HTML is identical. |
| upms.client/dist/_pages/products-custom.html | Modified | Corrected rendered footer address and replacement main JavaScript reference; all other normalized HTML is identical. |
| upms.client/dist/_pages/products.html | Modified | Corrected rendered footer address and replacement main JavaScript reference; all other normalized HTML is identical. |
| upms.client/dist/assets/index-BJ38zxzG.js | Removed from rebuilt output | Superseded main JavaScript hash after the address literal changed. |
| upms.client/dist/assets/index-D5c1HDXl.js | Added to rebuilt output | Replacement main JavaScript bundle; only normalized content change is the address literal. |

The comparison reads prior bytes from the retained owner public build and compares current dist bytes. After normalizing only the old/new address and corresponding main JavaScript path, all changed HTML and main JavaScript contents are exactly equal. All unrelated images, fonts, CSS and other static files are hash-identical. Phone/email, WhatsApp, supplied Maps link, 24.9054755/66.9876346 coordinates, directions and canonical settings are unchanged.

Contact, footer and all ten desktop/mobile route renderings were checked over revised HTTPS. The prior prohibition on F-260 is replaced by the exact approved full address; unrelated brand/prerender/link checks remain. Private management bundle changes are excluded from this public manifest. No unapproved owner assets or conflicting identities were imported or published.
