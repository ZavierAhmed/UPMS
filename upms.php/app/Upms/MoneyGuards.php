<?php

declare(strict_types=1);

namespace App\Upms;

use PDO;

/** Additive guards only. The original 45 definitions and hashes are unchanged. */
final class MoneyGuards
{
    public static function plan(string $runtime): array
    {
        if (!preg_match('/^[a-z0-9_]+$/D', $runtime)) {
            throw new \RuntimeException('MONEY_RUNTIME_REJECTED');
        }
        $rules = [];
        $add = static function (string $table, string $event, string $condition = 'TRUE') use (&$rules, $runtime): void {
            $rules['upms32_'.$table.'_'.strtolower($event)] = ['table' => $table,'event' => $event,'body' => "BEGIN IF SUBSTRING_INDEX(USER(),'@',1)='$runtime' AND ($condition) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='UPMS_MONEY_PROTECTED'; END IF; END"];
        };
        foreach (['money_accounts','money_schema_receipts'] as $t) {
            foreach (['INSERT','UPDATE','DELETE'] as $e) {
                $add($t, $e);
            }
        }
        foreach (['money_batches','money_movements','money_audit'] as $t) {
            foreach (['UPDATE','DELETE'] as $e) {
                $add($t, $e);
            }
        }
        $add('money_batches', 'INSERT', "CHAR_LENGTH(TRIM(NEW.reason))<3 OR CHAR_LENGTH(TRIM(NEW.source_ref))<1 OR NEW.date>DATE(UTC_TIMESTAMP()+INTERVAL 5 HOUR) OR (NEW.kind<>'OPENING' AND EXISTS(SELECT 1 FROM money_accounts a WHERE a.type='CHEQUE_CUSTODY' AND a.id IN(NEW.from_account_id,NEW.to_account_id))) OR (NEW.kind='REVERSAL' AND NOT EXISTS(SELECT 1 FROM money_batches b WHERE b.id=NEW.corrects_id AND b.kind IN('TRANSFER','SOURCE_CREDIT','SOURCE_DEBIT') AND b.amount=NEW.amount AND (b.from_account_id <=> NEW.to_account_id) AND (b.to_account_id <=> NEW.from_account_id) AND NEW.date>=b.date))");
        $add('money_movements', 'INSERT', "NOT EXISTS(SELECT 1 FROM money_batches b WHERE b.id=NEW.batch_id AND ((NEW.account_id=b.from_account_id AND NEW.delta=-b.amount) OR (NEW.account_id=b.to_account_id AND NEW.delta=b.amount)))");
        $add('money_audit', 'INSERT', "NOT EXISTS(SELECT 1 FROM money_batches b WHERE b.id=NEW.batch_id AND b.actor_id=NEW.actor_id AND BINARY b.reason=BINARY NEW.reason AND b.created_at=NEW.created_at)");
        ksort($rules);
        return $rules;
    }
    public static function hash(string $runtime): string
    {
        return hash('sha256', json_encode(self::plan($runtime), JSON_THROW_ON_ERROR));
    }
    public static function verify(PDO $pdo, string $runtime, ?string $definer = null): array
    {
        $all = [...CrudGuards::plan($runtime),...self::plan($runtime)];
        $rows = $pdo->query('SELECT TRIGGER_NAME,EVENT_MANIPULATION,EVENT_OBJECT_TABLE,ACTION_TIMING,ACTION_STATEMENT,DEFINER FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=DATABASE()')->fetchAll(PDO::FETCH_ASSOC);
        if (count($rows) !== count($all)) {
            throw new \RuntimeException('MONEY_GUARD_SET_REJECTED');
        }
        foreach ($rows as $r) {
            $e = $all[$r['TRIGGER_NAME']] ?? null;
            if (!$e || $e['table'] !== $r['EVENT_OBJECT_TABLE'] || $e['event'] !== $r['EVENT_MANIPULATION'] || $e['body'] !== $r['ACTION_STATEMENT'] || $r['ACTION_TIMING'] !== 'BEFORE' || ($definer !== null && $r['DEFINER'] !== $definer)) {
                throw new \RuntimeException('MONEY_GUARD_DEFINITION_REJECTED');
            }
        }
        $privilegesVerified = false;
        if ($runtime === 'upms_runtime84') {
            if ($definer !== CrudGuards::DEFINER || $pdo->query('SELECT CURRENT_USER()')->fetchColumn() !== CrudGuards::DEFINER) {
                throw new \RuntimeException('MONEY_DEFINER_IDENTITY_REJECTED');
            }
            $actual = [];
            $grantee = "'upms_guard85'@'localhost'";
            foreach (['USER','SCHEMA','TABLE','COLUMN'] as $scope) {
                $q = $pdo->prepare('SELECT * FROM information_schema.'.$scope.'_PRIVILEGES WHERE GRANTEE=?');
                $q->execute([$grantee]);
                foreach ($q->fetchAll(PDO::FETCH_ASSOC) as $r) {
                    if ($scope === 'USER' && $r['PRIVILEGE_TYPE'] === 'USAGE' && $r['IS_GRANTABLE'] === 'NO') {
                        continue;
                    }$actual[] = $scope.'|'.($r['TABLE_SCHEMA'] ?? '').'|'.$r['PRIVILEGE_TYPE'].($r['IS_GRANTABLE'] === 'YES' ? '|GRANTABLE' : '');
                }
            }
            sort($actual);
            $expected = ['SCHEMA|upms\\_v1|SELECT','SCHEMA|upms\\_v1|TRIGGER'];
            sort($expected);
            if ($actual !== $expected) {
                throw new \RuntimeException('MONEY_DEFINER_PRIVILEGES_REJECTED');
            }
            foreach ($pdo->query('SHOW GRANTS')->fetchAll(PDO::FETCH_COLUMN) as $grant) {
                if (!preg_match('/^GRANT [A-Z_, ]+ ON (?:\*\.\*|`[^`]+`\.\*) TO /', $grant) || str_contains($grant, 'WITH GRANT OPTION')) {
                    throw new \RuntimeException('MONEY_DEFINER_ROLE_REJECTED');
                }
            }
            $privilegesVerified = true;
        }
        return ['passed' => true,'baseGuards' => 45,'additionalGuards' => 15,'totalGuards' => 60,'baseHash' => CrudGuards::hash(),'moneyHash' => self::hash($runtime),'definer' => $definer,'definerPrivilegesVerified' => $privilegesVerified];
    }
}
