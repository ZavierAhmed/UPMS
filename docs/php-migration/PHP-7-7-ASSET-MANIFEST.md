# PHP-7.7 public assets and bundles

111 public files before and after: 96 byte-identical, 13 existing HTML/route metadata files modified, and two hashed JS/CSS resources replaced. All approved image/font bytes remain identical; no generated/recolored/cropped image asset was introduced. Full old/new SHA-256 maps are in PHP-7-7-ASSETS.json.

| File | Change | Reason |
| --- | --- | --- |
| upms.client/dist/index.html | Modified | Removed contact number/duplicate art text and revised stylesheet/JavaScript references; approved copy, location and identity retained. |
| upms.client/dist/public-routes.json | Modified | Retained phone replaces removed phone in contact route metadata. |
| upms.client/dist/_pages/404.html | Modified | Removed contact number/duplicate art text and revised stylesheet/JavaScript references; approved copy, location and identity retained. |
| upms.client/dist/_pages/about.html | Modified | Removed contact number/duplicate art text and revised stylesheet/JavaScript references; approved copy, location and identity retained. |
| upms.client/dist/_pages/contact.html | Modified | Removed contact number/duplicate art text and revised stylesheet/JavaScript references; approved copy, location and identity retained. |
| upms.client/dist/_pages/home.html | Modified | Removed contact number/duplicate art text and revised stylesheet/JavaScript references; approved copy, location and identity retained. |
| upms.client/dist/_pages/industries.html | Modified | Removed contact number/duplicate art text and revised stylesheet/JavaScript references; approved copy, location and identity retained. |
| upms.client/dist/_pages/manufacturing.html | Modified | Removed contact number/duplicate art text and revised stylesheet/JavaScript references; approved copy, location and identity retained. |
| upms.client/dist/_pages/products-buckets.html | Modified | Removed contact number/duplicate art text and revised stylesheet/JavaScript references; approved copy, location and identity retained. |
| upms.client/dist/_pages/products-cans.html | Modified | Removed contact number/duplicate art text and revised stylesheet/JavaScript references; approved copy, location and identity retained. |
| upms.client/dist/_pages/products-containers.html | Modified | Removed contact number/duplicate art text and revised stylesheet/JavaScript references; approved copy, location and identity retained. |
| upms.client/dist/_pages/products-custom.html | Modified | Removed contact number/duplicate art text and revised stylesheet/JavaScript references; approved copy, location and identity retained. |
| upms.client/dist/_pages/products.html | Modified | Removed contact number/duplicate art text and revised stylesheet/JavaScript references; approved copy, location and identity retained. |
| upms.client/dist/assets/index-D5c1HDXl.js | Removed from rebuilt output | Superseded hashed public bundle; retained owner builds are not deleted. |
| upms.client/dist/assets/index-DdYgcLMr.css | Removed from rebuilt output | Superseded hashed public bundle; retained owner builds are not deleted. |
| upms.client/dist/assets/index-BAM1Eu6g.css | Added | Responsive card/gutter/media/contact-action styling. |
| upms.client/dist/assets/index-lgGo1hj2.js | Added | Public contact-number removal and simplified concept illustration. |

## Active bundle comparison

Only resources referenced by each active HTML entry are counted; historical unused files in owner fixture directories are excluded. No dependency was added.

| Bundle | Before bytes / gzip | After bytes / gzip | Change bytes / gzip |
| --- | ---: | ---: | ---: |
| Management JS | 525870 / 142439 | 537758 / 145593 | 11888 / 3154 |
| Public JS | 335341 / 99362 | 335093 / 99314 | -248 / -48 |
| Management CSS | 48711 / 9429 | 60518 / 11801 | 11807 / 2372 |
| Public CSS | 30395 / 6859 | 31932 / 7124 | 1537 / 265 |

The private increase contains the dependency-free dashboard, exact aggregation and screen-only workspace styling. The existing >500 kB management chunk warning remains; no new library/security exposure is hidden. Public changes are the removed number, simplified illustration markup, centered/mobile layout, intentional media surface and responsive contact-action placement. Marketing claims, imagery, fonts, F-260/A, maps/coordinates, email, retained phone and WhatsApp remain approved/unchanged.
