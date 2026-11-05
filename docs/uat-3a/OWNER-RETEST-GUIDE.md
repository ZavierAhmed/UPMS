# UAT-3A owner retest guide

Open **http://127.0.0.1:3126/**. This is the public-only updated website preview; it does not use your management database, administrators or SMTP. Do not use this milestone package as a production deployment.

1. Open Products and each of Plastic Buckets, Lubricant Cans, Plastic Cans, Stickers and Cartons.
2. On every category click **Download Product PDF**. Open the downloaded file. Confirm the official company logo, correct category image/caption, description, inquiry guidance and contacts. Confirm there is one readable A4 page and text can be selected/searched.
3. Confirm bucket capacities 8L/10L/16L/20L, lubricant-can capacities 700ml/1L/3L/4L/5L and plastic-can capacities 20L/30L. Availability/specifications still require company confirmation. Stickers/cartons have no invented dimension/material/price list.
4. Browse the three sticker label examples and two carton examples. Confirm the images and captions are suitable. Label brands are representative examples, not Unique Plastic lubricant products. The branded carton reference was not published.
5. On About and Manufacturing, review manufacturing vs packaging support and custom-quotation wording. Confirm it matches your actual work.
6. Read **HDPE Blow Moulding** and the five-step diagram at `/manufacturing`. General explanation is complete; the website makes no claim about a specific installed machine. Supply a verified machine photo and exact supported company details if those should be added later.
7. Try phone and WhatsApp links: primary +92 315 2209511; secondary/WhatsApp +92 314 2113472; WhatsApp destination remains `https://wa.me/923142113472`. Confirm email and address.
8. Check a narrow phone, tablet and desktop layout. Downloads and gallery controls should remain visible and usable.

## Preview restart if needed

From the repository root, with the existing verified Node22 runtime:

```powershell
& 'C:/Users/zasah/source/repos/UPMS/tmp/production-readiness/node22/node_modules/node/bin/node.exe' scripts/uat3a-preview.mjs
```

The current preview is already running. Do not launch a second process on an occupied port or stop any owner workspace on ports 5173/5180/5196/5197/5205. This public preview binds loopback only and cannot send inquiry email.

## IMPLEMENTED / TESTED

Five category downloads, approved representative galleries, HDPE explanation and work classification implemented and developer-tested. See technical/visual reports for actual counts and scores.

## OWNER APPROVAL REQUIRED

Your manual content/presentation retest is pending; it has not been marked passed by the developer.

## BLOCKED — MISSING/UNAPPROVED SOURCE

Actual company HDPE machine photograph/specifications and confirmed in-house sticker/carton manufacturing evidence remain OPEN. Public general explanations and representative examples do not close those evidence gaps.
