# Deployment runbook

## A. Public website

Prepare only in a separate Apache staging root. From the repository root, verify the exact existing archive and its extracted routes:

```powershell
Get-FileHash -Algorithm SHA256 tmp/phase-4.1b/static/upms-public-static.zip
./scripts/p41-verify-static.ps1 -Browser -Evidence tmp/phase-4.2 -ArchiveRoot tmp/phase-4.1b/static
```

Require a live public rollback archive containing the existing .htaccess, root files, _pages, assets and licenses. Preserve dashboard, CGI, certificate challenges and private roots separately. After provider denial/redirect acceptance, hosted staging and explicit publication approval, upload the verified archive to a private release directory and verify all manifest hashes. Review the exact rsync plan first:

```bash
rsync -a --checksum --dry-run --itemize-changes --exclude=/.htaccess --exclude=/release-manifest.json ./approved-static/ "$HOME/public_html/"
```

During the approved window, keep the exact prior release and move the old public inquiry.php to private rollback storage. Run the reviewed copy with dry-run removed, then atomically replace only the public .htaccess using a temporary sibling file and rename. Preserve the nested dashboard root. Verify public HTTPS/redirects, explicit denied paths, homepage and deep links, all seven PDF bytes, contact destinations, disabled inquiry and dashboard isolation. If validation fails, restore the prior public archive and rules and remove only reviewed new-only paths, then verify the old public and management surfaces. Treat the archive as protected operational evidence.

## B. PHP management

Prepare the exact reviewed archive without a competing Node public package:

```powershell
$node = './tmp/production-readiness/node22/node_modules/node/bin/node.exe'
& $node scripts/p4-build.mjs
& $node scripts/p4-package.mjs --management-only --label=p42-review
```

The management ZIP is a review candidate. Its example keeps business flags disabled. Follow the clean-install plan for the preferred new schema. The confirmed disposable test history does not require historical allocation or migration. The old schema, runtime binding and release are the rollback target.

There is no approved executable live 47/133 initializer yet. Rehearse the versioned production initializer and receipts, approve real opening policy, verify independent recovery, and validate the matching release on separate HTTPS staging. Only then present the exact target and identities for owner approval. After approval, initialize the separate schema, verify the full manifest, scope and credentials, then switch the private binding and application during maintenance. Require separate approval to resume financial operations. Do not run a same-schema rebuild without its own exact reviewed destructive plan and approval.