-- REVIEW ONLY. Owner approval, verified recovery, maintenance and preflight are required.
-- DDL is not transactionally atomic. Stop on any error; never reset/retry a partial migration.
-- This plan does not create verified balances, grant privileges, update old guards or activate Money Accounts.
-- Maintenance identity only. No money movements or inferred opening rows.
INSERT INTO money_accounts(code,name,type) VALUES('HARIS_CASH','Haris','CASH_HOLDER');
INSERT INTO money_accounts(code,name,type) VALUES('JUNAID_CASH','Junaid','CASH_HOLDER');
INSERT INTO money_accounts(code,name,type) VALUES('UBL_OFFICIAL','UBL Official','BANK');
INSERT INTO money_accounts(code,name,type) VALUES('CHEQUES','Cheques','CHEQUE_CUSTODY');
