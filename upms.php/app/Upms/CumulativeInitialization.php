<?php

declare(strict_types=1);

namespace App\Upms;

use PDO;
use RuntimeException;

/** Private bootstrap stage. A pending receipt does not authorize application startup. */
final class CumulativeInitialization
{
    public const STATE = 'CUMULATIVE_PENDING';
    public const VERSION = 'cumulative-clean-v1';

    private static function plan(): array
    {
        $source = file_get_contents(dirname(__DIR__, 2).'/resources/cumulative-clean-schema.json');
        $plan = json_decode($source, true, 64, JSON_THROW_ON_ERROR);
        if ($plan['version'] !== 1 || count($plan['tables']) !== 47 || count($plan['guards']) !== 133) {
            throw new RuntimeException('CUMULATIVE_PLAN_REJECTED');
        }
        $steps = [];
        $known = [];
        while (count($known) < 47) {
            $added = false;
            foreach ($plan['tables'] as $name => $ddl) {
                if (isset($known[$name])) {
                    continue;
                }
                preg_match_all('/REFERENCES `([a-z0-9_]+)`/', $ddl, $refs);
                if (array_diff($refs[1], [...array_keys($known), $name])) {
                    continue;
                }
                if (!str_starts_with($ddl, 'CREATE TABLE '.self::identifier($name).' (')) {
                    throw new RuntimeException('CUMULATIVE_TABLE_REJECTED');
                }
                $steps[] = ['type' => 'table', 'name' => $name, 'ddl' => $ddl];
                $known[$name] = true;
                $added = true;
            }
            if (!$added) {
                throw new RuntimeException('CUMULATIVE_DEPENDENCY_REJECTED');
            }
        }
        foreach ($plan['guards'] as $guard) {
            if (!isset($known[$guard['table']]) || !in_array($guard['timing'], ['BEFORE', 'AFTER'], true)
                || !in_array($guard['event'], ['INSERT', 'UPDATE', 'DELETE'], true)) {
                throw new RuntimeException('CUMULATIVE_GUARD_REJECTED');
            }
            $steps[] = ['type' => 'guard'] + $guard;
        }
        return [hash('sha256', $source), $steps];
    }

    private static function identifier(string $name): string
    {
        if (!preg_match('/^[a-zA-Z0-9_]+$/D', $name)) {
            throw new RuntimeException('CUMULATIVE_IDENTIFIER_REJECTED');
        }
        return '`'.$name.'`';
    }

    public static function verifyGrant(PDO $pdo, string $schema, string $account, array $required): void
    {
        if ($pdo->query('SELECT CURRENT_USER()')->fetchColumn() !== $account) {
            throw new RuntimeException('CUMULATIVE_ACCOUNT_REJECTED');
        }
        $scope = str_replace('_', '\_', $schema);
        $grants = $pdo->query('SHOW GRANTS')->fetchAll(PDO::FETCH_COLUMN);
        $actual = null;
        if (count($grants) !== 2) {
            throw new RuntimeException('CUMULATIVE_GRANTS_REJECTED');
        }
        foreach ($grants as $grant) {
            if (str_contains($grant, 'WITH GRANT OPTION')) {
                throw new RuntimeException('CUMULATIVE_GRANTS_REJECTED');
            }
            if (str_starts_with($grant, 'GRANT USAGE ON *.* TO ')) {
                continue;
            }
            $suffix = ' ON `'.$scope.'`.* TO ';
            $at = strpos($grant, $suffix);
            if ($at === false || !str_starts_with($grant, 'GRANT ')) {
                throw new RuntimeException('CUMULATIVE_GRANTS_REJECTED');
            }
            $actual = explode(', ', substr($grant, 6, $at - 6));
        }
        if ($actual === null) {
            throw new RuntimeException('CUMULATIVE_GRANTS_REJECTED');
        }
        sort($actual);
        sort($required);
        if ($actual !== $required) {
            throw new RuntimeException('CUMULATIVE_GRANTS_REJECTED');
        }
    }

