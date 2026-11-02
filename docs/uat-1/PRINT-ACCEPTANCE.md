# UAT-1 print and export acceptance

Actual headless Google Chrome prints the built management UI backed by the real isolated PHP kernel. All records in these artifacts are synthetic. No owner or production records are published.

The baseline contains Company Transactions and client Hafta PDFs. After artifacts cover Company Transactions, client Hafta, customer ledger, vendor ledger, money statement, expense-by-category, expense-by-employee, custom challan, purchase document, purchase register, stock, stock movements, financial receipt, financial refund and sales return. Ten report surfaces offer Excel; document-only print surfaces have no Excel action.

Artifacts: `../../output/pdf/uat-1/`. Screenshots and actual downloaded workbooks: `evidence/after-*`. `evidence/browser-after.json` lists exact files and HTTP responses. `evidence/print-verification.json` records PDF page/bounds/control checks and workbook comparisons against PHP report values; independent financial arithmetic is covered separately by consolidated evidence.

Approved company SVG, report titles, filter periods and applicable party/account/reference context replace dashboard print material. Relevant financial documents include the approved contact snapshot. Company totals exclude unrelated receivable/payable dashboard balances; production quantity is separate from PKR. Hafta has full-width client tables, readable date/description/quantity/rate/amount columns and intact summaries. Business expense reporting remains separate and includes signed refunds. Literal external references and custom/official challan numbers are preserved.

The first print verification caught a nested status formatter altering the literal reference B4-PAID. Reference cells now preserve their original text through both table layers. Chrome evidence is regenerated after corrections. Blank pages, clipping, orphan company totals and missing continued table headings are treated as failures, not accepted limitations.

Final visual-review and automated verification results are recorded in the evidence files. These local results do not establish hosted print compatibility or production readiness.

Final artifacts contain 15 corrected PDFs (18 pages) plus two baseline PDFs (five pages). All 23 pages are rendered into six labeled review sheets by `scripts/uat1-render-review.py`; the reviewed manifest binds the exact PDF hashes. Corrected customer/vendor ledgers, challan and receipt fit on one page for this fixture. Company register spans three pages with repeated headings and final-row totals; the money statement spans two pages with repeated account/table context. Larger real datasets must still be checked in the owner's print preview.
