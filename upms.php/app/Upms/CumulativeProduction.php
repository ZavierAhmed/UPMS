<?php

declare(strict_types=1);

namespace App\Upms;

use PDO;
use RuntimeException;

/** Reviewed cumulative contract. Private evidence is mandatory and never supplied by HTTP. */
final class CumulativeProduction
{
    public const CONTRACT = 'cumulative-production-v2';
    public const READY = 'CUMULATIVE_READY';
    public const ACTIVE = 'CUMULATIVE_ACTIVE';
    private static ?\WeakMap $verified = null;

    public static function uses(PDO $pdo): bool
    {
        return isset(self::$verified[$pdo]);
    }

    public static function permissions(): array
    {
        return array_values(array_unique([...CleanInitialization::plan()['permissions'],
            ...EmployeeHaftaSchema::PERMISSIONS, ...LaborExtensionSchema::PERMISSIONS,
            ...ChequeSchema::PERMISSIONS]));
    }

    public static function receipts(): array
    {
        return [
            'money_schema_receipts' => [MoneySchema::plan()['version'], MoneySchema::hash()],
            'expense_schema_receipts' => [ExpenseSchema::plan()['version'], ExpenseSchema::hash()],
            'labor_schema_receipts' => [EmployeeHaftaSchema::plan()['version'], EmployeeHaftaSchema::hash()],
            'labor_extension_receipts' => [LaborExtensionSchema::VERSION, LaborExtensionSchema::hash()],
            'cheque_schema_receipts' => [ChequeSchema::VERSION, ChequeSchema::hash()],
            'cheque_extra_receipts' => [ChequeExtras::VERSION, ChequeExtras::hash()],
        ];
    }

    public static function complete(PDO $installer, PDO $definer, array $scope, string $journal,
        array $accounts): array
    {
        if (PHP_SAPI !== 'cli') {
            throw new RuntimeException('CUMULATIVE_PRIVATE_OPERATION_REQUIRED');
        }
        $record = json_decode(file_get_contents($journal), true, 32, JSON_THROW_ON_ERROR);
        $proof = CumulativeInitialization::verifyInstalled($installer, $definer, $accounts);
        if ($installer->query('SELECT CURRENT_USER()')->fetchColumn() !== $accounts['installer']) {
            throw new RuntimeException('CUMULATIVE_INSTALLER_ACCOUNT_REJECTED');
        }
        if (($record['phase'] ?? '') !== 'ENROLLED' || $record['schema'] !== $scope['schema']
            || $record['reference'] !== $scope['reference'] || $record['release'] !== $scope['release']
            || $record['targetHash'] !== $proof['targetHash'] || $record['planHash'] !== $proof['planHash']
            || $record['accounts'] !== $accounts || $scope['targetHash'] !== $proof['targetHash']) {
            throw new RuntimeException('CUMULATIVE_COMPLETION_SCOPE_REJECTED');
        }
        $installer->beginTransaction();
        try {
            $row = $installer->query('SELECT * FROM upms_production_migrations WHERE id=1 FOR UPDATE')->fetch(PDO::FETCH_ASSOC);
            self::receipt($row, $scope, [CumulativeInitialization::STATE, self::READY]);
            if ($row['state'] === CumulativeInitialization::STATE) {
                $business = array_diff(array_keys(self::schema()['tables']), [
                    'upms_production_migrations','identity_guard','permissions','roles','role_permissions',
                    'v1_control','users','user_roles','identity_audit_events',
                ]);
                foreach ($business as $table) {
                    if ((int)$installer->query('SELECT COUNT(*) FROM `'.$table.'`')->fetchColumn() !== 0) {
                        throw new RuntimeException('CUMULATIVE_COMPLETION_REQUIRES_FRESH_DATA');
                    }
                }
                foreach (self::permissions() as $permission) {
                    $installer->prepare('INSERT IGNORE INTO permissions(code) VALUES(?)')->execute([$permission]);
                    if ($permission !== 'employee_labor.correct') {
                        $installer->prepare("INSERT IGNORE INTO role_permissions VALUES('administrator',?)")->execute([$permission]);
                    }
                }
                $defaults = MoneySchema::accounts(MoneySchema::defaults());
                foreach ($defaults as $account) {
                    $installer->prepare('INSERT INTO money_accounts(code,name,type) VALUES(?,?,?)')->execute(array_values($account));
                }
                foreach (self::receipts() as $table => [$version, $hash]) {
                    if ($table === 'money_schema_receipts') {
                        $installer->prepare('INSERT INTO money_schema_receipts VALUES(1,?,?,?,?,UTC_TIMESTAMP(6))')
                            ->execute([$version,$hash,hash('sha256',json_encode($defaults,JSON_THROW_ON_ERROR)),$scope['reference']]);
                    } elseif ($table === 'cheque_extra_receipts') {
                        $installer->prepare('INSERT INTO cheque_extra_receipts VALUES(1,?,?,UTC_TIMESTAMP(6))')->execute([$version,$hash]);
                    } else {
                        $installer->prepare('INSERT INTO `'.$table.'` VALUES(1,?,?,?,UTC_TIMESTAMP(6))')
                            ->execute([$version,$hash,$scope['reference']]);
                    }
                }
                $installer->prepare('UPDATE v1_control SET operator_id=? WHERE id=1 AND state=\'PENDING\'')
                    ->execute([$record['users']['admin']]);
                $installer->prepare('UPDATE upms_production_migrations SET state=? WHERE id=1')->execute([self::READY]);
            }
            self::features($installer, $scope['reference']);
            $installer->commit();
        } catch (\Throwable $error) {
            if ($installer->inTransaction()) {
                $installer->rollBack();
            }
            throw $error;
        }
        $evidence = $proof + ['contract' => self::CONTRACT, 'state' => self::READY,
            'reference' => $scope['reference'], 'release' => $scope['release'],
            'operators' => $record['users'], 'featureReceipts' => self::receipts()];
        return $evidence;
    }

