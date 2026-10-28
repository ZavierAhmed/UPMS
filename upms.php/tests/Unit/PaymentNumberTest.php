<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Upms\ApiError;
use App\Upms\SimpleV1;
use PHPUnit\Framework\TestCase;

final class PaymentNumberTest extends TestCase
{
    public function test_shared_payment_ids_match_node_without_float_conversion(): void
    {
        foreach (json_decode(file_get_contents(__DIR__.'/../php5-number-fixtures.json'), true, flags: JSON_THROW_ON_ERROR) as $fixture) {
            try {
                $result = SimpleV1::paymentNumber($fixture['kind'], $fixture['id']);
                self::assertArrayHasKey('result', $fixture);
                self::assertSame($fixture['result'], $result);
            } catch (ApiError $error) {
                self::assertSame($fixture['error'], ['status' => $error->status, 'code' => $error->apiCode]);
            }
        }
    }
}
