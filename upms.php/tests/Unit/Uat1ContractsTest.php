<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Upms\ApiError;
use App\Upms\ChallanNumbers;
use PHPUnit\Framework\TestCase;

final class Uat1ContractsTest extends TestCase
{
    public function test_custom_number_normalization_preserves_literal_digits_and_separators(): void
    {
        self::assertSame('UPI-2026-001', ChallanNumbers::normalize(' upi-2026-001 '));
        self::assertSame('UPI/2026/01', ChallanNumbers::normalize('upi/2026/01'));
        self::assertSame('', ChallanNumbers::normalize(' '));
        self::assertNotSame(ChallanNumbers::normalize('UPI-O01'), ChallanNumbers::normalize('UPI-001'));
    }

    public function test_confusable_unicode_whitespace_reserved_prefixes_and_oversize_are_rejected(): void
    {
        foreach (['UPІ-2026-001', 'UPI -001', 'UPI--001', 'DC-A0001', str_repeat('X', 41)] as $value) {
            try {
                ChallanNumbers::normalize($value);
                self::fail('Invalid custom number accepted');
            } catch (ApiError $e) {
                self::assertSame('CUSTOM_CHALLAN_NUMBER_INVALID', $e->apiCode);
            }
        }
    }

    public function test_custom_number_is_not_a_supplier_reference(): void
    {
        $this->expectException(ApiError::class);
        ChallanNumbers::prepare(['kind' => 'PURCHASE', 'customChallanNumber' => 'UPI-1']);
    }

    public function test_posted_duplicates_are_detected_without_inventing_custom_numbers_for_legacy_references(): void
    {
        $d = static fn ($id, $p, $status = 'POSTED') => ['id' => $id, 'kind' => 'CHALLAN', 'status' => $status, 'payload' => json_encode($p)];
        $rows = [$d('1', ['reference' => 'UPI-1']), $d('2', ['customChallanNumber' => 'UPI-1'])];
        self::assertTrue(ChallanNumbers::reconcile($rows)['matched']);
        $rows[] = $d('3', ['customChallanNumber' => 'UPI-1'], 'DRAFT');
        self::assertTrue(ChallanNumbers::reconcile($rows)['matched']);
        $rows[] = $d('4', ['customChallanNumber' => 'UPI-1']);
        self::assertFalse(ChallanNumbers::reconcile($rows)['matched']);
    }
}
