# Fail-fast database workflow

Run `npm run database:preflight` from the repository root with an explicit local connection environment loaded privately from the saved credential profile. Do not put passwords in command arguments, source files, screenshots or chat. No environment files are loaded implicitly. A nonzero exit stops SQL work.

The read-only preflight checks actual database/version/account/port/server ID, InnoDB transactional availability, force recovery zero, read-only zero, visible table engines/count, operator migration history and migration lock, and exact restricted runtime grants. Optional UPMS_EXPECTED_SERVER_ID pins a reviewed instance ID; it is not a cryptographic identity. Connection configuration already restricts hosts to loopback. Operator checks accept only complete known schema stages (0, 11, 38 or 44 tables with matching ordered migration history), refusing partial DDL. Runtime sees only its 42 permitted tables; the two migration-tracking tables remain hidden. Operator checks must accompany runtime checks before acceptance or migrations.

Shared migrate() invokes operator preflight before invoking Knex migrations. Inventory/business operator tools invoke preflight before database mutations. The original identity/business SQL suites and new inventory suite invoke it before fixtures. The P2.3 wrapper checks runtime preflight before writing the acceptance-start marker, so mere unavailability does not consume a fresh, unpopulated run. Provisioning still refuses existing schemas/accounts/profiles and does not resume partial DDL.

Preflight is necessary, not sufficient to certify recovered data. Its result explicitly reports recoveryHealthCertified=false. A responding port, force_recovery=0 or successful SELECT does not prove tablespace consistency. Recovery still requires clean logs, complete accessibility/consistency checks, expected identity/business fingerprints, verified logical backup/restore and normal restart.

No preflight command starts XAMPP, edits configuration, enables force recovery, clears logs/files, initializes a schema or restores data. Missing credentials or unavailable server produces a sanitized failure. Unit/frontend tests can run without MariaDB. SQL tests must be recorded blocked while service is unhealthy.

P2.3A evidence: three new unit contract checks passed (part of 125 backend tests). A real read-only connection probe to the stopped original endpoint returned ECONNREFUSED and exit 1 with no startup or writes. Positive real-server preflight and SQL acceptance are pending specialist recovery. Unit fixtures are not counted as SQL evidence.

Subsequent P2.3B resumption passed positive main/operator/runtime preflight on port 3309, and the complete fresh SQL suites passed. The original unavailable-endpoint evidence remains retained.
