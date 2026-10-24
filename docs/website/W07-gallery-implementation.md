# Gallery behavior

`ProductGallery` supports previous/next wrap, thumbnail selection and pressed state, polite count announcements, focused arrow keys, horizontal touch swipes and visible focus. Vertical gestures remain available for page scrolling. Controls have descriptive names and at least 44px targets. There is no autoplay or additional dependency.

Product route keys reset selection; ordinary rerenders and viewport changes retain it. A single image disables navigation. Custom Packaging uses its explicit illustration without fabricated carousel controls. Lightbox was optional and is intentionally omitted.

`CatalogImage` declares image dimensions and responsive sources. On failure it removes the responsive URLs and shows a labeled local fallback. It also detects an image that failed before React hydration attached its handler. The gallery stage reserves 4:3 space and contains the complete product.

Reproduce public-only acceptance: start the public-only preview on loopback 3115, then `node scripts/verify-w07.mjs`. This test performs no database access or inquiry delivery. Screenshots are in `docs/screenshots/w07/`.