    private static function inventory(PDO $installer, PDO $definer): array
    {
        $tables = $installer->query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()')->fetchAll(PDO::FETCH_COLUMN);
        $guards = $definer->query('SELECT TRIGGER_NAME,EVENT_OBJECT_TABLE,EVENT_MANIPULATION,ACTION_TIMING,ACTION_STATEMENT,DEFINER,SQL_MODE FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()')->fetchAll(PDO::FETCH_ASSOC);
        return ['table' => array_fill_keys($tables, true), 'guard' => array_column($guards, null, 'TRIGGER_NAME')];
    }

    public static function hash(): string
    {
        return self::plan()[0];
    }

    public static function verifyInstalled(PDO $reader, PDO $definer, array $accounts, ?string $backupAccount = null): array
    {
        if (($backupAccount !== null && (!preg_match('/^[a-zA-Z0-9_]+@localhost$/D', $backupAccount)
                || in_array($backupAccount, $accounts, true)))
            || $reader->query('SELECT CURRENT_USER()')->fetchColumn() !== ($backupAccount ?? $accounts['installer'])
            || CleanInitialization::target($reader) !== CleanInitialization::target($definer)) {
            throw new RuntimeException('CUMULATIVE_VERIFIER_IDENTITY_REJECTED');
        }
        [, $steps] = self::plan();
        $inventory = self::inventory($reader, $definer);
        if (count($inventory['table']) !== 47 || count($inventory['guard']) !== 133) {
            throw new RuntimeException('CUMULATIVE_OBJECT_SET_REJECTED');
        }
        foreach ($steps as $step) {
            self::verifyStep($reader, $step, $inventory, $accounts, false);
        }
        self::verifyGrant($reader, (string)$reader->query('SELECT DATABASE()')->fetchColumn(),
            $backupAccount ?? $accounts['installer'], $backupAccount === null ? ['CREATE','REFERENCES','SELECT','INSERT','UPDATE'] : ['SELECT']);
        self::verifyGrant($definer, (string)$reader->query('SELECT DATABASE()')->fetchColumn(),
            $accounts['definer'], ['SELECT','TRIGGER']);
        return ['planHash' => self::hash(), 'targetHash' => CleanInitialization::target($reader),
            'accounts' => $accounts, 'tables' => 47, 'guards' => 133,
            'guardDefinitionsHash' => self::guardDefinitionsHash($accounts)];
    }

    public static function guardDefinitionsHash(array $accounts): string
    {
        [, $steps] = self::plan();
        $guards = [];
        foreach ($steps as $step) {
            if ($step['type'] === 'guard') {
                $guards[$step['name']] = [$step['table'],$step['event'],$step['timing'],
                    self::body($step,explode('@',$accounts['runtime'])[0]),$accounts['definer'],$step['sqlMode']];
            }
        }
        ksort($guards);
        return hash('sha256',json_encode($guards,JSON_THROW_ON_ERROR));
    }

    private static function body(array $step, string $runtime): string
    {
        return str_replace('__UPMS_RUNTIME__', $runtime, $step['body']);
    }

    private static function verifyStep(PDO $pdo, array $step, array $inventory, array $accounts, bool $empty): void
    {
        $name = $step['name'];
        if (!isset($inventory[$step['type']][$name])) {
            throw new RuntimeException('CUMULATIVE_OBJECT_MISSING');
        }
        if ($step['type'] === 'table') {
            CleanInitialization::verifyTable($pdo, ['table' => $name, 'sql' => $step['ddl']]);
            if ($empty && (int)$pdo->query('SELECT COUNT(*) FROM '.self::identifier($name))->fetchColumn() !== 0) {
                throw new RuntimeException('CUMULATIVE_UNEXPECTED_ROWS');
            }
            return;
        }
        $row = $inventory['guard'][$name];
        $expected = [
            'TRIGGER_NAME' => $name, 'EVENT_OBJECT_TABLE' => $step['table'],
            'EVENT_MANIPULATION' => $step['event'], 'ACTION_TIMING' => $step['timing'],
            'ACTION_STATEMENT' => self::body($step, explode('@', $accounts['runtime'])[0]),
            'DEFINER' => $accounts['definer'], 'SQL_MODE' => $step['sqlMode'],
        ];
        if ($row !== $expected) {
            throw new RuntimeException('CUMULATIVE_GUARD_DEFINITION_REJECTED');
        }
    }

