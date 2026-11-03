<?php

declare(strict_types=1);

namespace App\Upms;

use PDO;

/** A new explicit consumer/format. Operational production backup jobs remain unchanged. */
final class EmployeeHaftaRecovery
{
    public const FORMAT = 'UPMS_EMPLOYEE_HAFTA_SNAPSHOT_V1';
    public static function tables(): array
    {
        $tables = [...ExpenseRecovery::tables(),...array_keys(EmployeeHaftaSchema::plan()['tables'])];
        sort($tables);
        return $tables;
    }
    public static function evidence(array $s): array
    {
        $data = [];
        foreach (self::tables() as $t) {
            $data[$t] = $s['tables'][$t]['rows'] ?? throw new \RuntimeException('LABOR_BACKUP_TABLE_REQUIRED');
        }
        $base = FinancialRecovery::evidence($s);
        $labor = EmployeeHaftaReconciliation::run($data);
        $commands = EmployeeHaftaReconciliation::commands($data);
        return ['matched' => $base['matched'] && $labor['matched'] && $commands['matched'],'financial' => $base,'labor' => $labor,'commands' => $commands];
    }
    public static function capture(PDO $pdo, string $runtime): array
    {
        EmployeeHaftaSchema::verify($pdo);
        $guards = EmployeeHaftaGuards::verify($pdo, $runtime, (string)$pdo->query('SELECT CURRENT_USER()')->fetchColumn());
        $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
        sort($tables);
        if ($tables !== self::tables()) {
            throw new \RuntimeException('LABOR_BACKUP_TABLE_SET_REJECTED');
        }
        $triggers = $pdo->query('SELECT TRIGGER_NAME,EVENT_MANIPULATION,EVENT_OBJECT_TABLE,ACTION_TIMING,ACTION_STATEMENT,DEFINER FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() ORDER BY TRIGGER_NAME')->fetchAll(PDO::FETCH_ASSOC);
        $pdo->exec('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
        try {
            $data = [];
            foreach ($tables as $table) {
                $data[$table] = ['ddl' => $pdo->query('SHOW CREATE TABLE `'.$table.'`')->fetch(PDO::FETCH_NUM)[1],'rows' => $pdo->query('SELECT * FROM `'.$table.'`')->fetchAll(PDO::FETCH_ASSOC)];
            }$pdo->rollBack();
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }throw $e;
        }
        $s = ['format' => self::FORMAT,'laborVersion' => EmployeeHafta::VERSION,'laborPlanHash' => EmployeeHaftaSchema::hash(),'refundPolicyVersion' => FinancialCorrections::VERSION,'documentIntegrationVersion' => MoneyDocuments::VERSION,'basePlanHash' => CleanInitialization::hash(),'moneyPlanHash' => MoneySchema::hash(),'expensePlanHash' => ExpenseSchema::hash(),'runtime' => $runtime,'guards' => $guards,'triggerDefinitions' => $triggers,'sourceTargetHash' => CleanInitialization::target($pdo),'createdUtc' => gmdate('c'),'tables' => $data];
        if (!self::evidence($s)['matched']) {
            throw new \RuntimeException('LABOR_BACKUP_EVIDENCE_REJECTED');
        }
        EmployeeHaftaSchema::verify($pdo);
        EmployeeHaftaGuards::verify($pdo, $runtime, $guards['definer']);
        return $s;
    }
    public static function encrypt(array $s, string $publicKey): string
    {
        if (($s['format'] ?? '') !== self::FORMAT || !self::evidence($s)['matched']) {
            throw new \RuntimeException('LABOR_BACKUP_FORMAT_REQUIRED');
        }return ExpenseRecovery::encrypt($s, $publicKey);
    }
    public static function decrypt(string $cipher, string $keyPair): array
    {
        $s = ExpenseRecovery::decrypt($cipher, $keyPair);
        if (($s['format'] ?? '') !== self::FORMAT || !self::evidence($s)['matched']) {
            throw new \RuntimeException('LABOR_BACKUP_FORMAT_REJECTED');
        }return $s;
    }
    public static function restoreIsolated(PDO $pdo, array $s, string $runtime): array
    {
        MoneySchema::assertIsolated($pdo, true);
        if ($pdo->query('SHOW TABLES')->fetchAll() || ($s['format'] ?? '') !== self::FORMAT || ($s['laborVersion'] ?? '') !== EmployeeHafta::VERSION || ($s['laborPlanHash'] ?? '') !== EmployeeHaftaSchema::hash() || array_keys($s['tables'] ?? []) !== self::tables() || !self::evidence($s)['matched']) {
            throw new \RuntimeException('LABOR_RESTORE_MANIFEST_REJECTED');
        }
        $rules = [...CrudGuards::plan($s['runtime']),...MoneyGuards::plan($s['runtime']),...ExpenseGuards::plan($s['runtime']),...EmployeeHaftaGuards::plan($s['runtime'])];
        if (count($s['triggerDefinitions'] ?? []) !== count($rules) || ($s['guards']['totalGuards'] ?? 0) !== count($rules)) {
            throw new \RuntimeException('LABOR_RESTORE_GUARDS_REJECTED');
        }
        foreach ($s['triggerDefinitions'] as $r) {
            $rule = $rules[$r['TRIGGER_NAME']] ?? null;
            if (!$rule || $rule['table'] !== $r['EVENT_OBJECT_TABLE'] || $rule['event'] !== $r['EVENT_MANIPULATION'] || $rule['body'] !== $r['ACTION_STATEMENT'] || $r['ACTION_TIMING'] !== 'BEFORE' || $r['DEFINER'] !== $s['guards']['definer']) {
                throw new \RuntimeException('LABOR_RESTORE_GUARD_REJECTED');
            }unset($rules[$r['TRIGGER_NAME']]);
        }if ($rules) {
            throw new \RuntimeException('LABOR_RESTORE_GUARD_MISSING');
        }
        $hashes = json_decode(file_get_contents(dirname(__DIR__, 2).'/resources/employee-hafta-schema-hashes.json'), true, 32, JSON_THROW_ON_ERROR);
        foreach (EmployeeHaftaSchema::plan()['tables'] as $t => $ddl) {
            if (!hash_equals($hashes[$t] ?? '', hash('sha256', CleanInitialization::normalize($s['tables'][$t]['ddl'])))) {
                throw new \RuntimeException('LABOR_RESTORE_DDL_REJECTED');
            }
        }
        // The base projection is restored by its original 29/72 consumer only AFTER
        // this distinct consumer has authenticated and validated all labor semantics.
        $base = $s;
        $base['format'] = FinancialRecovery::FORMAT;
        $base['tables'] = array_intersect_key($s['tables'], array_flip(ExpenseRecovery::tables()));
        $base['triggerDefinitions'] = array_values(array_filter($s['triggerDefinitions'], fn ($r) => !str_starts_with($r['TRIGGER_NAME'], 'upmsh1_')));
        $base['guards']['totalGuards'] = count($base['triggerDefinitions']);
        FinancialRecovery::restoreIsolated($pdo, $base, $runtime);
        foreach (EmployeeHaftaSchema::plan()['tables'] as $t => $ddl) {
            $pdo->exec($ddl);
        }
        $pdo->beginTransaction();
        try {
            foreach (EmployeeHaftaSchema::plan()['tables'] as $t => $ddl) {
                foreach ($s['tables'][$t]['rows'] as $r) {
                    $columns = $pdo->query('SHOW COLUMNS FROM `'.$t.'`')->fetchAll(PDO::FETCH_COLUMN);
                    if (array_keys($r) !== $columns) {
                        throw new \RuntimeException('LABOR_RESTORE_COLUMNS_REJECTED');
                    }$q = $pdo->prepare('INSERT INTO `'.$t.'` (`'.implode('`,`', $columns).'`) VALUES('.implode(',', array_fill(0, count($columns), '?')).')');
                    $q->execute(array_values($r));
                }
            }$pdo->commit();
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }throw $e;
        }
        foreach (EmployeeHaftaGuards::plan($runtime) as $name => $r) {
            $pdo->exec('CREATE TRIGGER `'.$name.'` BEFORE '.$r['event'].' ON `'.$r['table'].'` FOR EACH ROW '.$r['body']);
        }
        $copy = ['tables' => []];
        $count = 0;
        foreach (self::tables() as $t) {
            $rows = $pdo->query('SELECT * FROM `'.$t.'`')->fetchAll(PDO::FETCH_ASSOC);
            $norm = static function ($rows) {
                $all = array_map(fn ($r) => json_encode(array_map(fn ($v) => $v === null ? null : (string)$v, $r), JSON_THROW_ON_ERROR), $rows);
                sort($all);
                return $all;
            };
            if ($norm($rows) !== $norm($s['tables'][$t]['rows'])) {
                throw new \RuntimeException('LABOR_RESTORE_ROWS_MISMATCH');
            }$count += count($rows);
            $copy['tables'][$t]['rows'] = $rows;
        }
        foreach ($pdo->query('SELECT TABLE_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL')->fetchAll(PDO::FETCH_ASSOC) as $fk) {
            $n = $pdo->query('SELECT COUNT(*) FROM `'.$fk['TABLE_NAME'].'` a LEFT JOIN `'.$fk['REFERENCED_TABLE_NAME'].'` b ON a.`'.$fk['COLUMN_NAME'].'`=b.`'.$fk['REFERENCED_COLUMN_NAME'].'` WHERE a.`'.$fk['COLUMN_NAME'].'` IS NOT NULL AND b.`'.$fk['REFERENCED_COLUMN_NAME'].'` IS NULL')->fetchColumn();
            if ((int)$n !== 0) {
                throw new \RuntimeException('LABOR_RESTORED_ORPHAN');
            }
        }
        $e = self::evidence($copy);
        if (!$e['matched']) {
            throw new \RuntimeException('LABOR_RESTORED_EVIDENCE_REJECTED');
        }EmployeeHaftaSchema::verify($pdo);
        return ['passed' => true,'format' => self::FORMAT,'tables' => count(self::tables()),'rows' => $count,'guards' => EmployeeHaftaGuards::verify($pdo, $runtime, (string)$pdo->query('SELECT CURRENT_USER()')->fetchColumn()),'reconciliation' => $e];
    }
}
