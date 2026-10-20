# UPMS W03.2 — Location correction

Historical report: the pending address attribution below was resolved by company-owner confirmation in [W03.3](W033-verification.md). The neutral city display described here has been replaced by the confirmed premises address; map destination and pin are unchanged.

Starting SHA: `09f6d94775478fa294c34dc48a1d8ff12ab9f63b`.
Branch: `feature/upms-w03-2-location-fix`.
Fetched origin and verified the remote W03.1 tip before branching. Existing untracked source assets were preserved. No merge or W04 work.

## Source and unresolved identity

On 2026-10-20 a live retrieval of the [company-supplied Maps link](https://maps.app.goo.gl/KJGy7zo7cQhsFwsF6) resolved successfully (HTTP 200). Google displays the listing name **Z.A KHAN packages** and address **Wali Rd, Metroville Sindh Industrial Trading Estate, Karachi, 75700, Pakistan**. No building number or separate province field was exposed. The destination pin is **24.9054755, 66.9876346**, taken from the place coordinates in the resolved URL, rather than the different map viewport center. [Location provenance and resolved place URL](W032-location-verification.json).

The supplied destination is verified, but its street address is not independently attributable to Unique Plastic Industry because the listing has another business name. The relationship to the previously published F-260-A address remains unverified. No affiliation, alternate brand, or listing telephone number was imported. The public site therefore uses **Karachi, Pakistan** while its map links use the exact supplied short URL. Confirmation that the listing address belongs to Unique Plastic Industry is the remaining location detail required before publishing a street address. The normalized resolved place URL is recorded as evidence; Google did not expose a separate declared canonical URL.

## Changes

- `company.js` centrally owns the neutral address, supplied map link, and directions URL to the resolved destination pin.
- Contact has a Company location section, Open location in Google Maps link and Get Directions action. Directions opens Google Maps routing to that pin with no assumed origin or transport mode.
- Footer and shared contact section (including Homepage and Manufacturing) use the shared location and provide View Location links.
- About removes the unverified S.I.T.E. assertion and reads the centralized display.
- Contact description metadata reads the centralized address. Home, About and Manufacturing metadata were inspected; no other old street address or structured location/coordinate schema exists in the public source.
- Phone numbers, WhatsApp configuration/helper/components, email, product data and inquiry code remain unchanged. No embedded map, script, dependency, or CSS changes.

## Validation

- Frontend production build: passed.
- ESLint: passed.
- Vitest: **85 passed** across four files, including 14 location checks and all prior WhatsApp/inquiry tests.
- .NET solution build (including restore): passed, **0 warnings / 0 errors**.
- Backend tests: **34 passed** (`dotnet test UPMS.Server.Tests --no-build`).
- Final diff whitespace check: passed.

Actual CUA browser checks covered all 11 public routes at 360, 390, 768, 1024, 1440 and 1920 CSS pixels: **66 passed**. Checks asserted actual viewport width, no horizontal overflow, no old street address, centralized footer display, correct and secured map destinations, unchanged floating WhatsApp draft, and no floating-action/control overlap. The Contact page was visually inspected on mobile and desktop. Blank inquiry validation and category preselection (`cans`) passed in the browser. API delivery behavior is covered by the existing backend tests; Vite preview was used only for frontend verification. No real WhatsApp message or email was sent. The temporary preview server was stopped after verification.

[Browser results](W032-browser-results.json) · [Mobile](screenshots/w032/contact-mobile.jpg) · [Desktop](screenshots/w032/contact-desktop.jpg) · [Changed files](W032-files.txt).