    public static function initialize(PDO $installer, PDO $definer, PDO $runtime, array $scope,
        string $journal, array $passwords, ?\Closure $afterDdl = null): array
    {
        if (PHP_SAPI !== 'cli' || !preg_match('/^[a-zA-Z0-9_-]{12,64}$/D', $scope['reference'] ?? '')
            || !preg_match('/^[0-9a-f]{40}$/D', $scope['release'] ?? '')
            || !is_dir(dirname($journal)) || is_link($journal)) {
            throw new RuntimeException('CUMULATIVE_INITIALIZATION_SCOPE_REJECTED');
        }
        $schema = $scope['schema'];
        self::identifier($schema);
        $accounts = $scope['accounts'];
        if (count(array_unique($accounts)) !== 3
            || array_filter($accounts, fn ($account) => !is_string($account) || !preg_match('/^[a-zA-Z0-9_]+@localhost$/D', $account))) {
            throw new RuntimeException('CUMULATIVE_DISTINCT_IDENTITIES_REQUIRED');
        }
        foreach (['installer' => [$installer, ['CREATE','REFERENCES','SELECT','INSERT','UPDATE']],
            'definer' => [$definer, ['SELECT','TRIGGER']],
            'runtime' => [$runtime, ['SELECT','INSERT','UPDATE','DELETE']]] as $role => [$pdo, $grants]) {
            if ($pdo->query('SELECT DATABASE()')->fetchColumn() !== $schema
                || !preg_match('/^10\.11\.\d+-MariaDB/', (string)$pdo->query('SELECT VERSION()')->fetchColumn())
                || $pdo->query('SELECT @@collation_database')->fetchColumn() !== 'utf8mb4_unicode_ci'
                || CleanInitialization::target($pdo) !== $scope['targetHash']) {
                throw new RuntimeException('CUMULATIVE_TARGET_REJECTED');
            }
            self::verifyGrant($pdo, $schema, $accounts[$role], $grants);
        }
        [$planHash,$steps] = self::plan();
        $pin = ['version' => self::VERSION, 'schema' => $schema, 'reference' => $scope['reference'],
            'release' => $scope['release'], 'targetHash' => $scope['targetHash'], 'planHash' => $planHash,
            'accounts' => $accounts];
        $lock = 'upms42b:'.substr(hash('sha256', $schema), 0, 48);
        $acquire = $installer->prepare('SELECT GET_LOCK(?,0)');
        $acquire->execute([$lock]);
        if ((int)$acquire->fetchColumn() !== 1) {
            throw new RuntimeException('CUMULATIVE_INITIALIZATION_LOCKED');
        }
        try {
            $actual = self::inventory($installer, $definer);
            $first = !is_file($journal);
            $record = $first ? $pin + ['completed' => 0, 'inFlight' => null, 'phase' => 'DDL'] :
                json_decode(file_get_contents($journal), true, 32, JSON_THROW_ON_ERROR);
            if (array_intersect_key($record, $pin) !== $pin
                || !is_int($record['completed'] ?? null) || $record['completed'] < 0 || $record['completed'] > count($steps)
                || ($record['inFlight'] !== null && $record['inFlight'] !== $record['completed'])
                || !in_array($record['phase'] ?? '', ['DDL','CATALOG','ENROLLED'], true)
                || ($record['phase'] !== 'DDL' && $record['completed'] !== count($steps))) {
                throw new RuntimeException('CUMULATIVE_JOURNAL_REJECTED');
            }
            $permitted = ['table' => [], 'guard' => []];
            foreach (array_slice($steps, 0, $record['completed'] + ($record['inFlight'] !== null ? 1 : 0)) as $step) {
                $permitted[$step['type']][$step['name']] = true;
            }
            foreach ($actual as $type => $objects) {
                if (array_diff_key($objects, $permitted[$type])) {
                    throw new RuntimeException('CUMULATIVE_UNEXPECTED_OBJECT');
                }
            }
            if ($first) {
                CleanInitialization::privateReceipt($journal, $record, true);
            }
            foreach (array_slice($steps, 0, $record['completed']) as $step) {
                self::verifyStep($installer, $step, $actual, $accounts, $record['phase'] === 'DDL');
            }
            while ($record['completed'] < count($steps)) {
                $step = $steps[$record['completed']];
                if (!isset($actual[$step['type']][$step['name']])) {
                    $record['inFlight'] = $record['completed'];
                    CleanInitialization::privateReceipt($journal, $record);
                    if ($step['type'] === 'table') {
                        $installer->exec($step['ddl']);
                    } else {
                        $definer->prepare('SET SESSION sql_mode=?')->execute([$step['sqlMode']]);
                        $definer->exec('CREATE TRIGGER '.self::identifier($step['name']).' '.$step['timing'].' '.$step['event'].
                            ' ON '.self::identifier($step['table']).' FOR EACH ROW '.self::body($step, explode('@', $accounts['runtime'])[0]));
                    }
                    $afterDdl?->__invoke($record['completed']);
                    $actual = self::inventory($installer, $definer);
                }
                self::verifyStep($installer, $step, $actual, $accounts, true);
                $record['completed']++;
                $record['inFlight'] = null;
                CleanInitialization::privateReceipt($journal, $record);
            }
            if ($record['phase'] === 'DDL') {
                // The CATALOG intent is durable before the database seed transaction.
                $record['phase'] = 'CATALOG';
                CleanInitialization::privateReceipt($journal, $record);
            }
            $receipt = $installer->query('SELECT reference,plan_hash,target_hash,state,step FROM upms_production_migrations WHERE id=1')->fetch(PDO::FETCH_ASSOC);
            $expected = ['reference' => $scope['reference'], 'plan_hash' => $planHash,
                'target_hash' => $scope['targetHash'], 'state' => self::STATE, 'step' => $scope['release']];
            if (!$receipt && $record['phase'] === 'CATALOG') {
                foreach ($steps as $step) {
                    self::verifyStep($installer, $step, $actual, $accounts, true);
                }
                self::seed($installer, $expected);
                $receipt = $expected;
            }
            if ($receipt !== $expected || (int)$installer->query('SELECT COUNT(*) FROM upms_production_migrations')->fetchColumn() !== 1) {
                throw new RuntimeException('CUMULATIVE_PENDING_RECEIPT_REJECTED');
            }
            self::verifyCatalog($installer);
            // Only bootstrap catalogs and enrollment audit data are allowed in this stage.
            $allowed = ['upms_production_migrations','identity_guard','permissions','roles','role_permissions',
                'v1_control','users','user_roles','identity_audit_events'];
            foreach ($steps as $step) {
                if ($step['type'] === 'table' && !in_array($step['name'], $allowed, true)) {
                    self::verifyStep($installer, $step, $actual, $accounts, true);
                }
            }
            $count = (int)$installer->query('SELECT COUNT(*) FROM users')->fetchColumn();
            $audit = $installer->prepare("SELECT COUNT(*) FROM identity_audit_events WHERE action='administrators.provisioned' AND correlation=?");
            $audit->execute([$scope['reference']]);
            $enrolled = (int)$audit->fetchColumn();
            if (($count !== 0 || $enrolled !== 0) && ($count !== 2 || $enrolled !== 1)) {
                throw new RuntimeException('CUMULATIVE_ENROLLMENT_STATE_REJECTED');
            }
            $users = AdminProvisioning::apply($installer, $scope['reference'], $passwords);
            $record['phase'] = 'ENROLLED';
            $record['users'] = $users['users'];
            CleanInitialization::privateReceipt($journal, $record);
            return ['schema' => $schema, 'tables' => 47, 'guards' => 133, 'state' => self::STATE,
                'adminIds' => $users['users'], 'businessPostingEnabled' => false, 'productionStartupEnabled' => false];
        } finally {
            $installer->prepare('SELECT RELEASE_LOCK(?)')->execute([$lock]);
        }
    }

