<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Upms\{ApiError,EmployeeHafta,EmployeeHaftaGuards,EmployeeHaftaReconciliation,EmployeeHaftaRecovery,EmployeeHaftaSchema,ExpenseRecovery};
use PHPUnit\Framework\TestCase;

final class EmployeeHaftaTest extends TestCase
{
    public function test_labor_receipt_is_bound_to_immutable_row_hash_and_actor(): void
    {
        $row = ['id' => '1','actor_id' => '2','amount' => '0.00','date' => '2026-11-03'];
        $receipt = (object)EmployeeHafta::receipt($row, 'OPENING');
        $data = ['labor_openings' => [$row]];
        self::assertTrue(EmployeeHafta::validReceipt($receipt, '2', $data));
        self::assertFalse(EmployeeHafta::validReceipt($receipt, '3', $data));
        $receipt->entryHash = str_repeat('0', 64);
        self::assertFalse(EmployeeHafta::validReceipt($receipt, '2', $data));
    }
    public function test_labor_input_is_explicit_and_remains_default_off(): void
    {
        $input = (object)['kind' => 'PRODUCTION','date' => '2026-11-03','productionEmployeeId' => '1','lines' => [(object)['itemId' => '1','quantity' => '10','laborRate' => '10.00']]];
        $r = \App\Upms\V1Input::document($input, true, true, true);
        self::assertSame('1', $r['productionEmployeeId']);
        self::assertSame('10.00', $r['lines'][0]['laborRate']);
        $this->expectException(ApiError::class);
        \App\Upms\V1Input::document($input);
    }
    public function test_exact_independent_per_line_rates_and_no_product_price_inference(): void
    {
        $r = EmployeeHafta::rates([['quantity' => '10','laborRate' => '10']]);
        self::assertSame('100.00', $r['total']);
        self::assertSame('10.00', $r['lines'][0]['laborRate']);
        self::assertSame('7.95', EmployeeHafta::rates([['quantity' => '3','laborRate' => '1.25'],['quantity' => '2','laborRate' => '2.10']])['total']);
    }
    public function test_missing_negative_zero_confirmation_and_fractional_precision_rejected(): void
    {
        foreach ([['quantity' => '1','rate' => '999.99'],['quantity' => '1','laborRate' => '-1'],['quantity' => '1','laborRate' => '0'],['quantity' => '1','laborRate' => '0.001'],['quantity' => '0','laborRate' => '10']] as $line) {
            try {
                EmployeeHafta::rates([$line]);
                self::fail('Invalid labor accepted');
            } catch (ApiError) {
                self::assertTrue(true);
            }
        }
        self::assertSame('0.00', EmployeeHafta::rates([['quantity' => '1','laborRate' => '0','laborZeroConfirmed' => true]])['total']);
    }
    public function test_new_schema_and_consumer_are_explicit_additions(): void
    {
        self::assertCount(29, ExpenseRecovery::tables());
        self::assertCount(34, EmployeeHaftaRecovery::tables());
        self::assertCount(16, EmployeeHaftaGuards::plan('money_rt_123'));
        self::assertStringContainsString('UNIQUE KEY `labor_one_line`', EmployeeHaftaSchema::plan()['tables']['labor_earnings']);
        self::assertStringContainsString('UNIQUE KEY `labor_one_money_batch`', EmployeeHaftaSchema::plan()['tables']['labor_payments']);
    }
    public function test_unallocated_history_is_not_invented_as_wages_and_orphan_money_is_rejected(): void
    {
        $d = array_fill_keys(['v1_documents','v1_lines','v1_audit','expense_master_audit','money_batches','money_accounts','labor_openings','labor_earnings','labor_payments','labor_audit'], []);
        $d['v1_documents'][] = ['id' => '1','kind' => 'PRODUCTION','status' => 'POSTED','payload' => '{"lines":[{"quantity":"100"}]}'];
        self::assertTrue(EmployeeHaftaReconciliation::run($d)['matched']);
        $d['money_batches'][] = ['id' => '1','source_ref' => 'UPMS-LABOR:forged','corrects_id' => null];
        self::assertFalse(EmployeeHaftaReconciliation::run($d)['matched']);
    }
    public function test_permission_is_separate_for_view_record_and_payment(): void
    {
        EmployeeHafta::permit(['permissions' => ['employee_labor.view']], 'employee_labor.view');
        $this->expectException(ApiError::class);
        EmployeeHafta::permit(['permissions' => ['employee_labor.view']], 'employee_labor.pay');
    }
}
