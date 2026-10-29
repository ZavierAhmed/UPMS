-- Unique Plastic Industry UPMS canonical clean import, MariaDB 10.11 only.
-- NEW EMPTY explicitly approved selected database only. No USE, database creation, reset or activation.
-- DDL is NOT transactionally atomic. Do not retry a failed/partial import.
DELIMITER $$
BEGIN NOT ATOMIC
 DECLARE v_owned BOOLEAN DEFAULT FALSE;
 DECLARE v_seed_tx BOOLEAN DEFAULT FALSE;
 DECLARE v_locked INT DEFAULT 0;
 DECLARE v_lock_name VARCHAR(64);
 DECLARE EXIT HANDLER FOR SQLEXCEPTION
 BEGIN
  IF v_seed_tx THEN ROLLBACK; END IF;
  IF v_owned THEN
   UPDATE upms_production_migrations SET state='IMPORT_REVIEW_REQUIRED',step='partial-sql-import' WHERE id=1 AND reference='php82-canonical-import-v1' AND plan_hash='6c75b59659dca955a2c9c95e907f4979e7d7ba3fd58979d6d2210c1eb701a24a' AND target_hash='';
   COMMIT;
  END IF;
  IF v_locked=1 THEN DO RELEASE_LOCK(v_lock_name); END IF;
  RESIGNAL;
 END;
 IF DATABASE() IS NULL OR DATABASE() NOT REGEXP '^[A-Za-z0-9_]+$' OR LOWER(DATABASE()) IN ('upms','mysql','information_schema','performance_schema','sys') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='UPMS_IMPORT_SELECTED_TARGET_REJECTED'; END IF;
 IF VERSION() NOT REGEXP '^10[.]11[.][0-9]+-MariaDB' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='UPMS_IMPORT_ENGINE_REJECTED'; END IF;
 IF @@autocommit<>1 OR @@in_transaction<>0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='UPMS_IMPORT_FRESH_SESSION_REQUIRED'; END IF;
 SET v_lock_name=CONCAT('upms81:',SUBSTRING(SHA2(DATABASE(),256),1,48));
 SELECT GET_LOCK(v_lock_name,0) INTO v_locked;
 IF COALESCE(v_locked,0)<>1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='UPMS_IMPORT_LOCKED'; END IF;
 IF (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE())<>0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='UPMS_IMPORT_EMPTY_TARGET_REQUIRED'; END IF;
 SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;
 CREATE TABLE `upms_production_migrations` (
  `id` int(11) NOT NULL,
  `reference` varchar(64) NOT NULL,
  `plan_hash` char(64) NOT NULL,
  `target_hash` char(64) NOT NULL,
  `state` varchar(32) NOT NULL,
  `step` varchar(64) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 INSERT INTO upms_production_migrations VALUES(1,'php82-canonical-import-v1','6c75b59659dca955a2c9c95e907f4979e7d7ba3fd58979d6d2210c1eb701a24a','','IMPORTING','schema');
 SET v_owned=TRUE;
 SET @upms82_database_ddl=CONCAT('ALTER DATABASE `',DATABASE(),'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
 PREPARE upms82_charset FROM @upms82_database_ddl;
 EXECUTE upms82_charset;
 DEALLOCATE PREPARE upms82_charset;
CREATE TABLE `identity_guard` (
  `id` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `login_key` varchar(64) NOT NULL,
  `display_name` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `authorization_version` int(10) unsigned NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL,
  `updated_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_login_key_unique` (`login_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `roles` (
  `code` varchar(32) NOT NULL,
  `name` varchar(64) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `permissions` (
  `code` varchar(64) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `user_roles` (
  `user_id` bigint(20) unsigned NOT NULL,
  `role_code` varchar(32) NOT NULL,
  PRIMARY KEY (`user_id`,`role_code`),
  KEY `user_roles_role_code_foreign` (`role_code`),
  CONSTRAINT `user_roles_role_code_foreign` FOREIGN KEY (`role_code`) REFERENCES `roles` (`code`),
  CONSTRAINT `user_roles_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `role_permissions` (
  `role_code` varchar(32) NOT NULL,
  `permission_code` varchar(64) NOT NULL,
  PRIMARY KEY (`role_code`,`permission_code`),
  KEY `role_permissions_permission_code_foreign` (`permission_code`),
  CONSTRAINT `role_permissions_permission_code_foreign` FOREIGN KEY (`permission_code`) REFERENCES `permissions` (`code`),
  CONSTRAINT `role_permissions_role_code_foreign` FOREIGN KEY (`role_code`) REFERENCES `roles` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `sessions` (
  `token_hash` varchar(64) NOT NULL,
  `user_id` bigint(20) unsigned DEFAULT NULL,
  `data` text NOT NULL,
  `idle_expires` bigint(20) NOT NULL,
  `absolute_expires` bigint(20) NOT NULL,
  `revoked` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`token_hash`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_idle_expires_index` (`idle_expires`),
  KEY `sessions_absolute_expires_index` (`absolute_expires`),
  CONSTRAINT `sessions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `identity_audit_events` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `actor_id` bigint(20) unsigned DEFAULT NULL,
  `target_id` bigint(20) unsigned DEFAULT NULL,
  `action` varchar(64) NOT NULL,
  `correlation` varchar(64) NOT NULL,
  `details` text NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `identity_audit_events_actor_id_foreign` (`actor_id`),
  KEY `identity_audit_events_target_id_id_index` (`target_id`,`id`),
  CONSTRAINT `identity_audit_events_actor_id_foreign` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`),
  CONSTRAINT `identity_audit_events_target_id_foreign` FOREIGN KEY (`target_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `login_attempts` (
  `bucket` varchar(64) NOT NULL,
  `window_start` bigint(20) NOT NULL,
  `attempts` int(10) unsigned NOT NULL,
  PRIMARY KEY (`bucket`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `v1_control` (
  `id` int(11) NOT NULL,
  `version` int(11) NOT NULL,
  `operator_id` bigint(20) unsigned DEFAULT NULL,
  `state` varchar(20) NOT NULL,
  `next_dc` int(10) unsigned NOT NULL,
  `cutover_evidence` text DEFAULT NULL,
  `entry_version` int(11) NOT NULL DEFAULT 2,
  `next_item_code` bigint(20) unsigned NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `v1_control_operator_id_foreign` (`operator_id`),
  CONSTRAINT `v1_control_operator_id_foreign` FOREIGN KEY (`operator_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `v1_items` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(64) NOT NULL,
  `description` varchar(200) NOT NULL,
  `quality` varchar(100) NOT NULL,
  `colour` varchar(100) NOT NULL,
  `packing` varchar(100) NOT NULL,
  `remarks` text NOT NULL,
  `active` tinyint(1) NOT NULL,
  `version` int(11) NOT NULL,
  `selling_price` decimal(18,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `v1_items_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `v1_parties` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `kind` varchar(10) NOT NULL,
  `name` varchar(150) NOT NULL,
  `phone` varchar(64) NOT NULL,
  `address` text NOT NULL,
  `remarks` text NOT NULL,
  `active` tinyint(1) NOT NULL,
  `opening_verified` tinyint(1) NOT NULL DEFAULT 0,
  `version` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `v1_parties_kind_name_unique` (`kind`,`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `v1_stock` (
  `item_id` bigint(20) unsigned NOT NULL,
  `quantity` decimal(18,0) NOT NULL DEFAULT 0,
  `verified` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`item_id`),
  CONSTRAINT `v1_stock_item_id_foreign` FOREIGN KEY (`item_id`) REFERENCES `v1_items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `v1_documents` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `kind` varchar(30) NOT NULL,
  `date` date NOT NULL,
  `party_id` bigint(20) unsigned DEFAULT NULL,
  `status` varchar(12) NOT NULL,
  `version` int(11) NOT NULL,
  `payload` longtext NOT NULL,
  `official_number` varchar(24) DEFAULT NULL,
  `sequence` int(10) unsigned DEFAULT NULL,
  `total` decimal(18,2) NOT NULL DEFAULT 0.00,
  `corrects_id` bigint(20) unsigned DEFAULT NULL,
  `actor_id` bigint(20) unsigned NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `sale_subtotal` decimal(18,2) DEFAULT NULL,
  `discount_mode` varchar(12) DEFAULT NULL,
  `discount_value` decimal(18,2) DEFAULT NULL,
  `discount_amount` decimal(18,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `v1_documents_official_number_unique` (`official_number`),
  UNIQUE KEY `v1_documents_sequence_unique` (`sequence`),
  UNIQUE KEY `v1_documents_corrects_id_unique` (`corrects_id`),
  KEY `v1_documents_party_id_foreign` (`party_id`),
  KEY `v1_documents_actor_id_foreign` (`actor_id`),
  CONSTRAINT `v1_documents_actor_id_foreign` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`),
  CONSTRAINT `v1_documents_corrects_id_foreign` FOREIGN KEY (`corrects_id`) REFERENCES `v1_documents` (`id`),
  CONSTRAINT `v1_documents_party_id_foreign` FOREIGN KEY (`party_id`) REFERENCES `v1_parties` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `v1_lines` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `document_id` bigint(20) unsigned NOT NULL,
  `line_no` int(11) NOT NULL,
  `item_id` bigint(20) unsigned NOT NULL,
  `snapshot` text NOT NULL,
  `quantity` decimal(18,0) NOT NULL,
  `rate` decimal(18,2) NOT NULL,
  `amount` decimal(18,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `v1_lines_document_id_line_no_unique` (`document_id`,`line_no`),
  KEY `v1_lines_item_id_foreign` (`item_id`),
  CONSTRAINT `v1_lines_document_id_foreign` FOREIGN KEY (`document_id`) REFERENCES `v1_documents` (`id`),
  CONSTRAINT `v1_lines_item_id_foreign` FOREIGN KEY (`item_id`) REFERENCES `v1_items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `v1_stock_journal` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `document_id` bigint(20) unsigned NOT NULL,
  `item_id` bigint(20) unsigned NOT NULL,
  `delta` decimal(18,0) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `v1_stock_journal_document_id_item_id_unique` (`document_id`,`item_id`),
  KEY `v1_stock_journal_item_id_foreign` (`item_id`),
  CONSTRAINT `v1_stock_journal_document_id_foreign` FOREIGN KEY (`document_id`) REFERENCES `v1_documents` (`id`),
  CONSTRAINT `v1_stock_journal_item_id_foreign` FOREIGN KEY (`item_id`) REFERENCES `v1_items` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `v1_party_journal` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `document_id` bigint(20) unsigned NOT NULL,
  `party_id` bigint(20) unsigned NOT NULL,
  `debit` decimal(18,2) NOT NULL,
  `credit` decimal(18,2) NOT NULL,
  `particulars` varchar(200) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `v1_party_journal_document_id_party_id_unique` (`document_id`,`party_id`),
  KEY `v1_party_journal_party_id_foreign` (`party_id`),
  CONSTRAINT `v1_party_journal_document_id_foreign` FOREIGN KEY (`document_id`) REFERENCES `v1_documents` (`id`),
  CONSTRAINT `v1_party_journal_party_id_foreign` FOREIGN KEY (`party_id`) REFERENCES `v1_parties` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `v1_audit` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `actor_id` bigint(20) unsigned NOT NULL,
  `action` varchar(64) NOT NULL,
  `reference` varchar(100) NOT NULL,
  `reason` text NOT NULL,
  `created_at` datetime(6) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `v1_audit_actor_id_foreign` (`actor_id`),
  CONSTRAINT `v1_audit_actor_id_foreign` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `v1_commands` (
  `key` varchar(36) NOT NULL,
  `actor_id` bigint(20) unsigned NOT NULL,
  `fingerprint` varchar(64) NOT NULL,
  `result` longtext NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
 START TRANSACTION;
 SET v_seed_tx=TRUE;
 INSERT INTO `identity_guard` (`id`) VALUES(1);
 INSERT INTO `roles` (`code`,`name`) VALUES('administrator','Administrator');
 INSERT INTO `roles` (`code`,`name`) VALUES('inventory','Inventory');
 INSERT INTO `roles` (`code`,`name`) VALUES('sales_dispatch','Sales/Dispatch');
 INSERT INTO `roles` (`code`,`name`) VALUES('accounts','Accounts');
 INSERT INTO `permissions` (`code`) VALUES('portal.access');
 INSERT INTO `permissions` (`code`) VALUES('profile.read');
 INSERT INTO `permissions` (`code`) VALUES('profile.password');
 INSERT INTO `permissions` (`code`) VALUES('sessions.self');
 INSERT INTO `permissions` (`code`) VALUES('users.read');
 INSERT INTO `permissions` (`code`) VALUES('users.create');
 INSERT INTO `permissions` (`code`) VALUES('users.update');
 INSERT INTO `permissions` (`code`) VALUES('roles.read');
 INSERT INTO `permissions` (`code`) VALUES('roles.assign');
 INSERT INTO `permissions` (`code`) VALUES('audit.read');
 INSERT INTO `permissions` (`code`) VALUES('sessions.revoke');
 INSERT INTO `role_permissions` (`role_code`,`permission_code`) VALUES('administrator','portal.access');
 INSERT INTO `role_permissions` (`role_code`,`permission_code`) VALUES('administrator','profile.read');
 INSERT INTO `role_permissions` (`role_code`,`permission_code`) VALUES('administrator','profile.password');
 INSERT INTO `role_permissions` (`role_code`,`permission_code`) VALUES('administrator','sessions.self');
 INSERT INTO `role_permissions` (`role_code`,`permission_code`) VALUES('administrator','users.read');
 INSERT INTO `role_permissions` (`role_code`,`permission_code`) VALUES('administrator','users.create');
 INSERT INTO `role_permissions` (`role_code`,`permission_code`) VALUES('administrator','users.update');
 INSERT INTO `role_permissions` (`role_code`,`permission_code`) VALUES('administrator','roles.read');
 INSERT INTO `role_permissions` (`role_code`,`permission_code`) VALUES('administrator','roles.assign');
 INSERT INTO `role_permissions` (`role_code`,`permission_code`) VALUES('administrator','audit.read');
 INSERT INTO `role_permissions` (`role_code`,`permission_code`) VALUES('administrator','sessions.revoke');
 INSERT INTO `role_permissions` (`role_code`,`permission_code`) VALUES('inventory','portal.access');
 INSERT INTO `role_permissions` (`role_code`,`permission_code`) VALUES('inventory','profile.read');
 INSERT INTO `role_permissions` (`role_code`,`permission_code`) VALUES('inventory','profile.password');
 INSERT INTO `role_permissions` (`role_code`,`permission_code`) VALUES('inventory','sessions.self');
 INSERT INTO `role_permissions` (`role_code`,`permission_code`) VALUES('sales_dispatch','portal.access');
 INSERT INTO `role_permissions` (`role_code`,`permission_code`) VALUES('sales_dispatch','profile.read');
 INSERT INTO `role_permissions` (`role_code`,`permission_code`) VALUES('sales_dispatch','profile.password');
 INSERT INTO `role_permissions` (`role_code`,`permission_code`) VALUES('sales_dispatch','sessions.self');
 INSERT INTO `role_permissions` (`role_code`,`permission_code`) VALUES('accounts','portal.access');
 INSERT INTO `role_permissions` (`role_code`,`permission_code`) VALUES('accounts','profile.read');
 INSERT INTO `role_permissions` (`role_code`,`permission_code`) VALUES('accounts','profile.password');
 INSERT INTO `role_permissions` (`role_code`,`permission_code`) VALUES('accounts','sessions.self');
 INSERT INTO `v1_control` (`id`,`version`,`operator_id`,`state`,`next_dc`,`entry_version`,`next_item_code`,`cutover_evidence`) VALUES(1,1,NULL,'PENDING',1,2,1,'Clean initialization: activation not authorized');
 UPDATE upms_production_migrations SET state='IMPORTED_NOT_ACTIVATED',step='catalog-complete' WHERE id=1;
 COMMIT;
 SET v_seed_tx=FALSE;
 DO RELEASE_LOCK(v_lock_name);
 SET v_locked=0;
END$$
DELIMITER ;
