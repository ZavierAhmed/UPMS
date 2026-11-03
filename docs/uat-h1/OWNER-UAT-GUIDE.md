# Owner UAT guide

Original UAT remains at `http://127.0.0.1:5173/management` with its original database, records and administrator credentials. It remains on its existing 29-table/72-guard profile; Employee Hafta is disabled there. Refresh to see the renamed **Client Weekly Statement**, still at the saved `report=hafta` URL.

For the new feature, use a separate synthetic workspace. In an owner PowerShell session from the repository root:

```powershell
& 'C:/Users/zasah/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/powershell/pwsh.exe' -NoProfile -File scripts/start-uath1-preview.ps1
```

On first use this explicitly creates a **new synthetic database**, runs isolated acceptance and prompts securely for a strong password for its synthetic `php-admin` login. The password passes in process memory/stdin; it is not written to a credential file. No existing administrator is reset. Later starts reuse the fixed new workspace binding and its records. Keep this Windows computer awake and its existing local MariaDB engine running. The feature link is `http://127.0.0.1:5180/management`. This interactive owner-selected-password startup is supplied and syntax-checked; the agent did not choose or persist an owner login secret or claim an interactive owner login had been performed.

Retest with synthetic records only:

1. Open Stock In, select PRODUCTION. Search an active employee or use Add Employee. Enter quantities and individual labor rates. Close and reopen the popup; quantities/rates/reference must remain. Save a draft: payable must not change.
2. Post 10 pieces at PKR 10 labor each: earning is PKR 100. An unassigned production must say unallocated. A zero rate needs confirmation. Purchase/opening/correction editors must not offer labor allocation.
3. Open sidebar **Hafta**. Select employee and week/custom inclusive dates. Verify opening, earned, paid and closing. An unreviewed employee shows UNVERIFIED, not an invented zero.
4. Record a reviewed labor opening with real review evidence in this synthetic workspace only. A zero opening must be explicitly approved. Pay PKR 30 from a verified synthetic holding: employee payable becomes PKR 70 and only that holding falls by PKR 30.
5. Retry the same operation/reference; it must not duplicate. Overpayment or insufficient holding must fail. Do not try to correct posted history by editing/deleting it; correction policy is not implemented.
6. Rename an employee and inspect old earnings: historical names remain. Check an employee-associated ordinary expense: it remains separate and **Not deducted from labor balance**.
7. Print single/all/current-week statements and a payment receipt, export Excel, and follow Production/payment source links. Compare totals and confirm continuation headers/signatures. At 390/768/1440 widths, popup buttons must remain usable and draft fields preserved.
8. Open Reports → Client Weekly Statement. Existing client calculations, filter behavior, challan display identity and saved URL must remain intact.

Actual automated Chrome evidence uses the PHP kernel and isolated MariaDB, not mocked APIs. Five PDFs, four workbooks and desktop/mobile screenshots are in `evidence/` and `output/pdf/uat-h1/`. Synthetic Alice ends at earned 108.35, paid 96.00, payable 12.35; Bob earned 10005.00. Unknown employee openings keep the overall payable UNVERIFIED.

No production deployment, cheque implementation, website modification, historical wage conversion, administrator recreation or owner-record migration is included.
