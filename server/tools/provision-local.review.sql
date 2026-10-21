-- P2.1A OWNER REVIEW: existing local XAMPP database upms only.
-- Require a fresh reviewed metadata checkpoint; never create/replace this database.
-- Phase A: check both account names at ALL hosts, then obtain owner authorization.
-- Known owner-created @% accounts must remain unchanged. Main execution is stopped
-- pending the separately reviewed docs/phase2/P2-1A-forward-plan.md exception.
-- Placeholders intentionally prevent execution until the owner supplies secrets privately.
CREATE USER 'upms_migrator'@'localhost' IDENTIFIED BY <OWNER_CHOSEN_MIGRATOR_PASSWORD_SQL_LITERAL>;
CREATE USER 'upms_runtime'@'localhost' IDENTIFIED BY <OWNER_CHOSEN_RUNTIME_PASSWORD_SQL_LITERAL>;
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES ON upms.* TO 'upms_migrator'@'localhost';
-- Apply unchanged 202610210001_identity.js explicitly as the migrator, with exact
-- DB_CONFIRM_NAME=upms, MariaDB opt-in and verified empty-schema checkpoint.
-- Phase B: only after complete identity schema/tracking verification.
GRANT SELECT, UPDATE ON upms.identity_guard TO 'upms_runtime'@'localhost';
GRANT SELECT, INSERT, UPDATE ON upms.users TO 'upms_runtime'@'localhost';
GRANT SELECT ON upms.roles TO 'upms_runtime'@'localhost';
GRANT SELECT ON upms.permissions TO 'upms_runtime'@'localhost';
GRANT SELECT, INSERT, DELETE ON upms.user_roles TO 'upms_runtime'@'localhost';
GRANT SELECT ON upms.role_permissions TO 'upms_runtime'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON upms.sessions TO 'upms_runtime'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON upms.login_attempts TO 'upms_runtime'@'localhost';
GRANT SELECT, INSERT ON upms.identity_audit_events TO 'upms_runtime'@'localhost';
-- No audit UPDATE/DELETE, DDL, delegation, wildcard-host or global runtime grants.
-- Test schemas/accounts require separate approval and use this same table allowlist
-- scoped to their exact dedicated schema. No DROP/TRUNCATE/REPLACE/ALTER USER/REVOKE.
