# P4.1B technical report

The P4.1 baseline matched the requested local and remote SHA before branching. P4.1B keeps financial writers under the exclusive guard and lets reviewed read paths coexist under a shared guard. Workspace navigation cancels stale browser reads. All production rollout gates remain separate.

Reproduction commands from the workspace root using the pinned Node 22 runtime and existing isolated fixture:

```powershell
$node = './tmp/production-readiness/node22/node_modules/node/bin/node.exe'
& $node scripts/p41b-php-suite.mjs
& $node scripts/p41b-concurrency.mjs
& $node scripts/p41b-host-https.mjs
& $node scripts/p4-build.mjs
& $node scripts/p41-package-static.mjs --p41b
& ./scripts/p41-verify-static.ps1 -Browser -Evidence docs/phase-4.1b/evidence -ArchiveRoot tmp/phase-4.1b/static
git rev-parse HEAD
git ls-remote --exit-code origin refs/heads/feature/upms-p4-1b-hosting-concurrency-readiness
```

The evidence receipts are scoped to the actual isolated runs. Refer to the updated release gates for provider, operator and publication requirements.

Fresh regressions passed 169 PHP tests (1,912 assertions), 325 React tests, 304 Node tests and 12 isolated financial/security scenarios. The first Node run had one child-process timeout. The two-worker retry passed. Build, frontend lint, Composer audit and Node runtime audit passed. Four Chrome PDFs and two Excel exports matched independent synthetic amounts.

See evidence/report-integrity.json for the rendered PDF and Excel hashes. The known Symfony review ZIP hash was rechecked. The fresh hosted SSH attempt timed out, leaving actual web SAPI and vendor parity unverified.