    public static function schema(): array
    {
        return json_decode(file_get_contents(dirname(__DIR__,2).'/resources/cumulative-clean-schema.json'), true, 64, JSON_THROW_ON_ERROR);
    }

    private static function receipt(array|false $row, array $scope, array $states): void
    {
        if (!$row || $row['reference'] !== $scope['reference'] || $row['plan_hash'] !== CumulativeInitialization::hash()
            || $row['target_hash'] !== $scope['targetHash'] || $row['step'] !== $scope['release']
            || !in_array($row['state'], $states, true)) {
            throw new RuntimeException('CUMULATIVE_RECEIPT_REJECTED');
        }
    }

    public static function features(PDO $pdo, string $reference): void
    {
        foreach (self::receipts() as $table => [$version,$hash]) {
            $rows = $pdo->query('SELECT * FROM `'.$table.'`')->fetchAll(PDO::FETCH_ASSOC);
            if (count($rows) !== 1 || (string)$rows[0]['id'] !== '1' || $rows[0]['version'] !== $version
                || $rows[0]['plan_hash'] !== $hash
                || (isset($rows[0]['reference']) && $rows[0]['reference'] !== $reference)) {
                throw new RuntimeException('CUMULATIVE_FEATURE_RECEIPT_REJECTED');
            }
        }
        MoneySchema::verify($pdo);
        $expected = self::permissions();
        sort($expected);
        if ($pdo->query('SELECT code FROM permissions ORDER BY code')->fetchAll(PDO::FETCH_COLUMN) !== $expected) {
            throw new RuntimeException('CUMULATIVE_PERMISSIONS_REJECTED');
        }
        $granted = $pdo->query("SELECT permission_code FROM role_permissions WHERE role_code='administrator' ORDER BY permission_code")->fetchAll(PDO::FETCH_COLUMN);
        $wanted = array_values(array_diff($expected, ['employee_labor.correct']));
        if ($granted !== $wanted) {
            throw new RuntimeException('CUMULATIVE_ADMIN_GRANTS_REJECTED');
        }
        $roles=[];$grants=[];
        foreach (CleanInitialization::plan()['roles'] as $role) {
            $roles[]=$role['code'].'|'.$role['name'];
            foreach ($role['code']==='administrator' ? $wanted : $role['permissions'] as $permission) {
                $grants[]=$role['code'].'|'.$permission;
            }
        }
        sort($roles);sort($grants);
        if ($pdo->query("SELECT CONCAT(code,'|',name) FROM roles ORDER BY code")->fetchAll(PDO::FETCH_COLUMN)!==$roles
            || $pdo->query("SELECT CONCAT(role_code,'|',permission_code) FROM role_permissions ORDER BY role_code,permission_code")->fetchAll(PDO::FETCH_COLUMN)!==$grants) {
            throw new RuntimeException('CUMULATIVE_ROLE_CATALOG_REJECTED');
        }
    }

