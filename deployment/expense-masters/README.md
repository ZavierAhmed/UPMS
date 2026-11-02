# Expense master extension — offline review only

P3.2B2 adds four tables and twelve guards to the reviewed P3.2A 25-table/60-guard model: **29 tables / 72 guards**. The review bundle is not an authorized GoDaddy installer. No category, employee, financial record, schema-finalization receipt, grant, account or activation is seeded by these files.

Generate a reproducible bundle into a new empty local directory:

```powershell
& .\tmp\php-runtime\bin\php.exe .\deployment\expense-masters\plan.php --output=C:\approved-local-review\new-empty-directory
node .\scripts\p32b2-expenses-plan-check.mjs
```

The generator never opens a database connection. SQL is canonical and manifest checksummed with LF line endings. DDL is not transactionally atomic: the future maintenance installer must preflight, stop on any failure and preserve a partial state for review. Do not blindly retry, drop/reset/reimport data or recreate administrators. The original 60 trigger definitions remain unchanged.

Before any hosted schema migration, separately authorize the cumulative release and upgrade the protected off-host producer/consumer to understand all 29 tables, 72 guards and expense history/snapshots. Independently restore genuine protected off-host evidence. The local in-memory encrypted restore prototype is not that production collector upgrade. See the [pending checklist](../../docs/phase-3.2b2/FUTURE-PRODUCTION-CHECKLIST.md).
