# Round 3 business usability

Starting branch: `feature/upms-ui-navigation-ux-fixes`; SHA `ac837c4cd14e5e7940589c8cb89e4d013132841f`. Delivery branch: `feature/upms-ui-business-usability`. Required commit message: `UPMS UI: Improve business pages, ledgers, details and action usability`. Final SHA is recorded in the delivery and commit-bound package manifest.

Dedicated Customers, Vendors and Products now provide list/search/add/detail/edit routes, reusing existing commands and permissions. Product canonical identity stays locked; stock stays read-only. Sales exposes functional New Challan. Eight workflow details share readable summaries, source links, semantic actions and collapsed activity. Customer ledgers are a distinct classified accounting workspace with authoritative summaries, typed debit/credit rows, outstanding/unapplied facts, filters and source-return navigation. Default ordinary screens do not expose raw JSON.

Only runtime backend addition: permission-scoped master metadata GET for customers/vendors/items. No migration, accounting/stock service, operational activation gate or production configuration change. Approved funding exceptions are isolated operator-test tools only. Main, existing demo, original XAMPP files, recovery evidence and credentials remain protected.

See UI-R3-test-results.md for exact counts, UI-R3-visual-acceptance.md for screenshot inventory and UI-R3-open-issues.md for limits. Local technical acceptance passed: full regression134/134 and extracted candidate package113 files; final commit-bound archive is verified before push. Owner visual approval/full manual UAT are not complete. No merge, deployment or P2.8.

Demo: http://127.0.0.1:3108/management. Owner-only masked access procedure: `server/tools/Get-UPMSDemoAccess.ps1 -RunId 02 -Role Admin` (or Accounts/Inventory/Sales). It copies the private password locally; do not paste credentials into chat or Git. The owner UAT guide contains current routes.
