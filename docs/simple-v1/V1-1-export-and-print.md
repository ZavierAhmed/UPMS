# Export and print

Company XLSX uses the same verified register response and separate summary values as the screen. Company/report/filter/balance-coverage metadata precedes the column header. Date/reference/type/party/particulars/amount/effect/method/quantity columns retain distinct meanings. Amount/quantity and monetary summary cells are numeric; identifiers and formula-like strings remain inert inline text. Header freeze follows metadata. Client/vendor XLSX behavior defaults to its original format with signed balances.

Print uses a named landscape A4 page, compact summary grid, repeated table headings and hidden action column. Party ledger signs remain unchanged; vendor summary shows positive Closing Payable for a credit balance or Vendor advance/receivable for a debit balance. No signs are flipped in source/export rows.

Actual Chrome downloads, exported XML/numeric cells and reopened workbooks are verified locally. Print PDFs are rendered for visual review. Evidence remains ignored under tmp/simple-v1/v11-demo; no customer data/credentials are committed.
