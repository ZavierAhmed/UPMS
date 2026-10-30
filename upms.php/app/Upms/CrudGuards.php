<?php

declare(strict_types=1);

namespace App\Upms;

use PDO;

/** Additive BEFORE triggers; no table rebuild, no runtime DDL, no session-variable bypass. */
final class CrudGuards
{
    public const DEFINER = 'upms_guard85@localhost';
    public static function plan(string $runtime = 'upms_runtime84'): array
    {
        if (!preg_match('/^[a-z0-9_]+$/D', $runtime)) {
            throw new \RuntimeException('GUARD_RUNTIME_REJECTED');
        }
        $rules = [];
        $deny = "SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='UPMS_PROTECTED_MUTATION'";
        $add = static function ($table, $event, $condition = 'TRUE') use (&$rules, $runtime, $deny) {
            $name = 'upms85_'.$table.'_'.strtolower($event);
            $body = "BEGIN IF SUBSTRING_INDEX(USER(),'@',1) = '$runtime' AND ($condition) THEN $deny; END IF; END";
            $rules[$name] = ['table' => $table,'event' => $event,'body' => $body];
        };
        foreach (['identity_guard','roles','permissions','user_roles','role_permissions','upms_production_migrations'] as $t) {
            foreach (['INSERT','UPDATE','DELETE'] as $e) {
                $add($t, $e);
            }
        }
        foreach (['identity_audit_events','v1_lines','v1_stock_journal','v1_party_journal','v1_audit','v1_commands'] as $t) {
            foreach (['UPDATE','DELETE'] as $e) {
                $add($t, $e);
            }
        }
        foreach (['users','v1_control'] as $t) {
            foreach (['INSERT','DELETE'] as $e) {
                $add($t, $e);
            }
        }
        $same = static fn (array $cols) => implode(' AND ', array_map(fn ($col) => "(BINARY NEW.`$col` <=> BINARY OLD.`$col`)", $cols));
        $add('users', 'UPDATE', 'NOT ('.$same(['id','login_key','display_name','enabled','created_at']).') OR NEW.authorization_version <> OLD.authorization_version + 1');
        $add('v1_control', 'UPDATE', 'NOT ('.$same(['id','version','operator_id','state','entry_version','cutover_evidence']).') OR NEW.next_dc < OLD.next_dc OR NEW.next_dc > OLD.next_dc + 1 OR NEW.next_item_code < OLD.next_item_code');
        $add('v1_documents', 'INSERT', "NEW.status <> 'DRAFT'");
        $add('v1_documents', 'DELETE');
        $add('v1_documents', 'UPDATE', "OLD.status <> 'DRAFT' OR NOT (".$same(['id','actor_id','created_at']).") OR NEW.status NOT IN ('DRAFT','POSTED','CANCELLED')");
        foreach (['v1_items' => ['id','code'],'v1_parties' => ['id','kind'],'v1_stock' => ['item_id']] as $t => $cols) {
            $add($t, 'DELETE');
            $add($t, 'UPDATE', 'NOT ('.$same($cols).')');
        }
        ksort($rules);
        return $rules;
    }
    public static function hash(): string
    {
        return hash('sha256', json_encode(self::plan(), JSON_THROW_ON_ERROR));
    }
    public static function install(PDO $pdo, string $runtime = 'upms_runtime84'): array
    {
        $plan = self::plan($runtime);
        $existing = $pdo->query('SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()')->fetchAll(PDO::FETCH_COLUMN);
        if ($existing) {
            throw new \RuntimeException('EXISTING_TRIGGERS_REVIEW_REQUIRED');
        }
        foreach ($plan as $name => $r) {
            $pdo->exec('CREATE TRIGGER `'.$name.'` BEFORE '.$r['event'].' ON `'.$r['table'].'` FOR EACH ROW '.$r['body']);
        }
        return self::verify($pdo, $runtime);
    }
    public static function verify(PDO $pdo, string $runtime = 'upms_runtime84'): array
    {
        $rows = $pdo->query('SELECT TRIGGER_NAME,EVENT_MANIPULATION,EVENT_OBJECT_TABLE,ACTION_TIMING,ACTION_STATEMENT,DEFINER FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE() ORDER BY TRIGGER_NAME')->fetchAll(PDO::FETCH_ASSOC);
        $plan = self::plan($runtime);
        if (count($rows) !== count($plan)) {
            throw new \RuntimeException('GUARD_SET_REJECTED');
        }
        foreach ($rows as $r) {
            $e = $plan[$r['TRIGGER_NAME']] ?? null;
            if (!$e || $r['EVENT_MANIPULATION'] !== $e['event'] || $r['EVENT_OBJECT_TABLE'] !== $e['table'] || $r['ACTION_TIMING'] !== 'BEFORE' || $r['ACTION_STATEMENT'] !== $e['body'] || ($runtime === 'upms_runtime84' && $r['DEFINER'] !== self::DEFINER)) {
                throw new \RuntimeException('GUARD_DEFINITION_REJECTED');
            }
        }
        if ($runtime === 'upms_runtime84') {
            if ($pdo->query('SELECT CURRENT_USER()')->fetchColumn() !== self::DEFINER) {
                throw new \RuntimeException('GUARD_VERIFIER_IDENTITY_REJECTED');
            }
            $grantee = "'upms_guard85'@'localhost'";
            $expected = ['SCHEMA|upms\\_v1|SELECT', 'SCHEMA|upms\\_v1|TRIGGER'];
            $actual = [];
            foreach (['USER','SCHEMA','TABLE','COLUMN'] as $scope) {
                $q = $pdo->prepare('SELECT * FROM information_schema.'.$scope.'_PRIVILEGES WHERE GRANTEE=?');
                $q->execute([$grantee]);
                foreach ($q->fetchAll(PDO::FETCH_ASSOC) as $row) {
                    if ($scope === 'USER' && $row['PRIVILEGE_TYPE'] === 'USAGE' && $row['IS_GRANTABLE'] === 'NO') {
                        continue;
                    }
                    $actual[] = $scope.'|'.($row['TABLE_SCHEMA'] ?? '').'|'.$row['PRIVILEGE_TYPE'].($row['IS_GRANTABLE'] === 'YES' ? '|GRANTABLE' : '');
                }
            }
            sort($actual);
            sort($expected);
            if ($actual !== $expected) {
                throw new \RuntimeException('GUARD_DEFINER_PRIVILEGES_REJECTED');
            }
            foreach ($pdo->query('SHOW GRANTS')->fetchAll(PDO::FETCH_COLUMN) as $grant) {
                if (!preg_match('/^GRANT [A-Z_, ]+ ON (?:\*\.\*|`[^`]+`\.\*) TO /', $grant) || str_contains($grant, 'WITH GRANT OPTION')) {
                    throw new \RuntimeException('GUARD_ROLE_GRANT_REJECTED');
                }
            }
        }
        return ['passed' => true,'triggers' => count($rows),'guardHash' => self::hash(),'definerPrivilegesVerified' => $runtime === 'upms_runtime84'];
    }
}