    private static function verifyCatalog(PDO $pdo): void
    {
        $plan = CleanInitialization::plan();
        $permissions = $plan['permissions'];
        sort($permissions);
        $roles = [];
        $grants = [];
        foreach ($plan['roles'] as $role) {
            $roles[] = $role['code'].'|'.$role['name'];
            foreach ($role['permissions'] as $permission) {
                $grants[] = $role['code'].'|'.$permission;
            }
        }
        sort($roles);
        sort($grants);
        $control = $pdo->query('SELECT id,version,operator_id,state,next_dc,entry_version,next_item_code FROM v1_control')->fetchAll(PDO::FETCH_ASSOC);
        $expectedControl = ['id' => '1','version' => '1','operator_id' => null,'state' => 'PENDING',
            'next_dc' => '1','entry_version' => '2','next_item_code' => '1'];
        if ($pdo->query('SELECT code FROM permissions ORDER BY code')->fetchAll(PDO::FETCH_COLUMN) !== $permissions
            || $pdo->query("SELECT CONCAT(code,'|',name) FROM roles ORDER BY code")->fetchAll(PDO::FETCH_COLUMN) !== $roles
            || $pdo->query("SELECT CONCAT(role_code,'|',permission_code) FROM role_permissions ORDER BY role_code,permission_code")->fetchAll(PDO::FETCH_COLUMN) !== $grants
            || array_map(fn ($row) => array_map(fn ($value) => $value === null ? null : (string)$value, $row), $control) !== [$expectedControl]
            || array_map('strval', $pdo->query('SELECT id FROM identity_guard')->fetchAll(PDO::FETCH_COLUMN)) !== ['1']) {
            throw new RuntimeException('CUMULATIVE_CATALOG_REJECTED');
        }
    }

