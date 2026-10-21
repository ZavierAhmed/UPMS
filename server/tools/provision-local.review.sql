-- OWNER REVIEW ONLY. Not invoked by the application, migration command or tests.
-- Run only against the intended local development MySQL Server as an authorized owner.
-- Replace both password placeholders privately; do not commit the resulting script.
-- CREATE fails if these names already exist; inspect and reconcile, never DROP to retry.
CREATE DATABASE upms_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- The angle-bracket placeholders intentionally prevent execution without owner editing.
CREATE USER 'upms_migrator'@'localhost' IDENTIFIED BY <PRIVATE_MIGRATION_PASSWORD_SQL_LITERAL>;
CREATE USER 'upms_runtime'@'localhost' IDENTIFIED BY <PRIVATE_RUNTIME_PASSWORD_SQL_LITERAL>;
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON upms_dev.* TO 'upms_migrator'@'localhost';
-- After reviewed migration, run these exact per-table runtime grants:
GRANT SELECT, UPDATE ON upms_dev.identity_guard TO 'upms_runtime'@'localhost';
GRANT SELECT, INSERT, UPDATE ON upms_dev.users TO 'upms_runtime'@'localhost';
GRANT SELECT ON upms_dev.roles TO 'upms_runtime'@'localhost';
GRANT SELECT ON upms_dev.permissions TO 'upms_runtime'@'localhost';
GRANT SELECT, INSERT, DELETE ON upms_dev.user_roles TO 'upms_runtime'@'localhost';
GRANT SELECT ON upms_dev.role_permissions TO 'upms_runtime'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON upms_dev.sessions TO 'upms_runtime'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON upms_dev.login_attempts TO 'upms_runtime'@'localhost';
GRANT SELECT, INSERT ON upms_dev.identity_audit_events TO 'upms_runtime'@'localhost';
-- Create a separate EMPTY upms_test_<unique_suffix> schema and a dedicated integration
-- migration account with grants scoped only to that exact schema, following the above pattern.
-- No production grants, wildcard host accounts, shared root account or automatic teardown.
