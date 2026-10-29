-- MANUAL metadata-only inspection in phpMyAdmin after owner verifies the selected account/server.
-- Does not select business/user/session rows and contains no writes or credentials.
SELECT VERSION() AS server_version, @@port AS server_port, @@server_id AS server_id,
       @@character_set_server AS server_charset, @@collation_server AS server_collation,
       @@read_only AS server_read_only, @@innodb_force_recovery AS force_recovery;
SELECT ENGINE,SUPPORT,TRANSACTIONS FROM information_schema.ENGINES WHERE ENGINE='InnoDB';
SELECT DEFAULT_CHARACTER_SET_NAME,DEFAULT_COLLATION_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=DATABASE();
SHOW SESSION STATUS LIKE 'Ssl_cipher';
-- A blank Ssl_cipher does not by itself classify a server-local socket as insecure.
-- Record whether this is a private local connection, a provider-protected path or remote TCP.
-- Do not run account/data inventory or initialization in this preflight step.
