<?php

declare(strict_types=1);

namespace App\Upms;

use PDO;

final class LaborExtensionGuards
{
    public static function plan(string $runtime): array
    {
        if (!preg_match('/^money_rt_[0-9]+$/D', $runtime)) { throw new \RuntimeException('H1C_ISOLATED_RUNTIME_REQUIRED'); }
        $rules = [];
        $add = static function ($table, $event, $condition = 'TRUE') use (&$rules, $runtime): void {
            $rules['upmsh1c_'.$table.'_'.strtolower($event)] = ['table' => $table,'event' => $event,'body' => "BEGIN IF SUBSTRING_INDEX(USER(),'@',1)='$runtime' AND ($condition) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='UPMS_H1C_PROTECTED'; END IF; END"];
        };
        foreach (array_keys(LaborExtensionSchema::plan()['tables']) as $table) { foreach (['UPDATE','DELETE'] as $event) { $add($table, $event); } }
        $add('labor_extension_receipts', 'INSERT');
        $permission = static fn ($cap) => "NOT EXISTS(SELECT 1 FROM user_roles ur JOIN role_permissions rp ON rp.role_code=ur.role_code WHERE ur.user_id=NEW.actor_id AND rp.permission_code='$cap')";
        $add('labor_expense_allocations', 'INSERT', $permission('employee_labor.classify')." OR CHAR_LENGTH(TRIM(NEW.reason))<10 OR NEW.date>DATE(UTC_TIMESTAMP()+INTERVAL 5 HOUR) OR NEW.source_hash NOT REGEXP '^[a-f0-9]{64}$' OR NEW.batch_hash NOT REGEXP '^[a-f0-9]{64}$' OR NEW.movement_hash NOT REGEXP '^[a-f0-9]{64}$' OR NOT EXISTS(SELECT 1 FROM v1_documents d JOIN money_batches b ON b.id=NEW.source_batch_id JOIN money_movements m ON m.id=NEW.source_movement_id WHERE d.id=NEW.expense_id AND d.kind='EXPENSE' AND d.status='POSTED' AND d.date=NEW.source_date AND d.total=NEW.amount AND JSON_UNQUOTE(JSON_EXTRACT(d.payload,'$.expensePurpose'))='BUSINESS_EXPENSE' AND JSON_UNQUOTE(JSON_EXTRACT(d.payload,'$.expenseMasterVersion'))='p32b2' AND BINARY JSON_UNQUOTE(JSON_EXTRACT(d.payload,'$.employeeSnapshot.id'))=BINARY CAST(NEW.employee_id AS CHAR) AND JSON_CONTAINS(NEW.employee_snapshot,JSON_EXTRACT(d.payload,'$.employeeSnapshot')) AND JSON_CONTAINS(JSON_EXTRACT(d.payload,'$.employeeSnapshot'),NEW.employee_snapshot) AND b.source_type='DOCUMENT' AND BINARY b.source_ref=BINARY CONCAT('UPMS-DOC:',d.id) AND b.kind='SOURCE_DEBIT' AND b.amount=NEW.amount AND b.from_account_id IS NOT NULL AND b.to_account_id IS NULL AND m.batch_id=b.id AND m.account_id=b.from_account_id AND m.delta=-NEW.amount) OR EXISTS(SELECT 1 FROM v1_documents r WHERE r.kind='FINANCIAL_REFUND' AND r.status='POSTED' AND r.corrects_id=NEW.expense_id) OR EXISTS(SELECT 1 FROM money_batches r WHERE r.corrects_id=NEW.source_batch_id) OR NOT EXISTS(SELECT 1 FROM labor_openings o WHERE o.employee_id=NEW.employee_id AND o.date<=NEW.source_date AND o.date<=NEW.date)");
        $add('stock_initializations', 'INSERT', $permission('stock.initial_opening.confirm')." OR NEW.approved<>1 OR NEW.production_date>DATE(UTC_TIMESTAMP()+INTERVAL 5 HOUR) OR NEW.opening_hash NOT REGEXP '^[a-f0-9]{64}$' OR NEW.production_hash NOT REGEXP '^[a-f0-9]{64}$' OR NOT EXISTS(SELECT 1 FROM v1_documents o JOIN v1_lines ol ON ol.document_id=o.id JOIN v1_documents p ON p.id=NEW.production_document_id JOIN v1_lines pl ON pl.document_id=p.id AND pl.item_id=NEW.item_id WHERE o.id=NEW.opening_document_id AND o.kind='STOCK_OPENING' AND o.status='POSTED' AND o.date=NEW.opening_date AND ol.item_id=NEW.item_id AND CAST(ol.quantity AS DECIMAL(18,0))=0 AND p.kind='PRODUCTION' AND p.status='POSTED' AND p.date=NEW.production_date AND o.id>p.id) OR EXISTS(SELECT 1 FROM v1_stock_journal j WHERE j.item_id=NEW.item_id AND j.document_id NOT IN(NEW.opening_document_id,NEW.production_document_id)) OR NOT EXISTS(SELECT 1 FROM v1_audit a WHERE a.action='document.posted' AND BINARY a.reference=BINARY CAST(NEW.production_document_id AS CHAR) AND a.actor_id=NEW.actor_id)");
        $add('labor_extension_audit', 'INSERT', "NEW.payload_hash NOT REGEXP '^[a-f0-9]{64}$' OR NOT ((NEW.entry_type='EXPENSE_ALLOCATION' AND EXISTS(SELECT 1 FROM labor_expense_allocations e WHERE e.id=NEW.entry_id AND e.actor_id=NEW.actor_id AND e.created_at=NEW.created_at)) OR (NEW.entry_type='STOCK_INITIALIZATION' AND EXISTS(SELECT 1 FROM stock_initializations e WHERE e.id=NEW.entry_id AND e.actor_id=NEW.actor_id AND e.created_at=NEW.created_at)))");
        foreach (['INSERT','UPDATE'] as $event) {
            $add('v1_documents', $event, "NEW.kind='FINANCIAL_REFUND' AND NEW.status IN ('DRAFT','POSTED') AND EXISTS(SELECT 1 FROM labor_expense_allocations x WHERE x.expense_id=COALESCE(NEW.corrects_id,CAST(JSON_UNQUOTE(JSON_EXTRACT(NEW.payload,'$.originalId')) AS UNSIGNED)))");
        }
        $add('money_batches', 'INSERT', 'NEW.corrects_id IS NOT NULL AND EXISTS(SELECT 1 FROM labor_expense_allocations x WHERE x.source_batch_id=NEW.corrects_id)');
        ksort($rules);return $rules;
    }
    public static function hash(string $runtime): string { return hash('sha256', json_encode(self::plan($runtime), JSON_THROW_ON_ERROR)); }
    public static function verify(PDO $pdo, string $runtime, ?string $definer = null): array
    {
        return [...MoneyGuards::verify($pdo, $runtime, $definer, [...ExpenseGuards::plan($runtime),...EmployeeHaftaGuards::plan($runtime),...self::plan($runtime)]),'expenseHash' => ExpenseGuards::hash($runtime),'laborHash' => EmployeeHaftaGuards::hash($runtime),'extensionHash' => self::hash($runtime),'extensionGuards' => count(self::plan($runtime))];
    }
}
