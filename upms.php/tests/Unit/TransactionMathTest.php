<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Upms\ApiError;
use App\Upms\Pricing;
use App\Upms\StockPosting;
use Brick\Math\BigInteger;
use PHPUnit\Framework\TestCase;

final class TransactionMathTest extends TestCase
{
    public function test_discount_matches_authoritative_express_vectors(): void
    {
        foreach (json_decode(file_get_contents(__DIR__.'/../php3-pricing-fixtures.json'), true, flags: JSON_THROW_ON_ERROR) as $fixture) {
            try {
                $actual = Pricing::discount(BigInteger::of($fixture['subtotal']), $fixture['mode'], $fixture['value'], $fixture['allowZero']);
                self::assertArrayHasKey('result', $fixture);
                self::assertSame($fixture['result'], $actual);
            } catch (ApiError $error) {
                self::assertArrayHasKey('error', $fixture);
                self::assertSame($fixture['error'], ['status' => $error->status, 'code' => $error->apiCode, 'message' => $error->publicMessage, 'fields' => $error->fieldErrors]);
            }
        }
    }

    public function test_stock_locks_sort_exact_numeric_ids_including_unsafe_integer_range(): void
    {
        self::assertSame(['1', '2', '10', '9007199254740992', '9007199254740993'], StockPosting::orderedIds(['9007199254740993', '10', '9007199254740992', '2', '1']));
    }
}