    public static function privateEvidence(array $profile, string $key): array
    {
        $file = $profile[$key.'File'] ?? '';
        $digest = $profile[$key.'Sha256'] ?? '';
        if (!is_string($file) || !is_file($file) || is_link($file) || !preg_match('/^[a-f0-9]{64}$/D', $digest)
            || !hash_equals($digest, hash_file('sha256',$file))) {
            throw new RuntimeException('CUMULATIVE_PRIVATE_EVIDENCE_REJECTED');
        }
        return json_decode(file_get_contents($file), true, 64, JSON_THROW_ON_ERROR);
    }

    public static function runtime(PDO $pdo, array $profile): void
    {
        $proof = self::privateEvidence($profile, 'cumulativeEvidence');
        $scope = ['reference' => $profile['reference'],'release' => $profile['releaseSha'],
            'targetHash' => CleanInitialization::target($pdo)];
        if (($proof['contract'] ?? '') !== self::CONTRACT || ($proof['state']??'')!==self::READY
            || $proof['planHash'] !== CumulativeInitialization::hash()
            || $proof['targetHash'] !== $scope['targetHash'] || $proof['reference'] !== $scope['reference']
            || $proof['release'] !== $scope['release'] || $proof['operators'] !== $profile['operators']
            || $proof['accounts']['runtime'] !== $pdo->query('SELECT CURRENT_USER()')->fetchColumn()
            || $proof['featureReceipts'] !== self::receipts()) {
            throw new RuntimeException('CUMULATIVE_RUNTIME_PROOF_REJECTED');
        }
        ChequeExtras::runtimePrivileges($pdo);
        $schema = self::schema();
        $tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
        $expected = array_keys($schema['tables']);
        sort($tables);
        sort($expected);
        if ($tables !== $expected) {
            throw new RuntimeException('CUMULATIVE_TABLE_SET_REJECTED');
        }
        foreach ($schema['tables'] as $table => $ddl) {
            CleanInitialization::verifyTable($pdo, ['table'=>$table,'sql'=>$ddl]);
        }
        $names = $pdo->query('SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()')->fetchAll(PDO::FETCH_COLUMN);
        $expectedNames = array_column($schema['guards'], 'name');
        sort($names);
        sort($expectedNames);
        // MariaDB may hide even trigger names from an identity without TRIGGER.
        // Exact bodies, SQL modes and definers were checked by the scoped definer
        // when generating the private digest pinned by this runtime profile.
        if (($names !== [] && $names !== $expectedNames) || $proof['guards'] !== 133 || $proof['tables'] !== 47
            || ($proof['guardDefinitionsHash']??'') !== CumulativeInitialization::guardDefinitionsHash($proof['accounts'])) {
            throw new RuntimeException('CUMULATIVE_GUARD_SET_REJECTED');
        }
        $row = $pdo->query('SELECT * FROM upms_production_migrations WHERE id=1')->fetch(PDO::FETCH_ASSOC);
        if ((int)$pdo->query('SELECT COUNT(*) FROM upms_production_migrations')->fetchColumn()!==1) {
            throw new RuntimeException('CUMULATIVE_RECEIPT_SET_REJECTED');
        }
        self::receipt($row, $scope, [self::READY,self::ACTIVE]);
        self::features($pdo, $scope['reference']);
        $control = $pdo->query('SELECT operator_id,state FROM v1_control WHERE id=1')->fetch(PDO::FETCH_ASSOC);
        if (!$control || (string)$control['operator_id'] !== $profile['operators']['admin']
            || $control['state'] !== ($row['state'] === self::ACTIVE ? 'READY' : 'PENDING')) {
            throw new RuntimeException('CUMULATIVE_CONTROL_STATE_REJECTED');
        }
        OperatorPolicy::permits(['username'=>'admin','id'=>$profile['operators']['admin']],$control,
            ['schema'=>$profile['schema'],'users'=>$profile['operators']],$profile['schema']);
        if ($row['state'] === self::ACTIVE) {
            self::authorization($pdo, $profile, $scope);
        }
        self::$verified ??= new \WeakMap();
        self::$verified[$pdo] = ['active'=>$row['state'] === self::ACTIVE];
    }

