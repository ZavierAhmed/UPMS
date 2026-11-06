# Updated release gates

| Gate | State | Evidence |
|---|---|---|
| Exact baseline | PASS | Local and remote P4.1 baseline matched 773fd1ade2a7c66b954e0c37f64fdae68c97589a. |
| Shared-guard PHP load | PASS | Five sessions for one operator and three same-session reads passed. |
| Held exclusive lock and revocation | PASS | READ_BUSY 503, logout 204, revoked read 401. |
| Overlapping Chrome and stale reads | PASS | Three tabs, two cookie contexts and eight navigation rounds. Stale request cancelled. |
| Distinct-user and mid-flight revocation acceptance | BLOCKED | The sessions belonged to one synthetic operator. |
| Hosted private-path denial | FAIL | External HTML 200 responses persist. Fresh origin SSH timed out. |
| Local catalogue-only candidate | PASS | 152 Apache checks, browser gallery and contact checks, verified ZIP. |
| Catalogue-only live release | BLOCKED | Hosted denial and separate publication approval required. |
| PHP inquiry delivery | BLOCKED | Hosted isolated integration, mail delivery and owner acceptance are outstanding. |
| Hosted Symfony remediation | BLOCKED | Live hashes, web SAPI, staging and publication approval are outstanding. |
| Independent recovery | BLOCKED | Actual offline key and independent operator proof required. |
| Production migration and activation | BLOCKED | P4.2 receipts, policies, backups and staging are outstanding. |

The isolated read/post/replay retry passed and proved one movement. The first attempt's opening-read 503 remains recorded in the multi-session report. Distinct-user, in-flight revocation and hosted acceptance remain open.
