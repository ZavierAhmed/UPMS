# Owner retest — separate cheque UAT

URL: **http://127.0.0.1:5196/management**. This does not upgrade the databases on ports 5173 or 5180. Never enter a production password or real cheque/customer data.

Start from PowerShell under the Windows identity that owns the private local test engine:

```powershell
Set-Location -LiteralPath 'C:\Users\zasah\source\repos\UPMS'
& 'C:\Users\zasah\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe' -NoProfile -File 'C:\Users\zasah\source\repos\UPMS\scripts\start-uat2-preview.ps1'
```

The launcher runs in that terminal; **Ctrl+C** stops only it. For the provided background listener, stop it using the command below. The helper verifies port 5196 belongs to Node running this repository's exact absolute cheque-launcher path before stopping it. It refuses other listeners. Restart with the start command above; an occupied port is never killed/replaced automatically.

```powershell
& 'C:\Users\zasah\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe' -NoProfile -File 'C:\Users\zasah\source\repos\UPMS\scripts\stop-uat2-preview.ps1'
```

The fixed private binding is `tmp/php-runtime/uat2-owner-binding.json`; setup checkpoints and diagnostics are in `tmp/php-runtime/uat2-owner-setup`. Do not edit, delete or reinitialize them to resolve an error.

On first visit choose a **new synthetic** php-admin password of 14–128 characters. It is accepted in memory and is not logged or written to a credential file. Do not send it in chat. The launcher creates a new independent database, checks native readiness and dashboard HTTP 200, then redirects to exactly the management URL. Sign in as `php-admin` using that chosen password. A restart reuses the same account and records. If setup completed account creation before an interruption, retry using the same original setup password; partial DDL instead stops for review.

The manual workspace starts empty. Automated acceptance uses separate synthetic databases and does not populate this manual binding. Prepare only these **synthetic** opening fixtures through the normal UI:

1. Create “Cheque UAT customer A” with a verified opening of PKR 50,000 owed to the company, dated today.
2. In Money Accounts verify an existing BANK account opening of PKR 0 dated today. Zero is an explicit verified opening, not an assumed balance.
3. Prepare a second synthetic client with PKR 50,000 owed for dishonour/partial-receivable tests.

Normal flow:

1. Open Client Payments -> **Receive by Cheque**, or Cheques -> Register New Cheque.
2. Select customer A, a synthetic issuer, drawer name, full synthetic account identity, unique reference, number, cheque/received dates and amount 50000.00.
3. Register. The acknowledgment must say “Cheque received — subject to bank clearance.” Customer due remains 50,000 and bank remains 0.
4. Deposit to the verified BANK, with today's date, deposit reference, reason and supporting evidence reference. Both financial balances remain unchanged.
5. Confirm Bank Clearance only with synthetic bank evidence, complete amount and explicit approval. If the same administrator received/deposited it, enter a separate exceptional self-approval justification.
6. Customer due becomes 0; bank becomes 50,000. Follow the single canonical CR receipt, bank statement and cheque event links. Refresh/retry must not duplicate it.
7. Print acknowledgment/register and export Excel. Drawer account is masked. No audit timeline, loading notice or exceptional approval reason belongs on the customer acknowledgment.

Dishonour: receive/deposit a separate 20000.00 cheque for customer B; record bank rejection evidence. Customer still owes 50,000, bank does not change and no refund/payment appears. Partial customer settlement: clear a different complete 20000.00 instrument for that client; 30,000 remains due. This is not partial cheque clearance.

Retest state filters, received-date range, customer/number/issuer/receiving-account filters, cancellation of an undeposited received cheque and evidenced return before clearance. Returned/deposited history retains its bank identity. CLEARED has no cancellation, dishonour, return or reversal action. Unsupported partial amounts, overpayments, future/backdated events and missing openings must fail.

Review the six-state register and timeline on desktop and a narrow mobile viewport. The approval banner remains pending operational policy approval even after synthetic acceptance. The two issuing-bank directory entries are synthetic, not approved operational institutions.

Actual acceptance evidence is under `docs/uat-2/evidence`; five main Chrome PDFs are in `output/pdf/uat2-*.pdf` and the three completed XLSX downloads are under `docs/uat-2/evidence/browser`. The automated browser fixture is disposable and its randomly chosen password is not retained; do not reset it or reuse its hash for manual access.
