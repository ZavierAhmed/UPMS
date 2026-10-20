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
