<?php

declare(strict_types=1);
namespace App\Upms;
use PDO;

/** Only a positively identified, additive synthetic UAT migration is exposed. */
final class ChequeSchema
{
    public const VERSION='uat2-v1';
    public const PERMISSIONS=['cheques.view','cheques.receive','cheques.deposit','cheques.clear','cheques.dishonour','cheques.dispose','cheques.reports'];
    public static function enabled(): bool { return (bool)config('upms.cheque_management_enabled',false); }
    public static function plan(): array { return json_decode(file_get_contents(dirname(__DIR__,2).'/resources/cheque-schema.json'),true,32,JSON_THROW_ON_ERROR); }
    public static function hash(): string { return hash('sha256',json_encode(self::plan(),JSON_THROW_ON_ERROR)); }
    public static function hashes(PDO $pdo): array { $a=[];foreach(self::plan()['tables'] as $t=>$ddl) { $a[$t]=hash('sha256',CleanInitialization::normalize($pdo->query('SHOW CREATE TABLE `'.$t.'`')->fetch(PDO::FETCH_NUM)[1])); }return $a; }
    public static function verify(PDO $pdo): array
    {
        LaborExtensionSchema::verify($pdo,true);
        $expected=json_decode(file_get_contents(dirname(__DIR__,2).'/resources/cheque-schema-hashes.json'),true,32,JSON_THROW_ON_ERROR);
        $r=$pdo->query('SELECT * FROM cheque_schema_receipts WHERE id=1')->fetch(PDO::FETCH_ASSOC);
        if(self::hashes($pdo)!==$expected||!$r||$r['version']!==self::VERSION||$r['plan_hash']!==self::hash()||(!CumulativeProduction::uses($pdo)&&$r['reference']!=='ISOLATED-UAT2-ONLY')) { throw new \RuntimeException('CHEQUE_SCHEMA_REJECTED'); }
        if(ChequeExtras::enabled()) { ChequeExtras::verify($pdo); }
        return ['passed'=>true,'tables'=>ChequeExtras::enabled()?47:44,'version'=>self::VERSION,'planHash'=>self::hash()];
    }
    public static function ready(Database $db): void
    {
        if (self::enabled() && LaborExtensionSchema::enabled() && config('upms.employee_hafta_enabled',false)
            && config('upms.money_accounts_enabled',false) && CumulativeProduction::uses($db->pdo())) { return; }
        if(!self::enabled()||!LaborExtensionSchema::enabled()||!config('upms.employee_hafta_enabled',false)||!config('upms.money_accounts_enabled',false)||config('upms.production_profile')) { throw new ApiError(503,'CHEQUE_ISOLATED_FEATURE_REQUIRED',entry:false); }
        // One readiness verification per real HTTP request/connection. Nested existing
        // financial checks share it; no cache survives a subsequent HTTP request.
        $request=app('request');$connection=$db->pdo();
        if($request->attributes->get('upms.cheque.ready')===$connection) { return; }
        self::verify($db->pdo());
        if(ChequeExtras::enabled()) { ChequeExtras::runtimePrivileges($db->pdo()); }
        $path=config('upms.cheque_guard_evidence');
        if(!is_string($path)||!is_file($path)||is_link($path)) { throw new ApiError(503,'CHEQUE_GUARD_EVIDENCE_REQUIRED',entry:false); }
        $g=json_decode(file_get_contents($path),true,32,JSON_THROW_ON_ERROR);$runtime=(string)$db->pdo()->query('SELECT CURRENT_USER()')->fetchColumn();
        // CRUD identities cannot read trigger bodies. A maintenance-generated exact-definition
        // proof is bound to this target/runtime and every plan; runtime verifies visible names.
        $name=explode('@',$runtime)[0];$rules=[...CrudGuards::plan($name),...MoneyGuards::plan($name),...ExpenseGuards::plan($name),...EmployeeHaftaGuards::plan($name),...LaborExtensionGuards::plan($name),...ChequeGuards::plan($name)];
        $names=$db->pdo()->query('SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()')->fetchAll(PDO::FETCH_COLUMN);$expected=array_keys($rules);sort($expected);sort($names);
        $hashes=['baseHash'=>CrudGuards::hash(),'moneyHash'=>MoneyGuards::hash($name),'expenseHash'=>ExpenseGuards::hash($name),'laborHash'=>EmployeeHaftaGuards::hash($name),'extensionHash'=>LaborExtensionGuards::hash($name),'chequeHash'=>ChequeGuards::hash($name)];
        $valid=true;foreach($hashes as $key=>$hash) { if(($g[$key]??'')!==$hash) { $valid=false; } }
        if(!$valid||$names!==$expected||($g['passed']??false)!==true||($g['runtime']??'')!==$runtime||($g['targetHash']??'')!==CleanInitialization::target($db->pdo())||($g['chequePlanHash']??'')!==self::hash()||($g['totalGuards']??0)!==count($rules)) { throw new ApiError(503,'CHEQUE_READINESS_REJECTED',entry:false); }
        $request->attributes->set('upms.cheque.ready',$connection);
    }
    public static function installIsolated(PDO $pdo,string $runtime): array
    {
        MoneySchema::assertIsolated($pdo);LaborExtensionSchema::verify($pdo);LaborExtensionGuards::verify($pdo,$runtime,(string)$pdo->query('SELECT CURRENT_USER()')->fetchColumn());
        $before=[];foreach(LaborExtensionRecovery::tables() as $t) { $before[$t]=$pdo->query('SELECT * FROM `'.$t.'`')->fetchAll(PDO::FETCH_ASSOC); }
        foreach(self::plan()['tables'] as $t=>$ddl) { if($pdo->query("SHOW TABLES LIKE '$t'")->fetchColumn()) { throw new \RuntimeException('CHEQUE_PARTIAL_INSTALL_REVIEW_REQUIRED'); } }
        foreach(self::plan()['tables'] as $ddl) { $pdo->exec($ddl); }
        $pdo->prepare("INSERT INTO cheque_schema_receipts VALUES(1,?,?,'ISOLATED-UAT2-ONLY',UTC_TIMESTAMP(6))")->execute([self::VERSION,self::hash()]);
        $pdo->exec("INSERT INTO cheque_issuing_banks VALUES(1,'UATBANK01','UAT issuing bank A'),(2,'UATBANK02','UAT issuing bank B')");
        foreach(self::PERMISSIONS as $p) { $pdo->prepare('INSERT INTO permissions(code) VALUES(?)')->execute([$p]);$pdo->prepare("INSERT INTO role_permissions VALUES('administrator',?)")->execute([$p]); }
        foreach(ChequeGuards::plan($runtime) as $name=>$r) { $pdo->exec('CREATE TRIGGER `'.$name.'` BEFORE '.$r['event'].' ON `'.$r['table'].'` FOR EACH ROW '.$r['body']); }
        foreach($before as $t=>$rows) {
            $after=array_map(Cheques::hash(...),$pdo->query('SELECT * FROM `'.$t.'`')->fetchAll(PDO::FETCH_ASSOC));
            foreach($rows as $row) { if(!in_array(Cheques::hash($row),$after,true)) { throw new \RuntimeException('CHEQUE_BASELINE_ROW_CHANGED'); } }
        }
        return [...ChequeGuards::verify($pdo,$runtime,(string)$pdo->query('SELECT CURRENT_USER()')->fetchColumn()),'chequePlanHash'=>self::hash(),'runtime'=>$runtime.'@localhost','targetHash'=>CleanInitialization::target($pdo),'baselineTables'=>38,'baselineGuards'=>103,'baselineRowsPreserved'=>true];
    }
}
