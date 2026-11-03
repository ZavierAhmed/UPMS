<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Upms\ChallanNumbers;
use PHPUnit\Framework\TestCase;

final class ChallanDisplayTest extends TestCase
{
    public function test_custom_display_does_not_change_the_immutable_document(): void
    {
        $d = ['id' => '3', 'kind' => 'CHALLAN', 'status' => 'POSTED', 'official_number' => 'DC-0003', 'payload' => ['customChallanNumber' => ' ch-001 ', 'reference' => 'OTHER']];
        $before = $d;
        self::assertSame('CH-001', ChallanNumbers::display($d));
        self::assertSame($before, $d);
    }

    public function test_generated_and_draft_fallbacks_never_use_unrelated_references(): void
    {
        self::assertSame('DC-0003', ChallanNumbers::display(['kind' => 'CHALLAN', 'official_number' => 'DC-0003', 'payload' => ['reference' => 'SUPPLIER-1']]));
        self::assertSame('Draft 4', ChallanNumbers::display(['id' => '4', 'kind' => 'CHALLAN', 'status' => 'DRAFT', 'payload' => ['reference' => 'CASH-1']]));
        self::assertSame('VP-0004', ChallanNumbers::display(['kind' => 'VENDOR_PAYMENT', 'official_number' => 'VP-0004', 'payload' => ['customChallanNumber' => 'CH-001']]));
    }
}
