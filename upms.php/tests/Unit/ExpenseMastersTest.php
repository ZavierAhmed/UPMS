<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Upms\{BusinessCommand,CrudGuards,ExpenseGuards,ExpenseMasters,ExpenseRecovery,ExpenseReports,ExpenseSchema,MoneyGuards,MoneyRecovery,V1Input,ApiError};
use PHPUnit\Framework\TestCase;

final class ExpenseMastersTest extends TestCase
{
    private function fixture(): array
    {
        $c = ['id' => '71','name' => 'Original category','name_key' => ExpenseMasters::key('Original category'),'employee_based' => 1,'active' => 1,'version' => 1,'actor_id' => '1','created_at' => '2026-10-30 05:00:00.000000','updated_at' => '2026-10-30 05:00:00.000000'];
        $e = ['id' => '92','name' => 'Original employee','name_key' => ExpenseMasters::key('Original employee'),'designation' => '','phone' => '','notes' => '','active' => 1,'version' => 1,'actor_id' => '1','created_at' => $c['created_at'],'updated_at' => $c['updated_at']];
        $audit = [];
        foreach (['CATEGORY' => $c,'EMPLOYEE' => $e] as $entity => $row) {
            $audit[] = ['entity' => $entity,'entity_id' => $row['id'],'version' => 1,'actor_id' => '1','action' => 'CREATE','snapshot' => BusinessCommand::json(ExpenseMasters::snapshot($row, $entity)),'created_at' => $row['updated_at']];
        }
        $p = ['kind' => 'EXPENSE','categoryId' => '71','employeeId' => '92','category' => 'Original category','categorySnapshot' => ExpenseMasters::display($c, 'CATEGORY'),'employeeSnapshot' => ExpenseMasters::display($e, 'EMPLOYEE'),'expenseMasterVersion' => 'p32b2','expensePurpose' => 'BUSINESS_EXPENSE','businessExpenseConfirmed' => true];
        return [[$c],[$e],$audit,[['id' => '7','kind' => 'EXPENSE','status' => 'POSTED','payload' => json_encode($p)]]];
    }
    public function test_stable_identity_history_and_posted_snapshots_reconcile(): void
    {
        [$c,$e,$a,$d] = $this->fixture();
        self::assertTrue(ExpenseMasters::reconcile($c, $e, $a)['matched']);
        self::assertTrue(ExpenseMasters::documents($d, $a)['matched']);
        $e[0]['name'] = 'Renamed employee';
        $e[0]['name_key'] = ExpenseMasters::key($e[0]['name']);
        $e[0]['version'] = 2;
        $e[0]['active'] = 0;
        $a[] = ['entity' => 'EMPLOYEE','entity_id' => '92','version' => 2,'actor_id' => '1','action' => 'UPDATE','snapshot' => BusinessCommand::json(ExpenseMasters::snapshot($e[0], 'EMPLOYEE')),'created_at' => $e[0]['updated_at']];
        self::assertTrue(ExpenseMasters::reconcile($c, $e, $a)['matched']);
        self::assertTrue(ExpenseMasters::documents($d, $a)['matched']);
        self::assertSame('Original employee', json_decode($d[0]['payload'], true)['employeeSnapshot']['name']);
    }
    public function test_missing_history_version_gaps_or_changed_current_names_fail(): void
    {
        foreach (['missing','gap','changed','orphan'] as $case) {
            [$c,$e,$a] = $this->fixture();
            if ($case === 'missing') {
                array_pop($a);
            } elseif ($case === 'gap') {
                $a[1]['version'] = 2;
            } elseif ($case === 'changed') {
                $e[0]['name'] = 'Corrupt';
            } else {
                $e = [];
            }self::assertFalse(ExpenseMasters::reconcile($c, $e, $a)['matched'], $case);
        }
    }
    public function test_forged_employee_or_category_snapshot_never_reconciles(): void
    {
        foreach (['categoryId','employeeId','category','businessExpenseConfirmed'] as $field) {
            [$c,$e,$a,$d] = $this->fixture();
            $p = json_decode($d[0]['payload'], true);
            $p[$field] = $field === 'businessExpenseConfirmed' ? false : 'Fake';
            $d[0]['payload'] = json_encode($p);
            self::assertFalse(ExpenseMasters::documents($d, $a)['matched'], $field);
        }
    }
    public function test_legacy_free_text_is_not_automatically_mapped(): void
    {
        [$c,$e,$a] = $this->fixture();
        $d = [['id' => '8','kind' => 'EXPENSE','status' => 'POSTED','payload' => json_encode(['category' => 'Original category'])]];
        $r = ExpenseMasters::documents($d, $a);
        self::assertTrue($r['matched']);
        self::assertSame(1, $r['legacyUnmappedExpenses']);
        self::assertSame(0, $r['mappedExpenses']);
    }
    public function test_name_keys_are_case_insensitive_and_ignore_unintended_whitespace(): void
    {
        self::assertSame(ExpenseMasters::key(' Staff   Welfare '), ExpenseMasters::key('staff welfare'));
        self::assertSame('Staff Welfare', ExpenseMasters::name(' Staff   Welfare '));
        self::assertNotSame(ExpenseMasters::key('Staff Welfare'), ExpenseMasters::key('Transport'));
    }
    public function test_category_employee_date_totals_use_exact_same_records(): void
    {
        $records = [['documentId' => '1','date' => '2026-10-30','categoryId' => '71','categoryName' => 'Original','employeeId' => '92','employeeName' => 'Employee','amount' => '0.10'],['documentId' => '2','date' => '2026-10-31','categoryId' => '71','categoryName' => 'Renamed','employeeId' => '92','employeeName' => 'Employee','amount' => '0.20'],['documentId' => '3','date' => '2026-10-31','categoryId' => null,'categoryName' => 'Legacy / unmapped','employeeId' => null,'employeeName' => null,'amount' => '0.01']];
        $r = ExpenseReports::summarize($records);
        self::assertSame('0.31', $r['overall']);
        self::assertSame(3, $r['count']);
        self::assertSame('0.30', $r['categoryGroups'][0]['total']);
        self::assertSame(['Original','Renamed'], $r['categoryGroups'][0]['names']);
        self::assertSame('0.30', $r['employeeGroups'][0]['total']);
        self::assertSame('0.21', $r['dateGroups'][1]['total']);
        self::assertSame('0.00', ExpenseReports::summarize([])['overall']);
    }
    public function test_extensions_are_separately_versioned_and_base_guards_unchanged(): void
    {
        self::assertCount(4, ExpenseSchema::plan()['tables']);
        self::assertCount(12, ExpenseGuards::plan('upms_runtime84'));
        self::assertCount(15, MoneyGuards::plan('upms_runtime84'));
        self::assertCount(45, CrudGuards::plan('upms_runtime84'));
        self::assertCount(29, ExpenseRecovery::tables());
        self::assertCount(25, MoneyRecovery::tables());
        self::assertNotSame(ExpenseRecovery::FORMAT, MoneyRecovery::FORMAT);
        self::assertSame('7047bb1d5bce5b1208330594cb88478248a9f0cd10ceab09bd0ab34d4cdbce13', CrudGuards::hash());
        self::assertSame('507af072fa4f22e2a94311b6944ec876e8022c857578768b0ed2dc067e7cd3b1', MoneyGuards::hash('upms_runtime84'));
    }
    public function test_employee_advances_and_loans_are_not_accepted_expense_purposes(): void
    {
        $input = (object)['kind' => 'EXPENSE','date' => '2026-10-30','categoryId' => '71','employeeId' => '92','businessExpenseConfirmed' => true,'expensePurpose' => 'BUSINESS_EXPENSE'];
        self::assertSame('71', V1Input::document($input, false, true)['categoryId']);
        $input->expensePurpose = 'EMPLOYEE_ADVANCE';
        $this->expectException(ApiError::class);
        V1Input::document($input, false, true);
    }
    public function test_historical_snapshot_types_and_master_receipts_are_strict(): void
    {
        [$c,$e,$a] = $this->fixture();
        $snapshot = ExpenseMasters::snapshot($c[0], 'CATEGORY');
        self::assertTrue(ExpenseMasters::validSnapshot($snapshot, 'CATEGORY'));
        $bad = $snapshot;
        $bad['employeeBased'] = 1;
        self::assertFalse(ExpenseMasters::validSnapshot($bad, 'CATEGORY'));
        $bad = $snapshot;
        $bad['extra'] = 'invented';
        self::assertFalse(ExpenseMasters::validSnapshot($bad, 'CATEGORY'));
        $receipt = ['id' => '71','expenseMaster' => 'CATEGORY','version' => 1,'record' => $snapshot];
        $command = ['key' => 'e082d3e0-5998-4ea4-9b72-7dc5cf770d07','actor_id' => '1','fingerprint' => str_repeat('a', 64),'result' => json_encode($receipt)];
        $inspect = fn ($cmd) => \App\Upms\Integrity::inspect([], [$cmd], [['id' => '1']], [], [], [], [], $a)['findings'];
        self::assertSame([], $inspect($command));
        $receipt['record']['name'] = 'Forged';
        $command['result'] = json_encode($receipt);
        self::assertContains('COMMAND_EXPENSE_MASTER_INVALID', array_column($inspect($command), 'code'));
    }
    public function test_authenticated_expense_snapshot_cipher_rejects_tampering(): void
    {
        $key = sodium_crypto_box_keypair();
        $snapshot = ['format' => ExpenseRecovery::FORMAT,'tables' => []];
        $cipher = ExpenseRecovery::encrypt($snapshot, sodium_crypto_box_publickey($key));
        self::assertSame($snapshot, ExpenseRecovery::decrypt($cipher, $key));
        $cipher[20] = chr(ord($cipher[20]) ^ 1);
        $this->expectException(\RuntimeException::class);
        ExpenseRecovery::decrypt($cipher, $key);
    }
}
