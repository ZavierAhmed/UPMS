-- Provider DBA: only upms_v1; account already exists with SELECT only.
-- No password change, DDL, GRANT OPTION, receipt/control-state writes or journal mutation.
GRANT SELECT ON `upms\_v1`.* TO 'upms_runtime84'@'localhost';
GRANT INSERT ON `upms_v1`.`sessions` TO 'upms_runtime84'@'localhost';
GRANT INSERT ON `upms_v1`.`login_attempts` TO 'upms_runtime84'@'localhost';
GRANT INSERT ON `upms_v1`.`identity_audit_events` TO 'upms_runtime84'@'localhost';
GRANT INSERT ON `upms_v1`.`v1_items` TO 'upms_runtime84'@'localhost';
GRANT INSERT ON `upms_v1`.`v1_stock` TO 'upms_runtime84'@'localhost';
GRANT INSERT ON `upms_v1`.`v1_parties` TO 'upms_runtime84'@'localhost';
GRANT INSERT ON `upms_v1`.`v1_documents` TO 'upms_runtime84'@'localhost';
GRANT INSERT ON `upms_v1`.`v1_lines` TO 'upms_runtime84'@'localhost';
GRANT INSERT ON `upms_v1`.`v1_stock_journal` TO 'upms_runtime84'@'localhost';
GRANT INSERT ON `upms_v1`.`v1_party_journal` TO 'upms_runtime84'@'localhost';
GRANT INSERT ON `upms_v1`.`v1_audit` TO 'upms_runtime84'@'localhost';
GRANT INSERT ON `upms_v1`.`v1_commands` TO 'upms_runtime84'@'localhost';
GRANT DELETE ON `upms_v1`.`sessions` TO 'upms_runtime84'@'localhost';
GRANT DELETE ON `upms_v1`.`login_attempts` TO 'upms_runtime84'@'localhost';
GRANT UPDATE ON `upms_v1`.`sessions` TO 'upms_runtime84'@'localhost';
GRANT UPDATE ON `upms_v1`.`login_attempts` TO 'upms_runtime84'@'localhost';
GRANT UPDATE (`password_hash`, `authorization_version`, `updated_at`) ON `upms_v1`.`users` TO 'upms_runtime84'@'localhost';
GRANT UPDATE (`next_dc`, `next_item_code`) ON `upms_v1`.`v1_control` TO 'upms_runtime84'@'localhost';
GRANT UPDATE (`description`, `quality`, `colour`, `packing`, `remarks`, `active`, `version`, `selling_price`) ON `upms_v1`.`v1_items` TO 'upms_runtime84'@'localhost';
GRANT UPDATE (`name`, `phone`, `address`, `remarks`, `active`, `version`, `opening_verified`) ON `upms_v1`.`v1_parties` TO 'upms_runtime84'@'localhost';
GRANT UPDATE (`quantity`, `verified`) ON `upms_v1`.`v1_stock` TO 'upms_runtime84'@'localhost';
GRANT UPDATE (`kind`, `date`, `party_id`, `status`, `version`, `payload`, `total`, `corrects_id`, `official_number`, `sequence`, `sale_subtotal`, `discount_mode`, `discount_value`, `discount_amount`) ON `upms_v1`.`v1_documents` TO 'upms_runtime84'@'localhost';
SHOW GRANTS FOR 'upms_runtime84'@'localhost';
