<?php

declare(strict_types=1);

namespace App\Upms;

use PDO;

final class ExpenseSchema
{
    public static function plan(): array
    {
        return json_decode(file_get_contents(dirname(__DIR__, 2).'/resources/expense-masters-schema.json'), true, 32, JSON_THROW_ON_ERROR);
    }
    public static function hash(): string
    {
        return hash('sha256', json_encode(self::plan(), JSON_THROW_ON_ERROR));
    }
    public static function verify(PDO $pdo): array
    {
        MoneySchema::verify($pdo);
        $hashes = json_decode(file_get_contents(dirname(__DIR__, 2).'/resources/expense-schema-hashes.json'), true, 32, JSON_THROW_ON_ERROR);
        foreach (self::plan()['tables'] as $table => $ddl) {
            $actual = $pdo->query('SHOW CREATE TABLE `'.$table.'`')->fetch(PDO::FETCH_NUM)[1];
            if (!hash_equals($hashes[$table] ?? '', hash('sha256', CleanInitialization::normalize($actual)))) {
                throw new \RuntimeException('EXPENSE_SCHEMA_REJECTED');
            }
        }
        $receipt = $pdo->query('SELECT * FROM expense_schema_receipts WHERE id=1')->fetch(PDO::FETCH_ASSOC);
        if (!$receipt || $receipt['version'] !== self::plan()['version'] || $receipt['plan_hash'] !== self::hash()) {
            throw new \RuntimeException('EXPENSE_RECEIPT_REJECTED');
        }
        return ['passed' => true,'planHash' => self::hash(),'tables' => 29,'totalGuards' => 72];
    }
    public static function ready(Database $db, bool $requireEnabled = true): void
    {
        if ($requireEnabled && !config('upms.expense_masters_enabled', false)) {
            throw new ApiError(503, 'EXPENSE_MASTERS_DISABLED', publicMessage:'Expense categories and employees are not enabled.', entry:false);
        }
        try {
            $pdo = $db->pdo();
            self::verify($pdo);
            $runtime = $pdo->query('SELECT CURRENT_USER()')->fetchColumn();
            $path = config('upms.expense_guard_evidence');
            if (!is_string($path) || !is_file($path) || is_link($path)) {
                throw new \RuntimeException('EXPENSE_EVIDENCE_REQUIRED');
            }
            $g = json_decode(file_get_contents($path), true, 32, JSON_THROW_ON_ERROR);
            if (($g['passed'] ?? false) !== true || ($g['runtime'] ?? '') !== $runtime || ($g['targetHash'] ?? '') !== CleanInitialization::target($pdo) || ($g['expensePlanHash'] ?? '') !== self::hash() || ($g['baseHash'] ?? '') !== CrudGuards::hash() || ($g['moneyHash'] ?? '') !== MoneyGuards::hash(explode('@', $runtime)[0]) || ($g['expenseHash'] ?? '') !== ExpenseGuards::hash(explode('@', $runtime)[0]) || ($g['totalGuards'] ?? 0) !== 72) {
                throw new \RuntimeException('EXPENSE_EVIDENCE_REJECTED');
            }
            if ($pdo->query('SELECT DATABASE()')->fetchColumn() === 'upms_v1') {
                $a = json_decode(file_get_contents((string)config('upms.expense_release_approval')), true, 32, JSON_THROW_ON_ERROR);
                if (($a['status'] ?? '') !== 'OWNER_APPROVED_EXPENSE_RELEASE' || ($a['expensePlanHash'] ?? '') !== self::hash() || ($a['targetHash'] ?? '') !== $g['targetHash'] || ($a['guardEvidenceSha256'] ?? '') !== hash_file('sha256', $path) || ($a['recoveryFormat'] ?? '') !== ExpenseRecovery::FORMAT || ($a['recoveryVerified'] ?? false) !== true || ($g['definer'] ?? '') !== CrudGuards::DEFINER || ($g['definerPrivilegesVerified'] ?? false) !== true) {
                    throw new \RuntimeException('EXPENSE_PRODUCTION_APPROVAL_REQUIRED');
                }
            }
        } catch (\Throwable) {
            throw new ApiError(503, 'EXPENSE_READINESS_REQUIRED', publicMessage:'Expense master readiness is not verified. No entry was saved.', entry:false);
        }
    }
    public static function installIsolated(PDO $pdo, string $runtime): array
    {
        MoneySchema::assertIsolated($pdo);
        MoneySchema::verify($pdo);
        MoneyGuards::verify($pdo, $runtime, (string)$pdo->query('SELECT CURRENT_USER()')->fetchColumn());
        if ($pdo->query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('expense_categories','employees','expense_master_audit','expense_schema_receipts')")->fetchAll()) {
            throw new \RuntimeException('PARTIAL_EXPENSE_MIGRATION_REVIEW_REQUIRED');
        }
        $hashes = [];
        foreach (self::plan()['tables'] as $table => $ddl) {
            $pdo->exec($ddl);
            $hashes[$table] = hash('sha256', CleanInitialization::normalize($pdo->query('SHOW CREATE TABLE `'.$table.'`')->fetch(PDO::FETCH_NUM)[1]));
        }
        $q = $pdo->prepare('INSERT INTO expense_schema_receipts VALUES(1,?,?,?,UTC_TIMESTAMP(6))');
        $q->execute([self::plan()['version'],self::hash(),'SYNTHETIC-P32B2-ONLY']);
        foreach (ExpenseGuards::plan($runtime) as $name => $r) {
            $pdo->exec('CREATE TRIGGER `'.$name.'` BEFORE '.$r['event'].' ON `'.$r['table'].'` FOR EACH ROW '.$r['body']);
        }
        return [...ExpenseGuards::verify($pdo, $runtime, (string)$pdo->query('SELECT CURRENT_USER()')->fetchColumn()),'expensePlanHash' => self::hash(),'schemaHashes' => $hashes,'runtime' => $runtime.'@localhost','targetHash' => CleanInitialization::target($pdo)];
    }
}
