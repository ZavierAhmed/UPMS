# UPMS W03.3 — Confirmed premises address

Baseline: `6717f44b40ea648ec65a4324e2dc158d4b1733a7` (fetched and verified against the remote W03.2 tip).
Branch: `feature/upms-w03-3-address-confirmation`.

The company owner confirmed in the W03.3 request that Unique Plastic Industry operates from the premises at **Wali Road, Metroville, S.I.T.E., Karachi 75700, Pakistan**, shared with the business named in the existing Maps listing. This resolves the pending attribution recorded in W03.2. The owner confirmation authorizes the address; it does not authorize another website brand, affiliate claim, or corporate relationship. Unique Plastic Industry remains the sole public identity.

`company.address` in `upms.client/src/data/company.js` now contains the exact owner-supplied address. Contact, footer, shared contact sections, About and Contact metadata already consume this configuration, so no component duplication or layout changes were needed. The supplied Maps URL `https://maps.app.goo.gl/KJGy7zo7cQhsFwsF6` and directions pin **24.9054755, 66.9876346** are unchanged. Phone numbers, email, WhatsApp, product data and inquiry code are unchanged. The historical W03.2 report now points to this confirmation; its original source evidence remains intact.

## Verification

- `npm --prefix upms.client run build`: passed.
- `npm --prefix upms.client run lint`: passed.
- `npm --prefix upms.client test`: **85 passed** in four files, including existing WhatsApp/inquiry tests.
- `dotnet build`: passed, **0 warnings / 0 errors**; restore up to date.
- `dotnet test UPMS.Server.Tests --no-build`: **34 passed**.
- `git diff --check`: passed.

Location tests assert the exact confirmed address, shared address elements across public pages, unchanged supplied Maps URL and directions coordinates, safe external attributes, no old F-260 address or other company branding, and retained inquiry category preselection.

Actual CUA browser verification of the production-built frontend on local Vite preview covered all 11 public routes at **360, 390, 768, 1024, 1440 and 1920** CSS pixels: **66 checks passed**. Actual viewport width, address equality, absence of horizontal overflow/other branding, and exact secured map/directions links were checked. Contact and footer were visually inspected on desktop and mobile: the full address wraps without clipping. URL destinations remain identical to the W03.2 baseline; external Google navigation/device routing was not repeated. No real messages or emails were sent. The temporary preview server was stopped afterward.

[Desktop Contact and footer](screenshots/w033/contact-desktop.jpg) · [Mobile Contact](screenshots/w033/contact-mobile.jpg) · [Mobile footer](screenshots/w033/footer-mobile.jpg) · [Changed files](W033-files.txt).

Existing untracked user assets were preserved and excluded. No merge into master or W04 work.
