<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Upms\ApiError;
use App\Upms\ChallanReturns;
use Brick\Math\BigInteger;
use PHPUnit\Framework\TestCase;

final class ChallanReturnsTest extends TestCase
{
    public function test_exact_credits_match_node_for_every_small_partition_and_large_amounts(): void
    {
        $fixtures = json_decode(file_get_contents(__DIR__.'/../php4-return-fixtures.json'), true, flags: JSON_THROW_ON_ERROR);
        self::assertSame(96, $fixtures['partitions']);
        foreach ($fixtures['vectors'] as $fixture) {
            try {
                $previous = array_map(fn ($value) => BigInteger::of($value), $fixture['previous']);
                $result = ChallanReturns::credits($fixtures['sources'][$fixture['sourceIndex']], $fixture['net'], $previous, $fixture['requested']);
                self::assertArrayHasKey('result', $fixture);
                self::assertSame($fixture['result'], json_decode(json_encode($result, JSON_THROW_ON_ERROR), true));
            } catch (ApiError $error) {
                self::assertArrayHasKey('error', $fixture);
                self::assertSame($fixture['error'], ['status' => $error->status, 'code' => $error->apiCode, 'message' => $error->publicMessage, 'fields' => $error->fieldErrors]);
            }
        }
    }

    public function test_return_numbers_match_node_uint64_bounds(): void
    {
        $fixtures = json_decode(file_get_contents(__DIR__.'/../php4-return-fixtures.json'), true, flags: JSON_THROW_ON_ERROR);
        foreach ($fixtures['numbers'] as $fixture) {
            try {
                $number = ChallanReturns::number($fixture['id']);
                self::assertArrayHasKey('result', $fixture);
                self::assertSame($fixture['result'], $number);
            } catch (ApiError $error) {
                self::assertSame($fixture['error'], ['status' => $error->status, 'code' => $error->apiCode]);
            }
        }
    }
}
