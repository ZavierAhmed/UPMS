<?php

declare(strict_types=1);

namespace App\Upms;

use PDO;

/** Versioned extension snapshot prototype. Never called by the live V1 backup job. */
final class ExpenseRecovery
{
    public const FORMAT = 'UPMS_EXPENSE_SNAPSHOT_V1';
    public static function tables(): array
    {
        $t = [...array_keys(Schema::TABLES),CleanInitialization::RECEIPT,...array_keys(MoneySchema::plan()['tables']),...array_keys(ExpenseSchema::plan()['tables'])];
        sort($t);
        return $t;
    }
    public static function capture(PDO $pdo, string $runtime): array
    {
        $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
        sort($tables);
        if ($tables !== self::tables()) {
            throw new \RuntimeException('MONEY_BACKUP_TABLE_SET_REJECTED');
        }
        ExpenseSchema::verify($pdo);
        $guards = ExpenseGuards::verify($pdo, $runtime, (string)$pdo->query('SELECT CURRENT_USER()')->fetchColumn());
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
        ExpenseGuards::verify($pdo, $runtime, $guards['definer']);
        ExpenseSchema::verify($pdo);
        return ['format' => self::FORMAT,'documentIntegrationVersion' => MoneyDocuments::VERSION,'basePlanHash' => CleanInitialization::hash(),'moneyPlanHash' => MoneySchema::hash(),'expensePlanHash' => ExpenseSchema::hash(),'runtime' => $runtime,'guards' => $guards,'triggerDefinitions' => $triggers,'sourceTargetHash' => CleanInitialization::target($pdo),'createdUtc' => gmdate('c'),'tables' => $data];
    }
    public static function encrypt(array $snapshot, string $publicKey): string
    {
        if (strlen($publicKey) !== SODIUM_CRYPTO_BOX_PUBLICKEYBYTES) {
            throw new \RuntimeException('MONEY_BACKUP_KEY_REJECTED');
        }
        return sodium_crypto_box_seal(json_encode($snapshot, JSON_THROW_ON_ERROR), $publicKey);
    }
    public static function decrypt(string $cipher, string $keyPair): array
    {
        $plain = sodium_crypto_box_seal_open($cipher, $keyPair);
        if ($plain === false) {
            throw new \RuntimeException('MONEY_BACKUP_AUTHENTICATION_FAILED');
        }
        try {
            return json_decode($plain, true, 512, JSON_THROW_ON_ERROR);
        } finally {
            sodium_memzero($plain);
        }
    }
    public static function restoreIsolated(PDO $pdo, array $snapshot, string $runtime): array
    {
        MoneySchema::assertIsolated($pdo, true);
        if (PHP_SAPI !== 'cli' || !preg_match('/^upms_test_php_money_[0-9]+_restore$/D', (string)$pdo->query('SELECT DATABASE()')->fetchColumn()) || $pdo->query('SHOW TABLES')->fetchAll()) {
            throw new \RuntimeException('EMPTY_ISOLATED_MONEY_RESTORE_ONLY');
        }
        if (($snapshot['format'] ?? '') !== self::FORMAT || ($snapshot['expensePlanHash'] ?? '') !== ExpenseSchema::hash() || ($snapshot['guards']['expenseHash'] ?? '') !== ExpenseGuards::hash($snapshot['runtime'] ?? '') || ($snapshot['basePlanHash'] ?? '') !== CleanInitialization::hash() || ($snapshot['moneyPlanHash'] ?? '') !== MoneySchema::hash() || array_keys($snapshot['tables'] ?? []) !== self::tables() || ($snapshot['guards']['passed'] ?? false) !== true || ($snapshot['guards']['baseHash'] ?? '') !== CrudGuards::hash() || ($snapshot['guards']['totalGuards'] ?? 0) !== 72 || ($snapshot['guards']['moneyHash'] ?? '') !== MoneyGuards::hash($snapshot['runtime'] ?? '')) {
            throw new \RuntimeException('MONEY_BACKUP_MANIFEST_REJECTED');
        }
        $base = [];
        $rules = [...CrudGuards::plan($snapshot['runtime']),...MoneyGuards::plan($snapshot['runtime']),...ExpenseGuards::plan($snapshot['runtime'])];
        foreach ($snapshot['triggerDefinitions'] ?? [] as $r) {
            $rule = $rules[$r['TRIGGER_NAME']] ?? null;
            if (!$rule || $rule['table'] !== $r['EVENT_OBJECT_TABLE'] || $rule['event'] !== $r['EVENT_MANIPULATION'] || $rule['body'] !== $r['ACTION_STATEMENT'] || $r['ACTION_TIMING'] !== 'BEFORE' || $r['DEFINER'] !== $snapshot['guards']['definer']) {
                throw new \RuntimeException('MONEY_BACKUP_TRIGGER_REJECTED');
            }unset($rules[$r['TRIGGER_NAME']]);
        }
        if ($rules) {
            throw new \RuntimeException('MONEY_BACKUP_GUARDS_INCOMPLETE');
        }
        foreach (CleanInitialization::plan()['tables'] as $t) {
            $base[$t['table']] = $t['sql'];
        }$base[CleanInitialization::RECEIPT] = CleanInitialization::receiptDdl();
        $hashes = json_decode(file_get_contents(dirname(__DIR__, 2).'/resources/money-schema-hashes.json'), true, 16, JSON_THROW_ON_ERROR);
        $hashes = [...$hashes,...json_decode(file_get_contents(dirname(__DIR__, 2).'/resources/expense-schema-hashes.json'), true, 16, JSON_THROW_ON_ERROR)];
        // Validate every DDL before executing any of it. No arbitrary backup SQL.
        foreach ($snapshot['tables'] as $table => $content) {
            $ddl = CleanInitialization::normalize($content['ddl']);
            if (isset($base[$table]) ? $ddl !== CleanInitialization::normalize($base[$table]) : !hash_equals($hashes[$table] ?? '', hash('sha256', $ddl))) {
                throw new \RuntimeException('MONEY_BACKUP_DDL_REJECTED');
            }
        }
        $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
        try {
            foreach ($snapshot['tables'] as $content) {
                $pdo->exec($content['ddl']);
            }
            $pdo->beginTransaction();
            foreach ($snapshot['tables'] as $table => $content) {
                $columns = $pdo->query('SHOW COLUMNS FROM `'.$table.'`')->fetchAll(PDO::FETCH_COLUMN);
                foreach ($content['rows'] as $row) {
                    if (array_keys($row) !== $columns) {
                        throw new \RuntimeException('MONEY_BACKUP_COLUMNS_REJECTED');
                    }$q = $pdo->prepare('INSERT INTO `'.$table.'` (`'.implode('`,`', $columns).'`) VALUES('.implode(',', array_fill(0, count($columns), '?')).')');
                    $q->execute(array_values($row));
                }
            }
            $pdo->commit();
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }throw $e;
        } finally {
            $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
        }
        $rows = 0;
        foreach ($snapshot['tables'] as $table => $content) {
            $actual = $pdo->query('SELECT * FROM `'.$table.'`')->fetchAll(PDO::FETCH_ASSOC);
            $normalize = static function ($records) {
                $r = array_map(fn ($row) => json_encode(array_map(fn ($v) => $v === null ? null : (string)$v, $row), JSON_THROW_ON_ERROR), $records);
                sort($r);
                return $r;
            };
            if ($normalize($actual) !== $normalize($content['rows'])) {
                throw new \RuntimeException('MONEY_RESTORED_ROWS_MISMATCH');
            }$rows += count($actual);
        }
        // Orphan scan is mandatory after loading with FK checks disabled.
        foreach ($pdo->query("SELECT TABLE_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL")->fetchAll(PDO::FETCH_ASSOC) as $fk) {
            $n = $pdo->query('SELECT COUNT(*) FROM `'.$fk['TABLE_NAME'].'` a LEFT JOIN `'.$fk['REFERENCED_TABLE_NAME'].'` b ON a.`'.$fk['COLUMN_NAME'].'`=b.`'.$fk['REFERENCED_COLUMN_NAME'].'` WHERE a.`'.$fk['COLUMN_NAME'].'` IS NOT NULL AND b.`'.$fk['REFERENCED_COLUMN_NAME'].'` IS NULL')->fetchColumn();
            if ((int)$n !== 0) {
                throw new \RuntimeException('MONEY_RESTORED_ORPHAN');
            }
        }
        foreach ([...CrudGuards::plan($runtime),...MoneyGuards::plan($runtime),...ExpenseGuards::plan($runtime)] as $name => $rule) {
            $pdo->exec('CREATE TRIGGER `'.$name.'` BEFORE '.$rule['event'].' ON `'.$rule['table'].'` FOR EACH ROW '.$rule['body']);
        }
        $data = [];
        foreach (['money_accounts','money_batches','money_movements','money_audit'] as $table) {
            $records = $pdo->query('SELECT * FROM `'.$table.'` ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
            foreach ($records as &$row) {
                foreach (['id','account_id','batch_id','actor_id','from_account_id','to_account_id','opening_account_id','corrects_id'] as $key) {
                    if (isset($row[$key])) {
                        $row[$key] = (string)$row[$key];
                    }
                }
            }unset($row);
            $data[] = $records;
        }
        $reconciliation = MoneyAccounts::reconcile(...$data);
        $documents = MoneyDocuments::reconcile($pdo->query('SELECT * FROM v1_documents')->fetchAll(PDO::FETCH_ASSOC), $data[1], $data[0], $pdo->query("SELECT * FROM v1_audit WHERE action='document.posted'")->fetchAll(PDO::FETCH_ASSOC));
        $reconciliation = [...$reconciliation,'matched' => $reconciliation['matched'] && $documents['matched'],'documentIntegration' => $documents];
        if (!$reconciliation['matched']) {
            throw new \RuntimeException('MONEY_RESTORED_RECONCILIATION_FAILED');
        }
        $master = ExpenseMasters::reconcile($pdo->query('SELECT * FROM expense_categories ORDER BY id')->fetchAll(PDO::FETCH_ASSOC), $pdo->query('SELECT * FROM employees ORDER BY id')->fetchAll(PDO::FETCH_ASSOC), $pdo->query('SELECT * FROM expense_master_audit ORDER BY id')->fetchAll(PDO::FETCH_ASSOC));
        $expense = ExpenseMasters::documents($pdo->query('SELECT * FROM v1_documents')->fetchAll(PDO::FETCH_ASSOC), $pdo->query('SELECT * FROM expense_master_audit ORDER BY id')->fetchAll(PDO::FETCH_ASSOC));
        if (!$master['matched'] || !$expense['matched']) {
            throw new \RuntimeException('EXPENSE_RESTORED_EVIDENCE_REJECTED');
        }
        return ['expenseMasterReconciliation' => $master,'expenseDocumentReconciliation' => $expense,'passed' => true,'format' => self::FORMAT,'tables' => 29,'rows' => $rows,'guards' => ExpenseGuards::verify($pdo, $runtime),'schema' => ExpenseSchema::verify($pdo),'moneyReconciliation' => $reconciliation,'productionContacted' => false,'sourceTargetHashPreserved' => true];
    }
}
