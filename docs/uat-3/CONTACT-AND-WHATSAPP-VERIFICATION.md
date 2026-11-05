# Contact destinations

| Role | Readable number | Destination |
|---|---|---|
| Primary calling number | +92 315 2209511 | `tel:+923152209511` |
| Secondary calling number | +92 314 2113472 | `tel:+923142113472` |
| WhatsApp | +92 314 2113472 | `https://wa.me/923142113472` |

`upms.client/src/data/company.js` is the centralized configuration. Home contact, contact page, footer and mobile calling action consume it. Product inquiry messages and floating WhatsApp continue using the original WhatsApp helper. Contact-role regression tests explicitly reject substitution of the new calling number into WhatsApp links.

Actual prerendered HTML for every public route and 404 was checked for both telephone destinations, the exact WhatsApp destination and sole Unique Plastic Industry identity. There was no existing structured telephone schema requiring a separate constant. Historical management `PrintLayout.jsx` contact snapshots are deliberately unchanged. Evidence: `evidence/contact-assets.json` and `src/test/ContactRoles.test.jsx`.
