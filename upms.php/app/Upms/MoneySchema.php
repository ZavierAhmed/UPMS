<?php

declare(strict_types=1);

namespace App\Upms;

use PDO;

final class MoneySchema
{
    public static function plan(): array
    {
        return json_decode(file_get_contents(dirname(__DIR__, 2).'/resources/money-accounts-schema.json'), true, 32, JSON_THROW_ON_ERROR);
    }
    public static function hash(): string
    {
        return hash('sha256', json_encode(self::plan(), JSON_THROW_ON_ERROR));
    }
    public static function defaults(): array
    {
        return json_decode(file_get_contents(dirname(__DIR__, 2).'/resources/money-accounts-defaults.json'), true, 16, JSON_THROW_ON_ERROR);
    }
    public static function assertIsolated(PDO $pdo, bool $restore = false): void
    {
        $row = $pdo->query('SELECT DATABASE() db,VERSION() version,@@port port,@@bind_address binding,@@datadir datadir')->fetch(PDO::FETCH_ASSOC);
        $pattern = $restore ? '/^upms_test_php_money_[0-9]+_restore$/D' : '/^upms_test_php_money_[0-9]+(?:_restore)?$/D';
        $expected = realpath(dirname(__DIR__, 3).'/tmp/php-runtime/php2-engine-1793148736638');
        $normalize = static fn ($s) => strtolower(rtrim(str_replace('\\', '/', (string)$s), '/'));
        if (PHP_SAPI !== 'cli' || !$expected || !preg_match($pattern, (string)$row['db']) || !str_starts_with($row['version'], '10.11.19-MariaDB') || (int)$row['port'] !== 3330 || $row['binding'] !== '127.0.0.1' || $normalize($row['datadir']) !== $normalize($expected)) {
            throw new \RuntimeException('ISOLATED_MONEY_ENGINE_REQUIRED');
        }
    }
    public static function accounts(array $accounts): array
    {
        if (!$accounts || count($accounts) > 100) {
            throw new \RuntimeException('MONEY_ACCOUNT_CONFIG_REJECTED');
        }
        $codes = [];
        foreach ($accounts as $a) {
            if (!is_array($a) || count($a) !== 3 || array_diff(array_keys($a), ['code','name','type']) || !is_string($a['code'] ?? null) || !preg_match('/^[A-Z][A-Z0-9_]{0,63}$/D', $a['code']) || !is_string($a['name'] ?? null) || mb_strlen(trim($a['name'])) < 1 || mb_strlen($a['name']) > 150 || !in_array($a['type'] ?? '', ['CASH_HOLDER','BANK','CHEQUE_CUSTODY'], true) || isset($codes[$a['code']])) {
                throw new \RuntimeException('MONEY_ACCOUNT_CONFIG_REJECTED');
            }$codes[$a['code']] = true;
        }
        return array_map(fn ($a) => ['code' => $a['code'],'name' => $a['name'],'type' => $a['type']], $accounts);
    }
    public static function verify(PDO $pdo): array
    {
        foreach (self::plan()['tables'] as $table => $ddl) {
            $q = $pdo->prepare('SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?');
            $q->execute([$table]);
            if ($q->fetchColumn() !== 'InnoDB') {
                throw new \RuntimeException('MONEY_SCHEMA_REQUIRED');
            }
            // Compare normalized engine output to a committed MariaDB-normalized hash.
            $actual = $pdo->query('SHOW CREATE TABLE `'.$table.'`')->fetch(PDO::FETCH_NUM)[1];
            $hashes = json_decode(file_get_contents(dirname(__DIR__, 2).'/resources/money-schema-hashes.json'), true, 16, JSON_THROW_ON_ERROR);
            if (!hash_equals($hashes[$table] ?? '', hash('sha256', CleanInitialization::normalize($actual)))) {
                throw new \RuntimeException('MONEY_SCHEMA_DEFINITION_REJECTED');
            }
        }
        $receipt = $pdo->query('SELECT * FROM money_schema_receipts WHERE id=1')->fetch(PDO::FETCH_ASSOC);
        $accounts = $pdo->query('SELECT code,name,type FROM money_accounts ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
        if (!$receipt || $receipt['version'] !== self::plan()['version'] || $receipt['plan_hash'] !== self::hash() || !hash_equals($receipt['accounts_hash'], hash('sha256', json_encode($accounts, JSON_THROW_ON_ERROR)))) {
            throw new \RuntimeException('MONEY_MIGRATION_RECEIPT_REQUIRED');
        }
        return ['passed' => true,'tables' => 5,'planHash' => self::hash(),'accountsHash' => $receipt['accounts_hash'],'reference' => $receipt['reference']];
    }
    public static function ready(Database $db): void
    {
        if (!config('upms.money_accounts_enabled')) {
            throw new ApiError(503, 'MONEY_ACCOUNTS_DISABLED', publicMessage:'Money Accounts is not enabled for this deployment.', entry:false);
        }
        try {
            $pdo = $db->pdo();
            $schema = self::verify($pdo);
            $runtime = $pdo->query('SELECT CURRENT_USER()')->fetchColumn();
            $path = config('upms.money_guard_evidence');
            if (!is_string($path) || !is_file($path) || is_link($path)) {
                throw new \RuntimeException('MONEY_GUARD_EVIDENCE_REQUIRED');
            }
            $g = json_decode(file_get_contents($path), true, 32, JSON_THROW_ON_ERROR);
            if (($g['passed'] ?? false) !== true || ($g['runtime'] ?? '') !== $runtime || ($g['targetHash'] ?? '') !== CleanInitialization::target($pdo) || ($g['planHash'] ?? '') !== $schema['planHash'] || ($g['accountsHash'] ?? '') !== $schema['accountsHash'] || ($g['baseHash'] ?? '') !== CrudGuards::hash() || ($g['moneyHash'] ?? '') !== MoneyGuards::hash(explode('@', $runtime)[0]) || ($g['totalGuards'] ?? 0) !== 60) {
                throw new \RuntimeException('MONEY_GUARD_EVIDENCE_REJECTED');
            }
            if ($pdo->query('SELECT DATABASE()')->fetchColumn() === 'upms_v1') {
                // A development evidence receipt is never a production approval.
                $a = json_decode(file_get_contents((string)config('upms.money_release_approval')), true, 32, JSON_THROW_ON_ERROR);
                if (($a['status'] ?? '') !== 'OWNER_APPROVED_MONEY_RELEASE' || ($a['targetHash'] ?? '') !== $g['targetHash'] || ($a['planHash'] ?? '') !== self::hash() || ($a['guardEvidenceSha256'] ?? '') !== hash_file('sha256', $path) || ($a['recoveryFormat'] ?? '') !== 'UPMS_MONEY_SNAPSHOT_V1' || ($a['recoveryVerified'] ?? false) !== true || ($g['definer'] ?? '') !== CrudGuards::DEFINER || ($g['definerPrivilegesVerified'] ?? false) !== true) {
                    throw new \RuntimeException('MONEY_PRODUCTION_APPROVAL_REQUIRED');
                }
            }
        } catch (\Throwable) {
            throw new ApiError(503, 'MONEY_READINESS_REQUIRED', publicMessage:'Money Accounts readiness is not verified. No money entry was posted.', entry:false);
        }
    }
    /** Test-only forward migration. No production installer is exposed by this milestone. */
    public static function installIsolated(PDO $pdo, array $accounts, string $runtime, string $reference): array
    {
        self::assertIsolated($pdo);
        if (PHP_SAPI !== 'cli' || !preg_match('/^upms_test_php_money_[0-9]+(?:_restore)?$/D', (string)$pdo->query('SELECT DATABASE()')->fetchColumn()) || !str_starts_with((string)$pdo->query('SELECT VERSION()')->fetchColumn(), '10.11.19-MariaDB')) {
            throw new \RuntimeException('ISOLATED_MONEY_MIGRATION_ONLY');
        }
        $accounts = self::accounts($accounts);
        $existing = $pdo->query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE 'money\\_%'")->fetchAll(PDO::FETCH_COLUMN);
        if ($existing) {
            throw new \RuntimeException('PARTIAL_MONEY_MIGRATION_REVIEW_REQUIRED');
        }
        foreach (self::plan()['tables'] as $ddl) {
            $pdo->exec($ddl);
        }
        foreach ($accounts as $a) {
            $q = $pdo->prepare('INSERT INTO money_accounts(code,name,type) VALUES(?,?,?)');
            $q->execute(array_values($a));
        }
        foreach (MoneyGuards::plan($runtime) as $name => $r) {
            $pdo->exec('CREATE TRIGGER `'.$name.'` BEFORE '.$r['event'].' ON `'.$r['table'].'` FOR EACH ROW '.$r['body']);
        }
        $q = $pdo->prepare('INSERT INTO money_schema_receipts VALUES(1,?,?,?,?,UTC_TIMESTAMP(6))');
        $q->execute([self::plan()['version'],self::hash(),hash('sha256', json_encode($accounts, JSON_THROW_ON_ERROR)),$reference]);
        return ['planHash' => self::hash(),'accountsHash' => hash('sha256', json_encode($accounts, JSON_THROW_ON_ERROR)),...MoneyGuards::verify($pdo, $runtime, (string)$pdo->query('SELECT CURRENT_USER()')->fetchColumn())];
    }
}
