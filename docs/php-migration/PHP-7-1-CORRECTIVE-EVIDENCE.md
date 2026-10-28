# PHP-7.1 baseline and corrective evidence

All cases use separately provisioned synthetic MariaDB 10.11.19 schemas on loopback
3330; PHPUnit uses the independent loopback 3328 engine. No owner database/configuration
was loaded. Before behavior edits, the unchanged PHP-7 baseline was fetched/verified
at `91549079beedc4cee8f04199865ec5ad0dc41132` and PHP-5/PHP-6 differential suites ran
successfully on fresh schemas. Their original evidence is retained privately.

PHP-7-1-EVIDENCE.json records baseline and final machine evidence, full probe outcomes
and sanitized runtime grants. Passwords, cookies, SMTP secrets and private environment
files are excluded. Detailed request/SQL/SMTP/browser artifacts remain ignored locally.

## Original weaknesses reproduced

| Original probe | Baseline Express/PHP | Corrective Express/PHP |
| --- | --- | --- |
| Expense payload partyId non-null, SQL party_id null | HTTP 200 matched true | HTTP 200 matched false, EXPENSE_PARTY_EVIDENCE |
| SQL date 2099-01-01, payload date unchanged | HTTP 200 matched true | HTTP 200 matched false, DOCUMENT_DATE_MISMATCH |
| Saved fingerprint x repeated 64 times | HTTP 200 matched true | HTTP 200 matched false, COMMAND_FINGERPRINT_FORMAT |
| Expense JSON number 12.34 instead of string | HTTP 200 matched true | HTTP 200 matched false, AMOUNT_REPRESENTATION_INVALID |
| Zero expense/client receipt amount | HTTP 400 INVALID_AMOUNT | HTTP 200 matched false, AMOUNT_VALUE_INVALID; read remains diagnostic |

The fifth finding is also observed in the baseline's retained posted reversal 33:
source and SQL posted party are "1", but payload partyId and snapshot id are "2".
Total is "12.34", with debit "12.34" and credit "0.00". Thus correct accounting did
not establish a correct snapshot. New coordinated reversal tests retain that exact
financial result while deriving party/snapshot from the source. They additionally
inject an old contradictory draft, post it, and compare the unchanged original payment
row and the corrected new reversal evidence. No historical posted reversal is rewritten.

## Expanded controls

All 33 original corruption probes are retained. Expected outcomes deliberately change
for the four blind probes and two amount-error probes; they are not deleted or weakened.
Additional cases cover valid null versus missing/empty/boolean/numeric/object party
values; snapshot identity; all thirteen SQL/payload date comparisons; historical/leap/
current dates; malformed and consistent future dates; numeric, null, boolean, object,
array, exponent, negative and excessive-precision money; all thirteen amount metadata
types; line rate/credit and discount-summary types; malformed payload/receipt JSON;
historical pre-entry-version challans; historical missing snapshot/receipt compatibility;
bad key/hash/actor/result relationships; actor disagreement with posting audit; and
object containers masquerading as arrays of financial lines.

The well-formed all-zero fingerprint control remains mathematically matched and
explicitly unauthenticated. The missing post receipt control remains mathematically
matched with COMMAND_COVERAGE_UNVERIFIABLE/reviewRequired. Consistent future posted
dates likewise raise review warnings. These demonstrate limitations instead of hiding
them with false integrity guarantees. Known supported historical records remain valid.

Every reversible probe captures all ten business tables before and after reconciliation
in **both** databases and asserts exact equality. It then restores only the deliberately
injected synthetic corruption. No application reconciliation repair occurs. Additional
normal transactions, rejected posts, concurrent/replayed commands, rollback and real
lost-COMMIT acknowledgement tests remain in the original regression runners.

## Privilege and immutability observations

`php-7-1-privileges.mjs` uses the actual restricted runtime account, confirms the exact
loopback engine/port/schema, and executes denied statements. It does not infer privilege
restrictions solely from a grant-generation script. It also performs rolled-back no-op
checks proving the legitimate counter columns remain writable and exposing document/
password column limitations. The complete business snapshot is unchanged after probing.
SHOW GRANTS output excludes authentication/hash-bearing grant lines.

Application-level original-payment immutability, posted status/version guards and
UNIQUE(corrects_id) remain verified by full state comparisons and competing reversal
transactions. Browser tests include both eligible vendor methods, duplicate reversal,
reversal-of-reversal, rejected client Cash/Bank and allowed client Cheque Received.
Neither the tests nor this report claim SQL row-level immutable documents or command
fingerprint authenticity. See PHP-7-1-RELEASE-RISKS.md for the blocking decisions.
