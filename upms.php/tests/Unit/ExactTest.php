<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Upms\ApiError;
use App\Upms\Exact;
use App\Upms\Passwords;
use App\Upms\Reconciliation;
use Brick\Math\BigInteger;
use PHPUnit\Framework\TestCase;

final class ExactTest extends TestCase
{
    public function test_node_argon2id_ascii_and_unicode_hashes_verify_without_rewriting(): void
    {
        foreach (json_decode(file_get_contents(__DIR__.'/../argon-fixtures.json'), true) as $f) {
            $original = $f['hash'];
            self::assertTrue(Passwords::verify($f['password'], $f['hash']));
            self::assertFalse(Passwords::verify('incorrect-password', $f['hash']));
            self::assertSame($original, $f['hash']);
        }
    }

    public function test_unsafe_cost_and_malformed_hashes_are_rejected(): void
    {
        self::assertFalse(Passwords::verify('test', '$argon2id$v=19$m=999999999,t=2,p=1$abc$def'));
        self::assertFalse(Passwords::verify('test', 'invalid'));
    }

    public function test_money_stays_exact_above_javascript_safe_integer(): void
    {
        self::assertSame('9007199254740.99', Exact::money(Exact::cents('9007199254740.99')));
        self::assertSame('-0.01', Exact::money(Exact::cents('-0.01', signed: true)));
        self::assertSame('99999999999999.99', Exact::money(BigInteger::of('9999999999999999')));
    }

    public function test_money_overflow_is_rejected(): void
    {
        $this->expectException(ApiError::class);
        Exact::money(BigInteger::of('10000000000000000'));
    }

    public function test_float_notation_is_rejected(): void
    {
        $this->expectException(ApiError::class);
        Exact::cents('1e3');
    }

    public function test_percentage_rounding_is_integer_half_up(): void
    {
        self::assertSame('61.31', Reconciliation::discount(Exact::cents('70.07'), 'PERCENT', '12.50')['total']);
    }

    public function test_partial_return_floors_telescope_to_original_net(): void
    {
        $lines = [['id' => '1', 'item_id' => '1', 'amount' => '0.03', 'quantity' => '3', 'rate' => '0.01', 'snapshot' => '{}']];
        $previous = [];
        $sum = BigInteger::zero();
        foreach (range(0, 2) as $n) {
            $computed = Reconciliation::returnCredits($lines, '0.02', $previous, [['originalLineId' => '1', 'itemId' => '1', 'quantity' => '1']]);
            $sum = $sum->plus(Exact::cents($computed[0]['credit'], zero: true));
            $previous['1'] = BigInteger::of($n + 1);
        }
        self::assertSame('0.02', Exact::money($sum));
    }
}
