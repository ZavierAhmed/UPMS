<?php

declare(strict_types=1);

namespace App\Upms;

use PDO;

final class EmployeeHaftaGuards
{
    public static function plan(string $runtime): array
    {
        if (!preg_match('/^money_rt_[0-9]+$/D', $runtime)) {
            throw new \RuntimeException('LABOR_ISOLATED_RUNTIME_REQUIRED');
        }
        $rules = [];
        $add = static function ($table, $event, $condition = 'TRUE') use (&$rules, $runtime): void {
            $rules['upmsh1_'.$table.'_'.strtolower($event)] = ['table' => $table,'event' => $event,'body' => "BEGIN IF SUBSTRING_INDEX(USER(),'@',1)='$runtime' AND ($condition) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='UPMS_LABOR_PROTECTED'; END IF; END"];
        };
        foreach (['labor_schema_receipts','labor_openings','labor_earnings','labor_payments','labor_audit'] as $table) {
            foreach (['UPDATE','DELETE'] as $event) {
                $add($table, $event);
            }
        }
        $add('labor_schema_receipts', 'INSERT');
        $employee = "NOT EXISTS(SELECT 1 FROM employees e WHERE e.id=NEW.employee_id AND e.active=1 AND BINARY CAST(e.id AS CHAR)=BINARY JSON_UNQUOTE(JSON_EXTRACT(NEW.employee_snapshot,'$.id')) AND e.version=JSON_EXTRACT(NEW.employee_snapshot,'$.version') AND BINARY e.name=BINARY JSON_UNQUOTE(JSON_EXTRACT(NEW.employee_snapshot,'$.name')))";
        $add('labor_openings', 'INSERT', "$employee OR CHAR_LENGTH(TRIM(NEW.reason))<3 OR CHAR_LENGTH(TRIM(NEW.reference))<1 OR NEW.date>DATE(UTC_TIMESTAMP()+INTERVAL 5 HOUR) OR EXISTS(SELECT 1 FROM labor_earnings x WHERE x.employee_id=NEW.employee_id AND x.date<NEW.date)");
        $add('labor_earnings', 'INSERT', "$employee OR NOT EXISTS(SELECT 1 FROM v1_lines l JOIN v1_documents d ON d.id=l.document_id JOIN v1_audit a ON BINARY a.reference=BINARY CAST(d.id AS CHAR) WHERE l.id=NEW.line_id AND d.id=NEW.document_id AND d.kind='PRODUCTION' AND d.status='POSTED' AND d.date=NEW.date AND a.action='document.posted' AND a.actor_id=NEW.actor_id AND a.created_at=NEW.created_at AND l.item_id=NEW.item_id AND BINARY l.snapshot=BINARY NEW.item_snapshot AND BINARY l.quantity=BINARY NEW.quantity AND JSON_UNQUOTE(JSON_EXTRACT(d.payload,'$.laborVersion'))='uath1-v1' AND BINARY JSON_UNQUOTE(JSON_EXTRACT(d.payload,'$.productionEmployeeId'))=BINARY CAST(NEW.employee_id AS CHAR) AND CAST(JSON_UNQUOTE(JSON_EXTRACT(d.payload,CONCAT('$.lines[',l.line_no-1,'].laborRate'))) AS DECIMAL(18,2))=NEW.labor_rate)");
        $add('labor_payments', 'INSERT', "$employee OR CHAR_LENGTH(TRIM(NEW.reason))<3 OR CHAR_LENGTH(TRIM(NEW.reference))<1 OR NEW.reference_key<>SHA2(LOWER(TRIM(NEW.reference)),256) OR NOT EXISTS(SELECT 1 FROM money_batches b JOIN money_accounts a ON a.id=b.from_account_id WHERE b.id=NEW.money_batch_id AND b.from_account_id=NEW.money_account_id AND b.amount=NEW.amount AND b.date=NEW.date AND b.actor_id=NEW.actor_id AND b.kind='SOURCE_DEBIT' AND b.source_type='EXTERNAL' AND BINARY b.source_ref=BINARY CONCAT('UPMS-LABOR:',NEW.id) AND ((NEW.method='CASH' AND a.type='CASH_HOLDER') OR (NEW.method='BANK_TRANSFER' AND a.type='BANK'))) OR NOT EXISTS(SELECT 1 FROM labor_openings o WHERE o.employee_id=NEW.employee_id AND o.date<=NEW.date)");
        $add('labor_audit', 'INSERT', "NEW.payload_hash NOT REGEXP '^[a-f0-9]{64}$' OR NOT ((NEW.entry_type='OPENING' AND EXISTS(SELECT 1 FROM labor_openings e WHERE BINARY CAST(e.id AS CHAR)=BINARY NEW.entry_id AND e.employee_id=NEW.employee_id AND e.actor_id=NEW.actor_id AND e.created_at=NEW.created_at)) OR (NEW.entry_type='EARNING' AND EXISTS(SELECT 1 FROM labor_earnings e WHERE BINARY CAST(e.id AS CHAR)=BINARY NEW.entry_id AND e.employee_id=NEW.employee_id AND e.actor_id=NEW.actor_id AND e.created_at=NEW.created_at)) OR (NEW.entry_type='PAYMENT' AND EXISTS(SELECT 1 FROM labor_payments e WHERE e.id=NEW.entry_id AND e.employee_id=NEW.employee_id AND e.actor_id=NEW.actor_id AND e.created_at=NEW.created_at)))");
        $add('money_batches', 'INSERT', "LOWER(NEW.source_ref) LIKE 'upms-labor:%' AND (NEW.source_ref NOT REGEXP '^UPMS-LABOR:[a-f0-9-]{36}$' OR NEW.source_type<>'EXTERNAL' OR NEW.kind<>'SOURCE_DEBIT' OR NEW.to_account_id IS NOT NULL OR NEW.corrects_id IS NOT NULL)");
        ksort($rules);
        return $rules;
    }
    public static function hash(string $runtime): string
    {
        return hash('sha256', json_encode(self::plan($runtime), JSON_THROW_ON_ERROR));
    }
    public static function verify(PDO $pdo, string $runtime, ?string $definer = null): array
    {
        return [...MoneyGuards::verify($pdo, $runtime, $definer, [...ExpenseGuards::plan($runtime),...self::plan($runtime)]),'expenseHash' => ExpenseGuards::hash($runtime),'laborHash' => hash('sha256', json_encode(self::plan($runtime), JSON_THROW_ON_ERROR)),'laborGuards' => count(self::plan($runtime))];
    }
}
