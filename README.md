# Unique Plastic Industry — W01

Corporate portfolio website for Unique Plastic Industry, a Karachi plastic packaging manufacturer established in 2018. The existing React 19 / Vite 8 JavaScript frontend and ASP.NET Core (.NET 10) backend remain in place.

## Local development

Prerequisites: Node.js compatible with Vite 8 (this milestone verified with Node 26.4.0), npm, .NET 10 SDK, and Visual Studio with JavaScript/ASP.NET workloads if using the solution launcher.

Frontend, from `upms.client`:

```powershell
npm ci
npm run dev
```

The existing development HTTPS endpoint is `https://localhost:58500`. Development certificates are exported through `dotnet dev-certs`; trust your certificate locally with `dotnet dev-certs https --trust` if needed. The existing weather forecast proxy target remains `https://localhost:7081` by default.

Backend, from the repository root:

```powershell
dotnet restore
dotnet run --project UPMS.Server --launch-profile https
```

Open `UPMS.slnx` in Visual Studio for the existing integrated launch. The server retains its SPA proxy, static assets, controllers and fallback routing. Production builds and previews no longer generate development certificates. Backend endpoints and management features were not changed.

## Build and verification

```powershell
# upms.client
npm run build
npm run lint
npm run preview
# repository root
dotnet restore
dotnet build
```

Frontend output: `upms.client/dist`. Preview: `http://localhost:4173`. Existing solution build settings are preserved. No automated test suites or test scripts exist in the baseline. See `docs/W01-verification.md` for actual results, screenshots and verification limits.

## Architecture and milestone

- `src/components/layout`: shared branding, sticky header, keyboard-accessible mobile navigation and footer.
- `src/components/sections`: reusable contact inquiry section with real email and phone links.
- `src/pages/Home.jsx`: complete homepage with about, products, benefits, manufacturing and industries.
- `src/data/company.js`: company, navigation, product, feature and industry data.
- `src/styles/site.css`: shared tokens, responsive layouts and reduced-motion support.
- `src/App.jsx`: lightweight hash routes with no router dependency, route focus management and native intersection-based section reveals.

Routes: `#/`, `#/about`, `#/products`, `#/products/:category`, `#/manufacturing`, `#/industries`, `#/contact`. Homepage content is complete; other informational routes explicitly identify themselves as previews. Contact provides direct inquiry actions, with no simulated form submission. Unknown routes show a presentable fallback.

Future milestones may expand company, catalog, manufacturing, approved clients and contact pages. Sales, inventory, vendors, customers, authentication and payment ledgers are out of scope. Build a separate authenticated management application when specified; public website components have no management or API coupling.

## Assets and source provenance

The supplied brochure is `upms.client/src/assets/UNIQUE COMPANY MOCKUP.pdf`. Official supplied branding is in `src/assets/unique_plastic_logos_hd/unique_plastic.svg`. Only this Unique Plastic logo is used. Other supplied logo files are preserved locally; Z.A Khan branding and Unique Lubricants products are not published.

`src/assets/products` contains JPEG crops from rendered brochure pages, without customer names or logos:

- `hero.jpg`: page 5, cans and bucket.
- `buckets.jpg`, `cans.jpg`: page 3.
- `jars.jpg`: page 2, smaller containers.
- `manufacturing.jpg`: page 4, machinery illustration.

These are brochure illustrations, not independently verified factory photography. Custom packaging reuses bucket imagery as a category illustration, with no claim of a specific custom design. Brochure capacities are mentioned only for buckets. No prices, certifications, customer endorsements or manufacturing capacities were invented.

The originally named `ZA AND UNIQUE LOGO.pdf` was not present, but separately extracted official Unique Plastic assets were supplied. Missing for future publication: high-resolution original product photos, verified factory photography, approved customer branding and a production domain/social-sharing image. Brochure crops are provisional in quality. Google Fonts supplies Manrope and DM Sans with local Arial/sans-serif fallbacks; this creates an external font request. No runtime dependencies were added.