    private static function seed(PDO $pdo, array $receipt): void
    {
        $plan = CleanInitialization::plan();
        $pdo->beginTransaction();
        try {
            $pdo->exec('INSERT INTO identity_guard(id) VALUES(1)');
            $insertPermission = $pdo->prepare('INSERT INTO permissions(code) VALUES(?)');
            foreach ($plan['permissions'] as $permission) {
                $insertPermission->execute([$permission]);
            }
            $insertRole = $pdo->prepare('INSERT INTO roles(code,name) VALUES(?,?)');
            $grant = $pdo->prepare('INSERT INTO role_permissions(role_code,permission_code) VALUES(?,?)');
            foreach ($plan['roles'] as $role) {
                $insertRole->execute([$role['code'], $role['name']]);
                foreach ($role['permissions'] as $permission) {
                    $grant->execute([$role['code'], $permission]);
                }
            }
            $pdo->exec("INSERT INTO v1_control(id,version,operator_id,state,next_dc,entry_version,next_item_code,cutover_evidence) VALUES(1,1,NULL,'PENDING',1,2,1,'Cumulative clean bootstrap: activation not authorized')");
            $pdo->prepare('INSERT INTO upms_production_migrations(id,reference,plan_hash,target_hash,state,step) VALUES(1,?,?,?,?,?)')
                ->execute(array_values($receipt));
            $pdo->commit();
        } catch (\Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $error;
        }
    }
}
