<?php

declare(strict_types=1);

namespace App\Upms;

use PDO;

final class LaborExtensionSchema
{
    public const VERSION = 'uath1c-v1';
    public const PERMISSIONS = ['employee_labor.classify','stock.initial_opening.confirm'];
    public static function enabled(): bool { return (bool)config('upms.labor_classification_enabled', false); }
    public static function plan(): array { return json_decode(file_get_contents(dirname(__DIR__, 2).'/resources/labor-extension-schema.json'), true, 32, JSON_THROW_ON_ERROR); }
    public static function hash(): string { return hash('sha256', json_encode(self::plan(), JSON_THROW_ON_ERROR)); }
    public static function hashes(PDO $pdo): array { $hashes=[];foreach (array_keys(self::plan()['tables']) as $table) { $hashes[$table]=hash('sha256', CleanInitialization::normalize($pdo->query('SHOW CREATE TABLE `'.$table.'`')->fetch(PDO::FETCH_NUM)[1])); }return $hashes; }
    public static function verify(PDO $pdo, bool $chequeExtension = false): array
    {
        EmployeeHaftaSchema::verify($pdo);
        $expected=json_decode(file_get_contents(dirname(__DIR__, 2).'/resources/labor-extension-schema-hashes.json'), true, 32, JSON_THROW_ON_ERROR);
        if (self::hashes($pdo)!==$expected) { throw new \RuntimeException('H1C_SCHEMA_HASH_REJECTED'); }
        $receipt=$pdo->query('SELECT * FROM labor_extension_receipts WHERE id=1')->fetch(PDO::FETCH_ASSOC);
        if (!$receipt||$receipt['version']!==self::VERSION||$receipt['plan_hash']!==self::hash()) { throw new \RuntimeException('H1C_SCHEMA_RECEIPT_REJECTED'); }
        $tables=$pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
        $expectedTables=[...EmployeeHaftaRecovery::tables(),...array_keys(self::plan()['tables']),...($chequeExtension ? array_keys(ChequeSchema::plan()['tables']) : []),...($chequeExtension&&ChequeExtras::enabled()?array_keys(ChequeExtras::plan()):[])];sort($tables);sort($expectedTables);
        if ($tables!==$expectedTables) { throw new \RuntimeException('H1C_EXACT_TABLE_SET_REQUIRED'); }
        return ['passed'=>true,'tables'=>38,'version'=>self::VERSION,'planHash'=>self::hash()];
    }
    public static function ready(Database $db): void
    {
        if (!self::enabled()||!config('upms.employee_hafta_enabled',false)) { throw new ApiError(503,'H1C_DISABLED',publicMessage:'Reviewed employee-payment classification and first-production initialization are not enabled.',entry:false); }
        EmployeeHaftaSchema::ready($db);
    }
    public static function runtimeReady(Database $db): void
    {
        if (ChequeSchema::enabled()) { ChequeSchema::ready($db); return; }
        if (!self::enabled()||config('upms.production_profile')) { throw new \RuntimeException('H1C_ISOLATED_ONLY'); }
        self::verify($db->pdo());$runtime=$db->pdo()->query('SELECT CURRENT_USER()')->fetchColumn();$name=explode('@',$runtime)[0];$path=config('upms.labor_extension_guard_evidence');
        if (!is_string($path)||!is_file($path)||is_link($path)) { throw new \RuntimeException('H1C_GUARD_EVIDENCE_REQUIRED'); }
        $g=json_decode(file_get_contents($path),true,32,JSON_THROW_ON_ERROR);$count=(int)$db->pdo()->query('SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()')->fetchColumn();
        if (($g['passed']??false)!==true||($g['runtime']??'')!==$runtime||($g['targetHash']??'')!==CleanInitialization::target($db->pdo())||($g['extensionPlanHash']??'')!==self::hash()||($g['extensionHash']??'')!==LaborExtensionGuards::hash($name)||($g['baseHash']??'')!==CrudGuards::hash()||($g['moneyHash']??'')!==MoneyGuards::hash($name)||($g['expenseHash']??'')!==ExpenseGuards::hash($name)||($g['laborHash']??'')!==EmployeeHaftaGuards::hash($name)||($g['totalGuards']??0)!==103||$count!==103) { throw new \RuntimeException('H1C_GUARD_EVIDENCE_REJECTED'); }
    }
    public static function installIsolated(PDO $pdo,string $runtime): array
    {
        MoneySchema::assertIsolated($pdo);EmployeeHaftaSchema::verify($pdo);EmployeeHaftaGuards::verify($pdo,$runtime,(string)$pdo->query('SELECT CURRENT_USER()')->fetchColumn());
        foreach (array_keys(self::plan()['tables']) as $table) { if ($pdo->query("SHOW TABLES LIKE '$table'")->fetchColumn()) { throw new \RuntimeException('H1C_PARTIAL_INSTALL_REVIEW_REQUIRED'); } }
        foreach (self::plan()['tables'] as $ddl) { $pdo->exec($ddl); }
        $pdo->prepare("INSERT INTO labor_extension_receipts VALUES(1,?,?,'ISOLATED-UAT-H1C-ONLY',UTC_TIMESTAMP(6))")->execute([self::VERSION,self::hash()]);
        foreach (self::PERMISSIONS as $permission) { $pdo->prepare('INSERT INTO permissions(code) VALUES(?)')->execute([$permission]);$pdo->prepare("INSERT INTO role_permissions(role_code,permission_code) VALUES('administrator',?)")->execute([$permission]); }
        foreach (LaborExtensionGuards::plan($runtime) as $name=>$r) { $pdo->exec('CREATE TRIGGER `'.$name.'` BEFORE '.$r['event'].' ON `'.$r['table'].'` FOR EACH ROW '.$r['body']); }
        self::verify($pdo);
        return [...LaborExtensionGuards::verify($pdo,$runtime,(string)$pdo->query('SELECT CURRENT_USER()')->fetchColumn()),'extensionPlanHash'=>self::hash(),'runtime'=>$runtime.'@localhost','targetHash'=>CleanInitialization::target($pdo)];
    }
}
