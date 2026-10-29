# PHP-7.7 mobile fixes

The pasted request described two screenshot defects but contained no separate
image attachments. Actual matching baseline captures from the retained PHP-7.6
site reproduced the congested card and beige/white media mismatch.

| Defect | Correction | Actual acceptance |
| --- | --- | --- |
| Narrow 1.1fr/.9fr product cards | One-column copy/action/media at <=650px, readable type, natural height and minimum tap targets | Custom card copy ends above artwork; no overlap |
| Duplicated illustration copy | Decorative icon only; explanatory card/gallery caption remains truthful | No repeated marketing paragraph or slogan inside artwork |
| Asymmetric WhatsApp rail | Centered adaptive gutters; contact action independent/in-flow below 1200px | Left/right gutter difference under 2px at all requested widths |
| White product image on beige padding | Intentional white media surface with subtle boundary and 4:3 image proportions | Original photo pixels unchanged; frame background white |
| Narrow forms/galleries | Bounded flexible children, existing responsive sources, usable gallery controls | No page-level horizontal scrolling |
| Management floating menu/skip link | Top-aligned drawer toggle, offscreen-until-focused skip link, focus return and explicit close | Keyboard/Escape and all management widths checked |

All ten public routes were tested at 320, 360, 375, 390, 414, 768, 1024 and 1440px:
80 actual Chromium HTTPS views. No horizontal page overflow, JavaScript errors,
clipped mobile card content or image load failures were found. Image dimensions
reserve layout space. Measured layout-shift score was 0 in this local test run;
this is not a production-network performance guarantee. Keyboard navigation,
reduced-motion styling, footer, retained phone, WhatsApp destination and mobile
menu were also checked. Contact submission/deduplication has separate real HTTPS
evidence. Internal report-table scrolling is deliberate and does not widen pages.

Matching public before/after captures at 320/390/768/1440px are retained privately
under tmp/php-runtime/php77/before and /after. Their route/section names and widths
match; screenshots start at the same top position or use the same element bounds.
See VISUAL-ACCEPTANCE for exact paths and owner-review decisions. Images were
visually inspected, not accepted from CSS assertions alone.
