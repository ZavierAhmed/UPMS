<?php

declare(strict_types=1);

namespace App\Upms;

use PDO;

/** Private maintenance service only. DDL is deliberately outside a fictional transaction rollback. */
final class CleanInitialization
{
    public const RECEIPT = 'upms_production_migrations';
    public const BUSINESS = ['v1_items','v1_stock','v1_parties','v1_documents','v1_lines','v1_stock_journal','v1_party_journal','v1_audit','v1_commands'];
    public static function target(PDO $pdo): string
    {
        $row = $pdo->query('SELECT DATABASE() schema_name,@@server_id server_id,@@hostname server_hostname,VERSION() version')->fetch(PDO::FETCH_ASSOC);
        return hash('sha256', json_encode(array_map('strval', $row), JSON_THROW_ON_ERROR));
    }
    public static function receiptDdl(): string
    {
        return json_decode(file_get_contents(dirname(__DIR__, 2).'/resources/production-receipt-schema.json'), true, 16, JSON_THROW_ON_ERROR)['sql'];
    }
    public static function verifySchema(PDO $pdo): void
    {
        foreach (self::plan()['tables'] as $table) {
            self::verifyTable($pdo, $table);
        }
        self::verifyTable($pdo, ['table' => self::RECEIPT,'sql' => self::receiptDdl()]);
    }
    public static function plan(): array
    {
        $plan = json_decode(file_get_contents(dirname(__DIR__, 2).'/resources/production-schema.json'), true, 64, JSON_THROW_ON_ERROR);
        $names = array_column($plan['tables'], 'table');
        $expected = array_keys(Schema::TABLES);
        sort($names);
        sort($expected);
        if ($names !== $expected) {
            throw new \RuntimeException('CANONICAL_SCHEMA_INCOMPLETE');
        }
        foreach ($plan['tables'] as $table) {
            if (!str_starts_with($table['sql'], 'CREATE TABLE `'.$table['table'].'` (') || !str_contains($table['sql'], 'ENGINE=InnoDB') || !str_contains($table['sql'], 'CHARSET=utf8mb4')) {
                throw new \RuntimeException('CANONICAL_DDL_REJECTED');
            }
        }
        return $plan;
    }
    public static function hash(): string
    {
        return hash('sha256', json_encode(['schema' => self::plan(),'receiptVersion' => 2], JSON_THROW_ON_ERROR));
    }
    public static function normalize(string $ddl): string
    {
        return preg_replace('/ AUTO_INCREMENT=[0-9]+/', '', $ddl);
    }
    private static function tables(PDO $pdo): array
    {
        return $pdo->query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME")->fetchAll(PDO::FETCH_COLUMN);
    }
    public static function privateReceipt(string $path, array $data, bool $first = false): void
    {
        $temp = $first ? $path : $path.'.pending';
        $f = fopen($temp, 'xb');
        if (!$f) {
            throw new \RuntimeException('PRIVATE_RECEIPT_REVIEW_REQUIRED');
        }chmod($temp, 0600);
        try {
            $bytes = json_encode($data, JSON_THROW_ON_ERROR);
            if (fwrite($f, $bytes) !== strlen($bytes)) {
                throw new \RuntimeException('PRIVATE_RECEIPT_WRITE_FAILED');
            }
            if (!fflush($f) || !function_exists('fsync') || !fsync($f)) {
                throw new \RuntimeException('PRIVATE_RECEIPT_SYNC_FAILED');
            }
        } finally {
            fclose($f);
        }
        if (!$first && !rename($temp, $path)) {
            throw new \RuntimeException('PRIVATE_RECEIPT_FINALIZE_FAILED');
        }
    }
    private static function state(PDO $pdo, string $state, string $step): void
    {
        $q = $pdo->prepare('UPDATE upms_production_migrations SET state=?,step=? WHERE id=1');
        $q->execute([$state,$step]);
    }
    public static function verifyTable(PDO $pdo, array $table): void
    {
        $actual = $pdo->query('SHOW CREATE TABLE `'.$table['table'].'`')->fetch(PDO::FETCH_ASSOC);
        if (self::normalize($actual['Create Table']) !== self::normalize($table['sql'])) {
            throw new \RuntimeException('PARTIAL_DDL_SCHEMA_MISMATCH');
        }
    }
    public static function initialize(PDO $pdo, string $reference, string $privateReceipt, bool $reviewedResume = false, ?\Closure $afterDdl = null): array
    {
        if (!preg_match('/^[a-zA-Z0-9_-]{12,64}$/D', $reference) || !is_dir(dirname($privateReceipt)) || is_link($privateReceipt)) {
            throw new \RuntimeException('INITIALIZATION_REFERENCE_REJECTED');
        }
        $schema = $pdo->query('SELECT DATABASE()')->fetchColumn();
        $hash = self::hash();
        $targetKey = self::target($pdo);
        $lock = 'upms81:'.substr(hash('sha256', $schema), 0, 48);
        $q = $pdo->prepare('SELECT GET_LOCK(?,0)');
        $q->execute([$lock]);
        if ((int)$q->fetchColumn() !== 1) {
            throw new \RuntimeException('INITIALIZATION_LOCKED');
        }
        try {
            $tables = self::tables($pdo);
            $external = is_file($privateReceipt) ? json_decode(file_get_contents($privateReceipt), true, 16, JSON_THROW_ON_ERROR) : null;
            if ($external) {
                if (($external['schema'] ?? null) !== $schema || ($external['reference'] ?? null) !== $reference || ($external['planHash'] ?? null) !== $hash || ($external['targetHash'] ?? null) !== $targetKey) {
                    throw new \RuntimeException('INITIALIZATION_RECEIPT_CONFLICT');
                }
            } elseif ($tables) {
                throw new \RuntimeException('EMPTY_TARGET_REQUIRED');
            } else {
                self::privateReceipt($privateReceipt, ['schema' => $schema,'reference' => $reference,'planHash' => $hash,'targetHash' => $targetKey,'state' => 'INTENT'], true);
            }
            $allowed = array_merge([self::RECEIPT], array_column(self::plan()['tables'], 'table'));
            if (array_diff($tables, $allowed)) {
                throw new \RuntimeException('UNEXPECTED_TARGET_TABLES');
            }
            if (!in_array(self::RECEIPT, $tables, true)) {
                if ($tables || ($external && !$reviewedResume)) {
                    throw new \RuntimeException('PARTIAL_DDL_REVIEW_REQUIRED');
                }
                $pdo->exec(self::receiptDdl());
                $q = $pdo->prepare("INSERT INTO upms_production_migrations VALUES(1,?,?,?,'DDL','receipt')");
                $q->execute([$reference,$hash,$targetKey]);
            } else {
                $receipt = $pdo->query('SELECT * FROM upms_production_migrations WHERE id=1')->fetch(PDO::FETCH_ASSOC);
                if (!$receipt || $receipt['reference'] !== $reference || $receipt['plan_hash'] !== $hash || ($receipt['target_hash'] ?? null) !== $targetKey) {
                    throw new \RuntimeException('PARTIAL_RECEIPT_REVIEW_REQUIRED');
                }
                if (in_array($receipt['state'], ['SCHEMA_READY','BOUND','ACTIVATED'], true)) {
                    if ($pdo->query('SELECT @@character_set_database')->fetchColumn() !== 'utf8mb4') {
                        throw new \RuntimeException('CLEAN_DATABASE_CHARSET_REJECTED');
                    }
                    foreach (self::plan()['tables'] as $table) {
                        self::verifyTable($pdo, $table);
                    }
                    if (($external['state'] ?? null) !== 'SCHEMA_READY') {
                        if (!$reviewedResume) {
                            throw new \RuntimeException('PARTIAL_PRIVATE_RECEIPT_REVIEW_REQUIRED');
                        }self::privateReceipt($privateReceipt, ['schema' => $schema,'reference' => $reference,'planHash' => $hash,'targetHash' => $targetKey,'state' => 'SCHEMA_READY']);
                    }
                    return ['changed' => false,'state' => $receipt['state'],'tables' => 20];
                }
                if (!$reviewedResume) {
                    throw new \RuntimeException('PARTIAL_DDL_REVIEW_REQUIRED');
                }
            }
            $allowed = array_merge([self::RECEIPT], array_column(self::plan()['tables'], 'table'));
            if (array_diff(self::tables($pdo), $allowed)) {
                throw new \RuntimeException('UNEXPECTED_TARGET_TABLES');
            }
            // Explicitly correct the clean schema default, independent of the server latin1 default.
            self::state($pdo, 'DDL', 'database-charset');
            $pdo->exec('ALTER DATABASE `'.str_replace('`', '``', $schema).'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
            foreach (self::plan()['tables'] as $i => $table) {
                self::state($pdo, 'DDL_INTENT', $table['table']);
                if (!in_array($table['table'], self::tables($pdo), true)) {
                    $pdo->exec($table['sql']);
                    if ($afterDdl) {
                        $afterDdl($i + 1);
                    }
                }
                self::verifyTable($pdo, $table);
                if ((int)$pdo->query('SELECT COUNT(*) FROM `'.$table['table'].'`')->fetchColumn() !== 0) {
                    throw new \RuntimeException('PARTIAL_TARGET_CONTAINS_DATA');
                }
                self::state($pdo, 'DDL_DONE', $table['table']);
            }
            $plan = self::plan();
            $pdo->beginTransaction();
            try {
                $pdo->exec('INSERT INTO identity_guard(id) VALUES(1)');
                foreach ($plan['permissions'] as $permission) {
                    $q = $pdo->prepare('INSERT INTO permissions(code) VALUES(?)');
                    $q->execute([$permission]);
                }
                foreach ($plan['roles'] as $role) {
                    $q = $pdo->prepare('INSERT INTO roles(code,name) VALUES(?,?)');
                    $q->execute([$role['code'],$role['name']]);
                    foreach ($role['permissions'] as $permission) {
                        $q = $pdo->prepare('INSERT INTO role_permissions(role_code,permission_code) VALUES(?,?)');
                        $q->execute([$role['code'],$permission]);
                    }
                }
                $pdo->exec("INSERT INTO v1_control(id,version,operator_id,state,next_dc,entry_version,next_item_code,cutover_evidence) VALUES(1,1,NULL,'PENDING',1,2,1,'Clean initialization: activation not authorized')");
                self::state($pdo, 'SCHEMA_READY', 'system-catalog');
                $pdo->commit();
            } catch (\Throwable $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }throw $e;
            }
            self::privateReceipt($privateReceipt, ['schema' => $schema,'reference' => $reference,'planHash' => $hash,'targetHash' => $targetKey,'state' => 'SCHEMA_READY']);
            return ['changed' => true,'state' => 'SCHEMA_READY','tables' => 20,'businessRecords' => 0];
        } finally {
            $q = $pdo->prepare('SELECT RELEASE_LOCK(?)');
            $q->execute([$lock]);
        }
    }
    public static function provisionable(PDO $pdo, string $reference): void
    {
        if ((int) $pdo->query("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='upms_production_migrations'")->fetchColumn() !== 1) {
            throw new \RuntimeException('CLEAN_SCHEMA_RECEIPT_REQUIRED');
        }
        $receipt = $pdo->query('SELECT * FROM upms_production_migrations WHERE id=1')->fetch(PDO::FETCH_ASSOC);
        if (!$receipt || $receipt['reference'] !== $reference || $receipt['plan_hash'] !== self::hash() || ($receipt['target_hash'] ?? null) !== self::target($pdo) || !in_array($receipt['state'], ['SCHEMA_READY','BOUND'], true)
            || $pdo->query('SELECT state FROM v1_control WHERE id=1')->fetchColumn() !== 'PENDING') {
            throw new \RuntimeException('CLEAN_PROVISIONING_STATE_REJECTED');
        }
        foreach (self::plan()['tables'] as $table) {
            self::verifyTable($pdo, $table);
        }
        foreach (self::BUSINESS as $table) {
            if ((int) $pdo->query('SELECT COUNT(*) FROM `'.$table.'`')->fetchColumn()) {
                throw new \RuntimeException('CLEAN_BUSINESS_DATA_REQUIRED');
            }
        }
    }
    private static function identities(PDO $pdo): array
    {
        $users = $pdo->query('SELECT id,login_key,display_name,enabled FROM users ORDER BY login_key')->fetchAll(PDO::FETCH_ASSOC);
        $roles = $pdo->query('SELECT u.login_key,r.role_code FROM user_roles r JOIN users u ON u.id=r.user_id ORDER BY u.login_key,r.role_code')->fetchAll(PDO::FETCH_ASSOC);
        $permissions = $pdo->query("SELECT permission_code FROM role_permissions WHERE role_code='administrator' ORDER BY permission_code")->fetchAll(PDO::FETCH_COLUMN);
        $expected = self::plan()['permissions'];
        sort($expected);
        if (count($users) !== 2 || array_column($users, 'login_key') !== ['admin','haris'] || array_column($users, 'display_name') !== ['Admin','Haris'] || array_map('intval', array_column($users, 'enabled')) !== [1,1]
            || $roles !== [['login_key' => 'admin','role_code' => 'administrator'], ['login_key' => 'haris','role_code' => 'administrator']] || $permissions !== $expected) {
            throw new \RuntimeException('CLEAN_ADMINISTRATORS_REJECTED');
        }
        return ['admin' => (string) $users[0]['id'], 'haris' => (string) $users[1]['id']];
    }
    public static function bind(PDO $pdo, array $ids, string $reference): array
    {
        $pdo->beginTransaction();
        try {
            $pdo->query('SELECT id FROM identity_guard WHERE id=1 FOR UPDATE')->fetchColumn();
            $receipt = $pdo->query('SELECT * FROM upms_production_migrations WHERE id=1 FOR UPDATE')->fetch(PDO::FETCH_ASSOC);
            if (!$receipt || $receipt['reference'] !== $reference || $receipt['plan_hash'] !== self::hash() || ($receipt['target_hash'] ?? null) !== self::target($pdo) || !in_array($receipt['state'], ['SCHEMA_READY','BOUND'], true)) {
                throw new \RuntimeException('CLEAN_BINDING_STATE_REJECTED');
            }
            if (self::identities($pdo) !== $ids) {
                throw new \RuntimeException('CLEAN_ADMINISTRATORS_REJECTED');
            }
            foreach (self::BUSINESS as $table) {
                if ((int)$pdo->query('SELECT COUNT(*) FROM `'.$table.'`')->fetchColumn()) {
                    throw new \RuntimeException('CLEAN_BUSINESS_DATA_REQUIRED');
                }
            }
            $q = $pdo->prepare("UPDATE v1_control SET operator_id=?,state='PENDING' WHERE id=1");
            $q->execute([$ids['admin']]);
            self::state($pdo, 'BOUND', 'activation-pending');
            $pdo->commit();
            return ['state' => 'BOUND','posting' => 'DISABLED'];
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }throw $e;
        }
    }
    public static function activate(PDO $pdo, string $reference, array $gates): array
    {
        foreach (['ownerApproved','backupRestoreVerified','transportVerified','managementTrustVerified','hostnameIsolationVerified','linuxReleaseVerified'] as $gate) {
            if (($gates[$gate] ?? false) !== true) {
                throw new \RuntimeException('ACTIVATION_GATES_NOT_APPROVED');
            }
        }
        $pdo->beginTransaction();
        try {
            $pdo->query('SELECT id FROM identity_guard WHERE id=1 FOR UPDATE')->fetchColumn();
            $receipt = $pdo->query('SELECT * FROM upms_production_migrations WHERE id=1 FOR UPDATE')->fetch(PDO::FETCH_ASSOC);
            if (!$receipt || $receipt['reference'] !== $reference || $receipt['plan_hash'] !== self::hash() || ($receipt['target_hash'] ?? null) !== self::target($pdo) || !in_array($receipt['state'], ['BOUND','ACTIVATED'], true)) {
                throw new \RuntimeException('ACTIVATION_STATE_REJECTED');
            }
            $ids = self::identities($pdo);
            $control = $pdo->query('SELECT operator_id,state FROM v1_control WHERE id=1 FOR UPDATE')->fetch(PDO::FETCH_ASSOC);
            if (!$control || (string) $control['operator_id'] !== $ids['admin']) {
                throw new \RuntimeException('DESIGNATED_OPERATOR_REQUIRED');
            }
            foreach (self::plan()['tables'] as $table) {
                self::verifyTable($pdo, $table);
            }
            if ($receipt['state'] === 'ACTIVATED') {
                $pdo->commit();
                return ['changed' => false,'state' => 'ACTIVATED'];
            }
            foreach (self::BUSINESS as $table) {
                if ((int)$pdo->query('SELECT COUNT(*) FROM `'.$table.'`')->fetchColumn()) {
                    throw new \RuntimeException('CLEAN_BUSINESS_DATA_REQUIRED');
                }
            }
            $pdo->exec("UPDATE v1_control SET state='READY',cutover_evidence='Reviewed clean activation receipt' WHERE id=1 AND operator_id IS NOT NULL");
            if ((int)$pdo->query("SELECT COUNT(*) FROM v1_control WHERE id=1 AND state='READY'")->fetchColumn() !== 1) {
                throw new \RuntimeException('DESIGNATED_OPERATOR_REQUIRED');
            }
            $q = $pdo->prepare("INSERT INTO identity_audit_events(actor_id,target_id,action,correlation,details,created_at) VALUES(NULL,NULL,'production.activation.reviewed',?,?,UTC_TIMESTAMP(6))");
            $q->execute([$reference,json_encode(['gates' => $gates,'principal' => $pdo->query('SELECT CURRENT_USER()')->fetchColumn()], JSON_THROW_ON_ERROR)]);
            self::state($pdo, 'ACTIVATED', 'reviewed-activation');
            $pdo->commit();
            return ['changed' => true,'state' => 'ACTIVATED'];
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }throw $e;
        }
    }
}
