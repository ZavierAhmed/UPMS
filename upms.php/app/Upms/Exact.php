<?php

declare(strict_types=1);

namespace App\Upms;

use Brick\Math\BigInteger;

final class Exact
{
    public static function integer(string $value, bool $signed = false, bool $zero = false): BigInteger
    {
        if (!preg_match($signed ? '/^-?\d{1,15}$/D' : '/^\d{1,15}$/D', $value)) {
            throw new ApiError(400, 'INVALID_BOTTLE_QUANTITY');
        }
        $n = BigInteger::of($value);
        if (!$signed && ($zero ? $n->isNegative() : $n->compareTo(0) <= 0)) {
            throw new ApiError(400, 'INVALID_BOTTLE_QUANTITY');
        }
        return $n;
    }

    public static function cents(string $value, bool $signed = false, bool $zero = false): BigInteger
    {
        if (!preg_match($signed ? '/^-?\d{1,13}(?:\.\d{1,2})?$/D' : '/^\d{1,13}(?:\.\d{1,2})?$/D', $value)) {
            throw new ApiError(400, 'INVALID_AMOUNT');
        }
        [$whole, $fraction] = array_pad(explode('.', ltrim($value, '-')), 2, '');
        $n = BigInteger::of($whole)->multipliedBy(100)->plus(str_pad($fraction, 2, '0'));
        if (str_starts_with($value, '-')) {
            $n = $n->negated();
        }
        if (!$signed && ($zero ? $n->isNegative() : $n->compareTo(0) <= 0)) {
            throw new ApiError(400, 'INVALID_AMOUNT');
        }
        return $n;
    }

    public static function money(BigInteger $n): string
    {
        if ($n->abs()->compareTo('9999999999999999') > 0) {
            throw new ApiError(400, 'AMOUNT_OVERFLOW');
        }
        [$whole, $fraction] = $n->abs()->quotientAndRemainder(100);
        return ($n->isNegative() ? '-' : '').$whole.'.'.str_pad((string) $fraction, 2, '0', STR_PAD_LEFT);
    }
}
