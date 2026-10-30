<?php

declare(strict_types=1);

namespace App\Upms;

use PDO;

final class CleanSqlImport
{
    public const REFERENCE = 'php82-canonical-import-v1';
    public const IMPORTED = 'IMPORTED_NOT_ACTIVATED';
    public static function seeds(): array
    {
        $p = CleanInitialization::plan();
        $roles = [];
        $grants = [];
        foreach ($p['roles'] as $role) {
            $roles[] = ['code' => $role['code'],'name' => $role['name']];
            foreach ($role['permissions'] as $permission) {
                $grants[] = ['role_code' => $role['code'],'permission_code' => $permission];
            }
        }
        return ['identity_guard' => [['id' => 1]],'roles' => $roles,'permissions' => array_map(fn ($code) => ['code' => $code], $p['permissions']),'role_permissions' => $grants,'v1_control' => [['id' => 1,'version' => 1,'operator_id' => null,'state' => 'PENDING','next_dc' => 1,'entry_version' => 2,'next_item_code' => 1,'cutover_evidence' => 'Clean initialization: activation not authorized']]];
    }
    private static function literal(mixed $v): string
    {
        return $v === null ? 'NULL' : (is_int($v) ? (string)$v : "'".str_replace(["\\","'"], ["\\\\","''"], $v)."'");
    }
    public static function sql(): string
    {
        $hash = CleanInitialization::hash();
        $ddl = CleanInitialization::receiptDdl();
        $sql = "-- Unique Plastic Industry UPMS canonical clean import, MariaDB 10.11 only.\n-- NEW EMPTY explicitly approved selected database only. No USE, database creation, reset or activation.\n-- DDL is NOT transactionally atomic. Do not retry a failed/partial import.\nDELIMITER \$\$\nBEGIN NOT ATOMIC\n DECLARE v_owned BOOLEAN DEFAULT FALSE;\n DECLARE v_seed_tx BOOLEAN DEFAULT FALSE;\n DECLARE v_locked INT DEFAULT 0;\n DECLARE v_lock_name VARCHAR(64);\n DECLARE EXIT HANDLER FOR SQLEXCEPTION\n BEGIN\n  IF v_seed_tx THEN ROLLBACK; END IF;\n  IF v_owned THEN\n   UPDATE upms_production_migrations SET state='IMPORT_REVIEW_REQUIRED',step='partial-sql-import' WHERE id=1 AND reference='".self::REFERENCE."' AND plan_hash='$hash' AND target_hash='';\n   COMMIT;\n  END IF;\n  IF v_locked=1 THEN DO RELEASE_LOCK(v_lock_name); END IF;\n  RESIGNAL;\n END;\n IF DATABASE() IS NULL OR DATABASE() NOT REGEXP '^[A-Za-z0-9_]+$' OR LOWER(DATABASE()) IN ('upms','mysql','information_schema','performance_schema','sys') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='UPMS_IMPORT_SELECTED_TARGET_REJECTED'; END IF;\n IF VERSION() NOT REGEXP '^10[.]11[.][0-9]+-MariaDB' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='UPMS_IMPORT_ENGINE_REJECTED'; END IF;\n IF @@autocommit<>1 OR @@in_transaction<>0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='UPMS_IMPORT_FRESH_SESSION_REQUIRED'; END IF;\n SET v_lock_name=CONCAT('upms81:',SUBSTRING(SHA2(DATABASE(),256),1,48));\n SELECT GET_LOCK(v_lock_name,0) INTO v_locked;\n IF COALESCE(v_locked,0)<>1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='UPMS_IMPORT_LOCKED'; END IF;\n IF (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE())<>0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='UPMS_IMPORT_EMPTY_TARGET_REQUIRED'; END IF;\n SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;\n $ddl;\n INSERT INTO upms_production_migrations VALUES(1,'".self::REFERENCE."','$hash','','IMPORTING','schema');\n SET v_owned=TRUE;\n SET @upms82_database_ddl=CONCAT('ALTER DATABASE `',DATABASE(),'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');\n PREPARE upms82_charset FROM @upms82_database_ddl;\n EXECUTE upms82_charset;\n DEALLOCATE PREPARE upms82_charset;\n";
        foreach (CleanInitialization::plan()['tables'] as $table) {
            $sql .= $table['sql'].";\n";
        }
        $sql .= " START TRANSACTION;\n SET v_seed_tx=TRUE;\n";
        foreach (self::seeds() as $table => $rows) {
            foreach ($rows as $row) {
                $sql .= ' INSERT INTO `'.$table.'` (`'.implode('`,`', array_keys($row)).'`) VALUES('.implode(',', array_map(self::literal(...), array_values($row))).");\n";
            }
        }
        $sql .= " UPDATE upms_production_migrations SET state='".self::IMPORTED."',step='catalog-complete' WHERE id=1;\n COMMIT;\n SET v_seed_tx=FALSE;\n DO RELEASE_LOCK(v_lock_name);\n SET v_locked=0;\nEND\$\$\nDELIMITER ;\n";
        return $sql;
    }
    public static function digest(): string
    {
        return hash('sha256', self::sql());
    }
    public static function package(string $directory): array
    {
        if (is_link($directory)) {
            throw new \RuntimeException('IMPORT_PACKAGE_PATH_REJECTED');
        }
        $directory = realpath($directory);
        if (!$directory || is_link($directory)) {
            throw new \RuntimeException('IMPORT_PACKAGE_PATH_REJECTED');
        }
        $packageFiles = array_values(array_diff(scandir($directory), ['.','..']));
        sort($packageFiles);
        $expectedFiles = ['README-PHPMYADMIN-IMPORT.md','finalize-clean-import.php','upms-production-clean-manifest.json','upms-production-clean.sql','verify-clean-import.php'];
        sort($expectedFiles);
        if ($packageFiles !== $expectedFiles || is_link($directory.'/upms-production-clean-manifest.json')) {
            throw new \RuntimeException('IMPORT_PACKAGE_FILE_SET_REJECTED');
        }
        $manifest = json_decode(file_get_contents($directory.'/upms-production-clean-manifest.json'), true, 64, JSON_THROW_ON_ERROR);
        if (($manifest['format'] ?? '') !== 'upms-php82-clean-import-v1' || ($manifest['planHash'] ?? '') !== CleanInitialization::hash() || ($manifest['sqlSha256'] ?? '') !== self::digest() || !hash_equals(self::digest(), hash_file('sha256', $directory.'/upms-production-clean.sql'))) {
            throw new \RuntimeException('IMPORT_PACKAGE_DIGEST_REJECTED');
        }
        $expected = ['upms-production-clean.sql','README-PHPMYADMIN-IMPORT.md','verify-clean-import.php','finalize-clean-import.php'];
        $actual = array_keys($manifest['files'] ?? []);
        sort($expected);
        sort($actual);
        if ($actual !== $expected) {
            throw new \RuntimeException('IMPORT_PACKAGE_FILE_SET_REJECTED');
        }
        foreach ($manifest['files'] as $name => $sha) {
            if (!in_array($name, ['upms-production-clean.sql','README-PHPMYADMIN-IMPORT.md','verify-clean-import.php','finalize-clean-import.php'], true) || !is_string($sha) || is_link($directory.'/'.$name) || !is_file($directory.'/'.$name) || !hash_equals($sha, hash_file('sha256', $directory.'/'.$name))) {
                throw new \RuntimeException('IMPORT_PACKAGE_FILE_REJECTED');
            }
        }
        return $manifest;
    }
    public static function preflight(PDO $pdo): array
    {
        $schema = $pdo->query('SELECT DATABASE()')->fetchColumn();
        if (!is_string($schema) || !preg_match('/^[A-Za-z0-9_]+$/D', $schema) || in_array(strtolower($schema), ['upms','mysql','sys','information_schema','performance_schema'], true)) {
            throw new \RuntimeException('IMPORT_SELECTED_TARGET_REJECTED');
        }
        if ((int)$pdo->query('SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()')->fetchColumn() !== 0) {
            throw new \RuntimeException('IMPORT_EMPTY_TARGET_REQUIRED');
        }
        return ['verifiedEmpty' => true,'targetHash' => CleanInitialization::target($pdo),'selectedSchema' => $schema,'executionAuthorized' => false];
    }
    public static function verify(PDO $pdo, ?string $finalizedReference = null): array
    {
        $names = $pdo->query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME')->fetchAll(PDO::FETCH_COLUMN);
        $expected = array_merge(array_keys(Schema::TABLES), [CleanInitialization::RECEIPT]);
        sort($expected);
        sort($names);
        if ($names !== $expected) {
            throw new \RuntimeException('IMPORT_TABLE_SET_REJECTED');
        }
        CleanInitialization::verifySchema($pdo);
        if ($pdo->query('SELECT @@character_set_database')->fetchColumn() !== 'utf8mb4') {
            throw new \RuntimeException('IMPORT_DATABASE_CHARSET_REJECTED');
        }
        $q = $pdo->query("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND CHARACTER_SET_NAME IS NOT NULL AND CHARACTER_SET_NAME<>'utf8mb4'");
        if ((int)$q->fetchColumn() !== 0) {
            throw new \RuntimeException('IMPORT_TEXT_CHARSET_REJECTED');
        }
        foreach (array_merge(CleanInitialization::BUSINESS, ['users','user_roles','sessions','login_attempts']) as $table) {
            if ((int)$pdo->query('SELECT COUNT(*) FROM `'.$table.'`')->fetchColumn() !== 0) {
                throw new \RuntimeException('IMPORT_EXPECTED_EMPTY_TABLE_HAS_ROWS');
            }
        }
        foreach (self::seeds() as $table => $rows) {
            $actual = $pdo->query('SELECT * FROM `'.$table.'`')->fetchAll(PDO::FETCH_ASSOC);
            $normalize = static function ($data) {
                $result = [];
                foreach ($data as $row) {
                    ksort($row);
                    $row = array_map(fn ($v) => $v === null ? null : (string)$v, $row);
                    $result[] = json_encode($row, JSON_THROW_ON_ERROR);
                }sort($result);
                return $result;
            };
            if ($normalize($actual) !== $normalize($rows)) {
                throw new \RuntimeException('IMPORT_SEED_RECORDS_REJECTED');
            }
        }
        $receipt = $pdo->query('SELECT * FROM upms_production_migrations WHERE id=1')->fetch(PDO::FETCH_ASSOC);
        $expectedReceipt = ['id' => '1','reference' => $finalizedReference ?? self::REFERENCE,'plan_hash' => CleanInitialization::hash(),'target_hash' => $finalizedReference === null ? '' : CleanInitialization::target($pdo),'state' => $finalizedReference === null ? self::IMPORTED : 'SCHEMA_READY','step' => $finalizedReference === null ? 'catalog-complete' : self::digest()];
        if (!$receipt || array_map(static fn ($v) => (string)$v, $receipt) !== $expectedReceipt || (int)$pdo->query('SELECT COUNT(*) FROM upms_production_migrations')->fetchColumn() !== 1) {
            throw new \RuntimeException('IMPORT_RECEIPT_NOT_COMPLETE');
        }
        $events = $pdo->query('SELECT actor_id,target_id,action,correlation,details FROM identity_audit_events')->fetchAll(PDO::FETCH_ASSOC);
        if ($finalizedReference === null ? count($events) !== 0 : (count($events) !== 1 || $events[0]['actor_id'] !== null || $events[0]['target_id'] !== null || $events[0]['action'] !== 'production.sql-import.finalized' || $events[0]['correlation'] !== $finalizedReference || (json_decode($events[0]['details'], true, 16, JSON_THROW_ON_ERROR)['sqlSha256'] ?? null) !== self::digest())) {
            throw new \RuntimeException('IMPORT_UNEXPECTED_IDENTITY_HISTORY');
        }
        return ['verified' => true,'tables' => 20,'businessRows' => 0,'users' => 0,'state' => $finalizedReference === null ? self::IMPORTED : 'SCHEMA_READY','planHash' => CleanInitialization::hash(),'targetHash' => CleanInitialization::target($pdo),'posting' => 'DISABLED'];
    }
    public static function accounts(PDO $pdo, string $reference): array
    {
        CleanInitialization::verifySchema($pdo);
        CleanInitialization::provisionable($pdo, $reference);
        $users = $pdo->query('SELECT id,login_key,display_name,enabled,password_hash FROM users ORDER BY login_key')->fetchAll(PDO::FETCH_ASSOC);
        $roles = $pdo->query('SELECT u.login_key,r.role_code FROM user_roles r JOIN users u ON u.id=r.user_id ORDER BY u.login_key,r.role_code')->fetchAll(PDO::FETCH_ASSOC);
        if (count($users) !== 2 || array_column($users, 'login_key') !== ['admin','haris'] || array_column($users, 'display_name') !== ['Admin','Haris'] || array_map('intval', array_column($users, 'enabled')) !== [1,1] || $roles !== [['login_key' => 'admin','role_code' => 'administrator'],['login_key' => 'haris','role_code' => 'administrator']] || (string)$users[0]['id'] === (string)$users[1]['id'] || hash_equals($users[0]['password_hash'], $users[1]['password_hash'])) {
            throw new \RuntimeException('IMPORT_ADMINISTRATORS_REJECTED');
        }
        $permissions = $pdo->query("SELECT permission_code FROM role_permissions WHERE role_code='administrator' ORDER BY permission_code")->fetchAll(PDO::FETCH_COLUMN);
        $expected = CleanInitialization::plan()['permissions'];
        sort($expected);
        if ($permissions !== $expected) {
            throw new \RuntimeException('IMPORT_ADMIN_PERMISSIONS_REJECTED');
        }
        $audit = $pdo->prepare("SELECT details FROM identity_audit_events WHERE action='administrators.provisioned' AND correlation=?");
        $audit->execute([$reference]);
        $events = $audit->fetchAll(PDO::FETCH_COLUMN);
        $expectedIds = ['admin' => (string)$users[0]['id'], 'haris' => (string)$users[1]['id']];
        if (count($events) !== 1 || (json_decode($events[0], true, 32, JSON_THROW_ON_ERROR)['users'] ?? null) !== $expectedIds) {
            throw new \RuntimeException('IMPORT_PROVISIONING_AUDIT_REQUIRED');
        }
        foreach ($users as &$user) {
            $rotation = $pdo->prepare("SELECT details FROM identity_audit_events WHERE target_id=? AND action IN ('administrator.bootstrap','administrator.rotation.required') ORDER BY id DESC LIMIT 1");
            $rotation->execute([$user['id']]);
            $details = $rotation->fetchColumn();
            if (!$details || (json_decode($details, true, 16, JSON_THROW_ON_ERROR)['requirePasswordChange'] ?? false) !== true) {
                throw new \RuntimeException('IMPORT_PASSWORD_ROTATION_REQUIRED');
            }
            $user['passwordChangeRequired'] = true;
            if ((password_get_info($user['password_hash'])['algoName'] ?? null) !== 'argon2id') {
                throw new \RuntimeException('IMPORT_PASSWORD_ALGORITHM_REJECTED');
            }unset($user['password_hash']);
            $user['role'] = 'administrator';
        }unset($user);
        return ['verified' => true,'users' => $users,'applicationUserCount' => 2,'businessRows' => 0,'posting' => 'DISABLED','credentialsPrinted' => false];
    }
    public static function finalize(PDO $pdo, string $reference, string $receiptFile, string $approvedSqlDigest, ?array $legacyRecoveryWaiver = null): array
    {
        if (is_link($receiptFile) || is_link($receiptFile.'.pending') || !is_dir(dirname($receiptFile)) || !hash_equals(self::digest(), $approvedSqlDigest) || !preg_match('/^[A-Za-z0-9_-]{12,64}$/D', $reference)) {
            throw new \RuntimeException('IMPORT_FINALIZATION_APPROVAL_REJECTED');
        }
        $schema = $pdo->query('SELECT DATABASE()')->fetchColumn();
        $target = CleanInitialization::target($pdo);
        $lock = 'upms81:'.substr(hash('sha256', $schema), 0, 48);
        $q = $pdo->prepare('SELECT GET_LOCK(?,0)');
        $q->execute([$lock]);
        if ((int)$q->fetchColumn() !== 1) {
            throw new \RuntimeException('IMPORT_FINALIZATION_LOCKED');
        }
        try {
            $receipt = $pdo->query('SELECT * FROM upms_production_migrations WHERE id=1')->fetch(PDO::FETCH_ASSOC);
            $external = is_file($receiptFile) ? json_decode(file_get_contents($receiptFile), true, 32, JSON_THROW_ON_ERROR) : null;
            if ($external && (($external['reference'] ?? null) !== $reference || ($external['targetHash'] ?? null) !== $target || ($external['sqlSha256'] ?? null) !== self::digest() || ($external['planHash'] ?? null) !== CleanInitialization::hash() || ($external['schema'] ?? null) !== $schema || ($external['legacyRecoveryWaiver'] ?? null) !== $legacyRecoveryWaiver)) {
                throw new \RuntimeException('IMPORT_EXTERNAL_RECEIPT_CONFLICT');
            }
            $already = $receipt && $receipt['state'] === 'SCHEMA_READY' && $receipt['reference'] === $reference && $receipt['target_hash'] === $target && $receipt['plan_hash'] === CleanInitialization::hash() && $receipt['step'] === self::digest();
            if (!$already) {
                self::verify($pdo);
            } else {
                if (!$external) {
                    throw new \RuntimeException('IMPORT_EXTERNAL_RECEIPT_REQUIRED');
                }self::verify($pdo, $reference);
            }
            if ($external && !in_array($external['state'] ?? null, ['FINALIZATION_INTENT','SCHEMA_READY'], true)) {
                throw new \RuntimeException('IMPORT_EXTERNAL_STATE_REJECTED');
            }
            $record = ['schema' => $schema,'reference' => $reference,'planHash' => CleanInitialization::hash(),'targetHash' => $target,'sqlSha256' => self::digest(),'state' => 'FINALIZATION_INTENT','legacyRecoveryWaiver' => $legacyRecoveryWaiver];
            if (!$external) {
                CleanInitialization::privateReceipt($receiptFile, $record, true);
            }
            if (!$already) {
                $pdo->beginTransaction();
                try {
                    $pdo->query('SELECT id FROM identity_guard WHERE id=1 FOR UPDATE')->fetchColumn();
                    self::verify($pdo);
                    $q = $pdo->prepare("UPDATE upms_production_migrations SET reference=?,target_hash=?,state='SCHEMA_READY',step=? WHERE id=1");
                    $q->execute([$reference,$target,self::digest()]);
                    $q = $pdo->prepare("INSERT INTO identity_audit_events(actor_id,target_id,action,correlation,details,created_at) VALUES(NULL,NULL,'production.sql-import.finalized',?,?,UTC_TIMESTAMP(6))");
                    $q->execute([$reference,json_encode(['sqlSha256' => self::digest(),'principal' => $pdo->query('SELECT CURRENT_USER()')->fetchColumn(),'legacyRecoveryWaiver' => $legacyRecoveryWaiver], JSON_THROW_ON_ERROR)]);
                    $pdo->commit();
                } catch (\Throwable $e) {
                    if ($pdo->inTransaction()) {
                        $pdo->rollBack();
                    }throw $e;
                }
            }
            $record['state'] = 'SCHEMA_READY';
            CleanInitialization::privateReceipt($receiptFile, $record);
            return ['finalized' => true,'changed' => !$already,'state' => 'SCHEMA_READY','posting' => 'DISABLED','users' => 0,'sqlSha256' => self::digest()];
        } finally {
            $q = $pdo->prepare('SELECT RELEASE_LOCK(?)');
            $q->execute([$lock]);
        }
    }
}
