<?php

declare(strict_types=1);

namespace App\Upms;

use PDO;

final class ExpenseGuards
{
    public static function plan(string $runtime): array
    {
        if (!preg_match('/^[a-z0-9_]+$/D', $runtime)) {
            throw new \RuntimeException('EXPENSE_RUNTIME_REJECTED');
        }
        $rules = [];
        $add = static function ($table, $event, $condition = 'TRUE') use (&$rules, $runtime) {
            $rules['upms32b2_'.$table.'_'.strtolower($event)] = ['table' => $table,'event' => $event,'body' => "BEGIN IF SUBSTRING_INDEX(USER(),'@',1)='$runtime' AND ($condition) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='UPMS_EXPENSE_PROTECTED'; END IF; END"];
        };
        foreach (['expense_categories','employees'] as $table) {
            $add($table, 'DELETE');
            $add($table, 'INSERT', "NEW.version<>1 OR CHAR_LENGTH(TRIM(NEW.name))<1 OR NEW.created_at<>NEW.updated_at OR NEW.name_key NOT REGEXP '^[a-f0-9]{64}$'");
            $add($table, 'UPDATE', "NEW.id<>OLD.id OR NEW.created_at<>OLD.created_at OR NEW.version<>OLD.version+1 OR NEW.updated_at<OLD.updated_at OR CHAR_LENGTH(TRIM(NEW.name))<1 OR NEW.name_key NOT REGEXP '^[a-f0-9]{64}$'");
        }
        foreach (['UPDATE','DELETE'] as $event) {
            $add('expense_master_audit', $event);
        }
        $match = "m.id=NEW.entity_id AND m.version=NEW.version AND m.actor_id=NEW.actor_id AND m.updated_at=NEW.created_at AND BINARY m.name=BINARY JSON_UNQUOTE(JSON_EXTRACT(NEW.snapshot,'$.name')) AND JSON_UNQUOTE(JSON_EXTRACT(NEW.snapshot,'$.id'))=CAST(m.id AS CHAR)";
        $add('expense_master_audit', 'INSERT', "(NEW.action='CREATE' AND NEW.version<>1) OR (NEW.action='UPDATE' AND NEW.version<2) OR NOT ((NEW.entity='CATEGORY' AND EXISTS(SELECT 1 FROM expense_categories m WHERE $match)) OR (NEW.entity='EMPLOYEE' AND EXISTS(SELECT 1 FROM employees m WHERE $match)))");
        foreach (['INSERT','UPDATE','DELETE'] as $event) {
            $add('expense_schema_receipts', $event);
        }
        ksort($rules);
        return $rules;
    }
    public static function hash(string $runtime): string
    {
        return hash('sha256', json_encode(self::plan($runtime), JSON_THROW_ON_ERROR));
    }
    public static function verify(PDO $pdo, string $runtime, ?string $definer = null): array
    {
        return [...MoneyGuards::verify($pdo, $runtime, $definer, self::plan($runtime)),'expenseGuards' => 12,'expenseHash' => self::hash($runtime)];
    }
}
