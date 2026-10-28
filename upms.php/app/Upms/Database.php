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
        // Fail closed until a later reviewed production profile exists. No remote DB writes.
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