    public static function authorization(PDO $pdo, array $profile, array $scope): void
    {
        $approval = self::privateEvidence($profile, 'activationApproval');
        $recovery = self::privateEvidence($profile, 'recoveryEvidence');
        foreach ([$approval,$recovery] as $record) {
            if (($record['targetHash']??'') !== $scope['targetHash'] || ($record['release']??'') !== $scope['release']
                || ($record['reference']??'') !== $scope['reference']) {
                throw new RuntimeException('CUMULATIVE_AUTHORIZATION_TARGET_REJECTED');
            }
        }
        if (($approval['status']??'') !== 'EXPLICIT_CUMULATIVE_ACTIVATION_APPROVED'
            || ($approval['readinessSha256']??'') !== $profile['cumulativeEvidenceSha256']
            || ($approval['recoverySha256']??'') !== $profile['recoveryEvidenceSha256']
            || ($recovery['format']??'') !== 'UPMS_PRODUCTION_BACKUP_V2'
            || ($recovery['passed']??false) !== true || ($recovery['restoredTables']??0) !== 47
            || ($recovery['restoredGuards']??0) !== 133 || ($recovery['tamperRejected']??false) !== true
            || !preg_match('/^[a-f0-9]{64}$/D',$recovery['archiveSha256']??'')
            || (!self::synthetic($pdo) && ($recovery['independentOwnerRecoveryVerified']??false) !== true)) {
            throw new RuntimeException('CUMULATIVE_ACTIVATION_GATES_REJECTED');
        }
    }

    public static function activate(PDO $installer, PDO $runtime, array $profile): void
    {
        if (PHP_SAPI !== 'cli') {
            throw new RuntimeException('CUMULATIVE_PRIVATE_OPERATION_REQUIRED');
        }
        self::runtime($runtime, $profile);
        $proof = self::privateEvidence($profile, 'cumulativeEvidence');
        if (CleanInitialization::target($installer) !== CleanInitialization::target($runtime)
            || $installer->query('SELECT CURRENT_USER()')->fetchColumn() !== $proof['accounts']['installer']) {
            throw new RuntimeException('CUMULATIVE_ACTIVATION_INSTALLER_REJECTED');
        }
        self::authorization($runtime, $profile, ['targetHash'=>CleanInitialization::target($runtime),
            'release'=>$profile['releaseSha'],'reference'=>$profile['reference']]);
        $installer->beginTransaction();
        try {
            $row=$installer->query('SELECT * FROM upms_production_migrations WHERE id=1 FOR UPDATE')->fetch(PDO::FETCH_ASSOC);
            self::receipt($row,['targetHash'=>CleanInitialization::target($installer),
                'release'=>$profile['releaseSha'],'reference'=>$profile['reference']],[self::READY,self::ACTIVE]);
            $installer->exec("UPDATE v1_control SET state='READY' WHERE id=1");
            $installer->prepare('UPDATE upms_production_migrations SET state=? WHERE id=1')->execute([self::ACTIVE]);
            $installer->commit();
        } catch (\Throwable $error) {
            if ($installer->inTransaction()) { $installer->rollBack(); }
            throw $error;
        }
    }

    public static function writesAllowed(PDO $pdo): bool
    {
        return !self::uses($pdo) || self::$verified[$pdo]['active'];
    }

    private static function synthetic(PDO $pdo): bool
    {
        $row=$pdo->query('SELECT DATABASE() db,@@datadir data,@@skip_networking offline')->fetch(PDO::FETCH_ASSOC);
        $base=realpath(getenv('HOME').'/.cache/upms-php81-local');
        $data=realpath($row['data']);
        return PHP_OS_FAMILY==='Linux' && $base && $data
            && preg_match('/^upms_stage_[0-9]+$/D',$row['db'])
            && str_starts_with($data,$base.'/p42c-') && (int)$row['offline']===1;
    }
}
