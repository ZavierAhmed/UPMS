<?php

declare(strict_types=1);

namespace App\Upms;

use PDO;

final class Database
{
    private ?PDO $connection = null;

    public function pdo(): PDO
    {
        if ($this->connection) {
            return $this->connection;
        }
        $c = config('upms');
        if (is_string($c['production_profile'] ?? null) && $c['production_profile'] !== '') {
            return $this->production($c['production_profile']);
        }
        // Synthetic path remains independently guarded; no production fallback.
        if (!$c['enabled'] || !in_array($c['host'], ['127.0.0.1', 'localhost', '::1'], true)
            || !preg_match('/^upms_test_php_[a-z0-9_]+$/D', (string) $c['database'])
            || !ctype_digit((string) $c['port']) || (int) $c['port'] < 1 || (int) $c['port'] > 65535
            || !$c['username'] || !$c['password']) {
            throw new ApiError(503, 'DATABASE_PROFILE_REJECTED');
        }
        $pdo = new PDO("mysql:host={$c['host']};port={$c['port']};dbname={$c['database']};charset=utf8mb4", $c['username'], $c['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_STRINGIFY_FETCHES => false,
            PDO::ATTR_TIMEOUT => 3,
            PDO::MYSQL_ATTR_MULTI_STATEMENTS => false,
        ]);
        if (!preg_match('/^10\.11\.\d+-MariaDB/', $pdo->query('SELECT VERSION()')->fetchColumn())) {
            throw new ApiError(503, 'DATABASE_ENGINE_REJECTED');
        }
        $pdo->exec("SET SESSION time_zone = '+00:00', innodb_lock_wait_timeout = 3, sql_mode = 'STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION'");
        $pdo->exec('SET SESSION max_statement_time = 5');
        return $this->connection = $pdo;
    }

    private function production(string $path): PDO
    {
        $c = ProductionProfile::load($path);
        $pdo = ProductionConnection::connect($c);
        $grantReport = RuntimePrivileges::verify($pdo, $c);
        if (!$grantReport['passed']) {
            throw new ApiError(503, 'PRODUCTION_PRIVILEGES_REJECTED');
        }
        if (($c['privilegePolicy'] ?? RuntimePrivileges::STRICT) === RuntimePrivileges::GODADDY) {
            CrudRiskApproval::verify($pdo, $c);
        }
        if ($pdo->query('SELECT @@character_set_database')->fetchColumn() !== 'utf8mb4') {
            throw new ApiError(503, 'PRODUCTION_CHARSET_REJECTED');
        }
        if ((int) $pdo->query("SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='upms_production_migrations'")->fetchColumn() !== 1) {
            throw new ApiError(503, 'CLEAN_ACTIVATION_RECEIPT_REQUIRED');
        }
        $receipt = $pdo->query('SELECT reference,plan_hash,target_hash,state FROM upms_production_migrations WHERE id=1')->fetch(PDO::FETCH_ASSOC);
        if (!$receipt || $receipt['state'] !== 'ACTIVATED' || $receipt['reference'] !== $c['reference'] || $receipt['plan_hash'] !== CleanInitialization::hash() || ($receipt['target_hash'] ?? null) !== CleanInitialization::target($pdo)) {
            throw new ApiError(503, 'CLEAN_ACTIVATION_RECEIPT_REQUIRED');
        }
        $control = $pdo->query('SELECT operator_id,state FROM v1_control WHERE id=1')->fetch(PDO::FETCH_ASSOC);
        if (!$control || $control['state'] !== 'READY') {
            throw new ApiError(503, 'PRODUCTION_CUTOVER_NOT_READY');
        }
        $policy = ['schema' => $c['schema'], 'users' => $c['operators']];
        OperatorPolicy::permits(['username' => 'admin', 'id' => $c['operators']['admin']], $control, $policy, $c['schema']);
        $admins = $pdo->query("SELECT u.id,u.login_key FROM users u JOIN user_roles r ON r.user_id=u.id WHERE u.enabled=1 AND r.role_code='administrator' ORDER BY u.login_key")->fetchAll(PDO::FETCH_ASSOC);
        if (count($admins) !== 2 || array_column($admins, 'login_key') !== ['admin', 'haris'] || (string) $admins[0]['id'] !== $c['operators']['admin'] || (string) $admins[1]['id'] !== $c['operators']['haris']) {
            throw new ApiError(503, 'PRODUCTION_ADMINISTRATORS_REJECTED');
        }
        if (config('upms.origin') !== $c['origin']) {
            throw new ApiError(503, 'PRODUCTION_ORIGIN_REJECTED');
        }
        $pdo->exec("SET SESSION time_zone = '+00:00', innodb_lock_wait_timeout = 3, sql_mode = 'STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION'");
        $pdo->exec('SET SESSION max_statement_time = 5');
        config(['upms.database' => $c['schema'], 'upms.designated_operators' => $policy]);
        return $this->connection = $pdo;
    }

    public function rows(string $sql, array $bindings = []): array
    {
        $q = $this->pdo()->prepare($sql);
        $q->execute(array_map(fn ($v) => is_bool($v) ? (int) $v : $v, $bindings));
        $rows = $q->fetchAll(PDO::FETCH_ASSOC);
        // mysql2's bigNumberStrings=true contract: BIGINT identifiers are strings,
        // while INTEGER versions/flags remain numbers and DECIMAL stays a string.
        for ($i = 0; $i < $q->columnCount(); $i++) {
            $meta = $q->getColumnMeta($i);
            if (($meta['native_type'] ?? '') === 'LONGLONG') {
                foreach ($rows as &$row) {
                    if ($row[$meta['name']] !== null) {
                        $row[$meta['name']] = (string) $row[$meta['name']];
                    }
                }
                unset($row);
            }
        }
        return $rows;
    }

    public function one(string $sql, array $bindings = []): ?array
    {
        return $this->rows($sql, $bindings)[0] ?? null;
    }

    public function execute(string $sql, array $bindings = []): void
    {
        $q = $this->pdo()->prepare($sql);
        $q->execute(array_map(fn ($v) => is_bool($v) ? (int) $v : $v, $bindings));
    }

    public function transaction(callable $action): mixed
    {
        $pdo = $this->pdo();
        $pdo->beginTransaction();
        try {
            if (!$this->one('SELECT id FROM identity_guard WHERE id=1 FOR UPDATE')) {
                throw new ApiError(503, 'SCHEMA_INCOMPATIBLE');
            }
            $result = $action();
            $pdo->commit();
            return $result;
        } catch (\Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $error;
        }
    }
}
