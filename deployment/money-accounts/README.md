# Money Accounts migration review bundle

**NOT APPROVED / NOT APPLIED. No production execution in P3.2A.**

`plan.php` only generates files; it has no database connection. `review-plan/` contains the reviewed canonical five-table DDL, four configurable master records, fifteen additional guard definitions and a checksum manifest. There are no financial openings, user creations, GRANTs, old-guard replacements, resets or activation statements.

Generate another review copy in a **new empty directory**, using the existing PHP runtime:

```powershell
& .\tmp\php-runtime\bin\php.exe .\deployment\money-accounts\plan.php --output=.\tmp\php-runtime\money-plan-new-review
```

An optional `--accounts=path-to-reviewed-config.json` accepts records with exactly `code`, `name`, `type` (CASH_HOLDER, BANK or CHEQUE_CUSTODY). Names are not used in financial calculations. No opening balance is accepted in configuration.

Do not execute these SQL files on GoDaddy as part of this milestone. Target verification, real recovery, maintenance controls, receipt finalization, private guard evidence, actual definer/runtime privilege checks and explicit release approval belong to a separate production milestone. DDL is not transactionally atomic: stop on failure and preserve partial state rather than retrying/resetting it.

See [migration/guard/recovery impact](../../docs/phase-3.2a/MIGRATION-AND-GUARDS.md) and [future production checklist](../../docs/phase-3.2a/FUTURE-PRODUCTION-CHECKLIST.md). In particular, the current 20-table/45-trigger backup must be upgraded before any hosted extension; the new in-memory snapshot prototype is not the scheduled off-host production backup.
