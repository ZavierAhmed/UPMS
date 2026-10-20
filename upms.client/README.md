# UPMS public website client

React 19 / Vite 8 corporate website for Unique Plastic Industry with React Router path navigation.

See the repository [README](../README.md) for setup, routes, source provenance, SEO limitations and milestone boundaries. See [W02 verification](../docs/W02-verification.md) for results and screenshots.

From this directory:

```powershell
npm ci
npm run dev
npm run build
npm run lint
npm test
npm run test:watch
npm run preview
```

Stop Vite before `npm ci` on Windows to release native-module locks. Unit/component tests use Vitest, jsdom and React Testing Library. The CUA browser smoke harness is `scripts/browser-smoke.mjs`; its browser requirements and invocation are documented in the W02 verification report.

W03 inquiry submissions require the .NET API (integrated development or published hosting). Vite-only preview cannot deliver inquiries. See [inquiry operations](../docs/W03-inquiries.md) for safe local testing and production SMTP configuration.

## WhatsApp contact (W03.1)

`src/data/company.js` owns the single canonical `company.whatsappNumber` (`923142113472`, international `+923142113472`). `src/utils/whatsapp.js` builds the HTTPS `wa.me` URL, optionally adding a draft with `encodeURIComponent`. Pass no message for the bare link. Every WhatsApp action uses this helper; do not duplicate the number or URL in components.

`WhatsAppFloatingButton` is rendered once in `App.jsx`, outside page sections, on every public route (including the fallback page). Its reusable local `WhatsAppIcon` is decorative. The semantic external link has an accessible company label and `noopener noreferrer`. Styling in `site.css` uses a 56px circular green action, safe-area offsets, visible keyboard focus, reduced-motion support, and z-index 15 (below header/navigation and modal layers). Containers retain full-bleed section backgrounds and reserve a right gutter for the action so it cannot obscure controls.

Product detail pages retain the original inquiry CTA and category query parameter. The secondary outlined WhatsApp CTA uses the current structured product title in its draft, and wraps beside/below the inquiry CTA according to space. The Contact page adds the same configured number as another contact method. Opening a link only opens WhatsApp and prepares a draft; visitors review and send it themselves. There is no WhatsApp API, credential, automatic message, or dependency addition.

See [W03.1 verification](../docs/W031-verification.md) for automated checks, responsive browser results, Lighthouse comparison, and screenshots. No real WhatsApp messages were sent.

## Location configuration (W03.3)

`src/data/company.js` owns `company.address`, `company.map` (the exact company-supplied short Maps link), and `company.directions` (Google Maps directions to the resolved destination pin). Contact, the shared contact section and footer read these values. About and Contact metadata use the same address display.

The company owner confirmed the shared premises in W03.3. The public address is **Wali Road, Metroville, S.I.T.E., Karachi 75700, Pakistan**. Unique Plastic Industry remains the only website identity; the shared premises do not authorize adding another brand or affiliate. The supplied map destination and directions coordinates remain unchanged. See [W03.3 verification](../docs/W033-verification.md) for the confirmation and checks; [W03.2 evidence](../docs/W032-verification.md) records the original map resolution.
