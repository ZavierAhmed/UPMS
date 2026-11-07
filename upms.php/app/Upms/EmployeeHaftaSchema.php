<?php

declare(strict_types=1);

namespace App\Upms;

use PDO;

/** Additive, isolated-UAT-only schema. Never an installer for the deployed 20/45 database. */
final class EmployeeHaftaSchema
{
    public const PERMISSIONS = ['employee_labor.view','employee_labor.record','employee_labor.pay','employee_labor.opening','employee_labor.correct','money.accounts.view'];
    public static function plan(): array
    {
        return json_decode(file_get_contents(dirname(__DIR__, 2).'/resources/employee-hafta-schema.json'), true, 32, JSON_THROW_ON_ERROR);
    }
    public static function hash(): string
    {
        return hash('sha256', json_encode(self::plan(), JSON_THROW_ON_ERROR));
    }
    public static function verify(PDO $pdo): array
    {
        if (!CumulativeProduction::uses($pdo)) {
            MoneySchema::assertIsolated($pdo);
        }
        ExpenseSchema::verify($pdo);
        $hashes = json_decode(file_get_contents(dirname(__DIR__, 2).'/resources/employee-hafta-schema-hashes.json'), true, 32, JSON_THROW_ON_ERROR);
        foreach (self::plan()['tables'] as $table => $ddl) {
            $actual = $pdo->query('SHOW CREATE TABLE `'.$table.'`')->fetch(PDO::FETCH_NUM)[1];
            if (!hash_equals($hashes[$table] ?? '', hash('sha256', CleanInitialization::normalize($actual)))) {
                throw new \RuntimeException('LABOR_SCHEMA_REJECTED');
            }
        }
        $receipt = $pdo->query('SELECT * FROM labor_schema_receipts WHERE id=1')->fetch(PDO::FETCH_ASSOC);
        if (!$receipt || $receipt['version'] !== self::plan()['version'] || $receipt['plan_hash'] !== self::hash()) {
            throw new \RuntimeException('LABOR_RECEIPT_REJECTED');
        }
        return ['passed' => true,'version' => self::plan()['version'],'planHash' => self::hash(),'tables' => count(EmployeeHaftaRecovery::tables())];
    }
    public static function ready(Database $db): void
    {
        if (!config('upms.employee_hafta_enabled', false)) {
            throw new ApiError(503, 'EMPLOYEE_HAFTA_DISABLED', publicMessage:'Employee Hafta is not enabled for this deployment.', entry:false);
        }
        if (CumulativeProduction::uses($db->pdo())) {
            return;
        }
        try {
            // Even a true environment flag cannot activate this milestone on production.
            if (config('upms.production_profile')) {
                throw new \RuntimeException('LABOR_ISOLATED_ONLY');
            }
            MoneySchema::ready($db);
            if (LaborExtensionSchema::enabled()) {
                LaborExtensionSchema::runtimeReady($db);
                return;
            }
            self::verify($db->pdo());
            $runtime = explode('@', $db->pdo()->query('SELECT CURRENT_USER()')->fetchColumn())[0];
            $path = config('upms.employee_hafta_guard_evidence');
            if (!is_string($path) || !is_file($path) || is_link($path)) {
                throw new \RuntimeException('LABOR_GUARD_EVIDENCE_REQUIRED');
            }
            $g = json_decode(file_get_contents($path), true, 32, JSON_THROW_ON_ERROR);
            $expected = count(CrudGuards::plan($runtime)) + count(MoneyGuards::plan($runtime)) + count(ExpenseGuards::plan($runtime)) + count(EmployeeHaftaGuards::plan($runtime));
            $actual = (int)$db->pdo()->query('SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()')->fetchColumn();
            if (($g['passed'] ?? false) !== true || ($g['runtime'] ?? '') !== $db->pdo()->query('SELECT CURRENT_USER()')->fetchColumn() || ($g['targetHash'] ?? '') !== CleanInitialization::target($db->pdo()) || ($g['laborPlanHash'] ?? '') !== self::hash() || ($g['laborHash'] ?? '') !== EmployeeHaftaGuards::hash($runtime) || ($g['baseHash'] ?? '') !== CrudGuards::hash() || ($g['moneyHash'] ?? '') !== MoneyGuards::hash($runtime) || ($g['expenseHash'] ?? '') !== ExpenseGuards::hash($runtime) || ($g['totalGuards'] ?? 0) !== $expected || $actual !== $expected) {
                throw new \RuntimeException('LABOR_GUARD_EVIDENCE_REJECTED');
            }
        } catch (\Throwable) {
            throw new ApiError(503, 'EMPLOYEE_HAFTA_READINESS_REQUIRED', publicMessage:'Employee labor schema, guards and isolated UAT target must be verified. No entry was posted.', entry:false);
        }
    }
    public static function installIsolated(PDO $pdo, string $runtime): array
    {
        MoneySchema::assertIsolated($pdo);
        ExpenseSchema::verify($pdo);
        ExpenseGuards::verify($pdo, $runtime, (string)$pdo->query('SELECT CURRENT_USER()')->fetchColumn());
        foreach (array_keys(self::plan()['tables']) as $table) {
            if ($pdo->query("SHOW TABLES LIKE '$table'")->fetchColumn()) {
                throw new \RuntimeException('LABOR_PARTIAL_INSTALL_REVIEW_REQUIRED');
            }
        }
        $hashes = [];
        foreach (self::plan()['tables'] as $table => $ddl) {
            $pdo->exec($ddl);
            $hashes[$table] = hash('sha256', CleanInitialization::normalize($pdo->query('SHOW CREATE TABLE `'.$table.'`')->fetch(PDO::FETCH_NUM)[1]));
        }
        $q = $pdo->prepare('INSERT INTO labor_schema_receipts VALUES(1,?,?,?,UTC_TIMESTAMP(6))');
        $q->execute([self::plan()['version'],self::hash(),'ISOLATED-UAT-H1-ONLY']);
        foreach (self::PERMISSIONS as $permission) {
            $q = $pdo->prepare('INSERT INTO permissions(code) VALUES(?)');
            $q->execute([$permission]);
            // Corrections/clawbacks have no approved posting workflow and no grant.
            if ($permission !== 'employee_labor.correct') {
                $q = $pdo->prepare("INSERT INTO role_permissions(role_code,permission_code) VALUES('administrator',?)");
                $q->execute([$permission]);
            }
        }
        foreach (EmployeeHaftaGuards::plan($runtime) as $name => $rule) {
            $pdo->exec('CREATE TRIGGER `'.$name.'` BEFORE '.$rule['event'].' ON `'.$rule['table'].'` FOR EACH ROW '.$rule['body']);
        }
        return [...EmployeeHaftaGuards::verify($pdo, $runtime, (string)$pdo->query('SELECT CURRENT_USER()')->fetchColumn()),'schemaHashes' => $hashes,'laborPlanHash' => self::hash(),'runtime' => $runtime.'@localhost','targetHash' => CleanInitialization::target($pdo)];
    }
}
