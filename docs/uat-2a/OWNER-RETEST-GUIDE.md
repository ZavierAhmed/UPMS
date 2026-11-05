# Owner retest guide

The new manual UAT-2A workspace is [port 5197 management](http://127.0.0.1:5197/management). The existing owner cheque records remain on port 5196. The independent workspace uses a new binding and asks for a new synthetic php-admin password on first setup. Keep the password in the browser and never send it in chat.

## Start and stop

Run under the Windows identity that owns the protected local engine.

```powershell
Set-Location -LiteralPath 'C:\Users\zasah\source\repos\UPMS'
& 'C:\Users\zasah\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe' -NoProfile -File scripts/start-uat2a-preview.ps1
```

The local MariaDB engine on port 3330 must already be running and pass the pinned identity verifier. A setup HTTP 200 means the password page is available. Wait for the verified dashboard redirect before signing in. On restart the fixed binding and credentials are reused. A partial DDL stage stops for review and retains diagnostic evidence.

```powershell
& 'C:\Users\zasah\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe' -NoProfile -File scripts/stop-uat2a-preview.ps1
```

The stop helper identifies only this launcher's exact command on port 5197. It preserves unrelated listeners.

## Manual scenarios

1. Prepare a synthetic client with a verified PKR 50,000 opening owed to the company and a BANK opening covering today's date. Use synthetic data throughout.
2. Register a cheque and verify the generated reference preview. Add an issuing bank, cancel once and save once, verifying every cheque field is preserved. Confirm the new directory identity is described as synthetic.
3. Enter the same issuing bank, account and normalized number again. Verify the duplicate warning and authorized link. Try the same number from a different synthetic account and verify availability.
4. Register a November 6, 2026 cheque received November 5. Deposit it with the mandatory textual evidence. A November 5 clearance must explain the cheque date and remain blocked. Keep the original owner record intact.
5. Use a separately registered valid nonfuture-dated cheque for successful clearance. Review readiness, enter the textual evidence, explicitly approve clearance and provide the exceptional justification when the same administrator received or deposited it.
6. Verify exactly one customer receipt and bank credit for the full amount. Retry the same entry and verify the recorded result. Existing terminal cleared cheques have no reversal or partial-clearance action.
7. At receipt, deposit and clearance try optional PDF/JPEG/PNG evidence within the two-file and 256 KiB limits. Test an unsupported file and explicit clearing of a failed selection. Test authenticated download and logout access rejection.
8. Search by normalized number and stored business reference. Compare details, printed acknowledgment, register and Excel. Inspect the form and popup on a phone-sized viewport.

File attachments remain synthetic UAT functionality. Operational activation awaits approved malware scanning and protected off-host key recovery. Physical clearance must be evidenced by the bank and explicitly approved.

## Existing owner upgrade

The existing 5196 database is still 44 tables and 124 guards. Its protected backup independently restored 127 rows. A copy-only rehearsal reached 47 tables and 133 guards with original rows preserved and 123 original guard definitions unchanged. `OWNER-UPGRADE-PLAN.sql` is the exact additive review plan for the fixed local schema.

Section 10 of the UAT-2A request requires a separate explicit UAT-only authorization before modifying that database. After approval, repeat the encrypted backup and restore, verify fresh source fingerprints, pause owner use, stop only the identified 5196 launcher, execute the maintenance plan with the existing maintenance identity, verify schema and guards, publish the matching target-bound proof and local extras flag, then restart and perform read-only acceptance. Preserve partial failure evidence and the maintenance state if any DDL fails.

The preflight command reads the owner database and rehearses on a new restore copy. It does not apply the owner migration.

```powershell
& 'C:\Users\zasah\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe' -NoProfile -File scripts/uat2a-owner-backup.ps1
```

## Automated verification

These commands use fresh isolated fixtures. Run them from the repository root after dependencies and the pinned local test engine are available.

```powershell
node scripts/uat2a-clearance-repro.mjs
node scripts/uat2a-baseline-http.mjs
node scripts/uat2a-core-http.mjs
node scripts/uat2a-extras-http.mjs
node scripts/uat2a-stale-and-identity.mjs
node scripts/uat2a-reference-http.mjs
node scripts/uat2a-php-suite.mjs
node scripts/uat2a-regressions.mjs --full
```

After building the separate assets with the start script, the existing isolated fixture can be reviewed through `node scripts/uat2a-browser.mjs`, `node scripts/uat2a-print.mjs` and `node scripts/uat2a-startup-browser.mjs`. These browser helpers close their own test listeners. Use the bundled Python runtime for `scripts/uat2a-artifact-check.py` and inspect the rendered PNGs before accepting PDF quality.

Full tests and diagnostics are in `evidence`. Previous milestone evidence and user-supplied assets remain separate from this release.

The local engine's empty sample PUBLIC grants were removed during security verification. `evidence/local-public-grants.json` records that all owner rows and account-specific grants were preserved. UAT-2A now fails readiness if an authenticated runtime inherits other privileges. The hardening helper is an explicit local maintenance operation and is not run automatically by setup or acceptance.
