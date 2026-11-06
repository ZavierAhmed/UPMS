# Management release

Candidate is the existing React management UI with the active PHP Simple V1 backend. No old Node management substitution is allowed. Composer lock patches three Symfony components from 7.4.21 to 7.4.23; fresh audit is clean. PHP regressions after the update passed 169 tests / 1912 assertions. The existing hosted dependencies remain unchanged and require a separately approved rollout.

Production-only vendor staging contains 75 locked packages and 5850 verified files. Candidate examples keep all business extension flags and SMTP disabled, APP_KEY blank, and no database profile or credentials embedded. Packages exclude UAT fixtures, test bindings, backups, private keys and provisioning scripts.

Candidate Apache rules explicitly deny private paths and wrong-surface APIs; the Linux gateway requires a private backend outside the web root and fails closed if absent. These rules have not been validated on hosted Apache and are not deployed. Local syntax or PHP CLI checks cannot establish hosted routing acceptance.

The structural 47/133 rehearsal does not make this candidate operationally ready for existing production. Production profile contracts, genuine migration receipts and historical accounting coverage remain blocked. Draft artifact metadata records these limits. No live administrator, password, grant, guard, database record or activation setting was changed.
