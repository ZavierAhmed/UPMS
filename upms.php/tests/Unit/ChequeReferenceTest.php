<?php
declare(strict_types=1);
namespace Tests\Unit;

use App\Upms\Cheques;
use PHPUnit\Framework\TestCase;

final class ChequeReferenceTest extends TestCase
{
    public function test_readable_reference_normalizes_client_punctuation_and_exact_amount(): void
    {
        self::assertSame('21222312312222-CLIENT-A-50000-00',Cheques::referenceBase('21222312312222','  Client / A  ','00050000.0'));
    }
    public function test_reference_reserves_room_for_128_bit_suffix_at_maximum_lengths(): void
    {
        $base=Cheques::referenceBase(str_repeat('9',30),str_repeat('LONG CLIENT NAME ',8),'9999999999999.99');
        self::assertLessThanOrEqual(100,strlen($base)+33);
        self::assertStringEndsWith('-9999999999999-99',$base);
        self::assertMatchesRegularExpression('/^[A-Z0-9][A-Z0-9_-]+$/D',$base);
    }
    public function test_non_ascii_only_client_has_stable_ascii_fallback(): void
    {
        self::assertSame('12-CLIENT-10-05',Cheques::referenceBase('12','علی','10.05'));
    }
}
