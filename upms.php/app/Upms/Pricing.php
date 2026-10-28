<?php

declare(strict_types=1);

namespace App\Upms;

use Brick\Math\BigInteger;

final class Pricing
{
    /** Exact V1.2 bill discount; (subtotal * basis-points + 5000) / 10000. */
    public static function discount(BigInteger $subtotal, string $mode = 'NONE', string $value = '0', bool $allowZero = false): array
    {
        $n = V1Input::cents($value, 'discountValue', zero: true);
        $reduction = BigInteger::zero();
        if ($mode === 'NONE') {
            if (!$n->isZero()) {
                V1Input::field('discountValue', 'Choose a discount mode before entering a discount.');
            }
        } elseif ($mode === 'FIXED') {
            if ($n->compareTo($subtotal) > 0) {
                V1Input::field('discountValue', 'Discount cannot exceed the subtotal.');
            }
            $reduction = $n;
        } elseif ($mode === 'PERCENT') {
            if ($n->compareTo(10000) > 0) {
                V1Input::field('discountValue', 'Percentage discount cannot exceed100%.');
            }
            $reduction = $subtotal->multipliedBy($n)->plus(5000)->quotient(10000);
        } else {
            V1Input::field('discountMode', 'Choose no discount, fixed PKR or percentage.');
        }
        $final = $subtotal->minus($reduction);
        if (!$allowZero && $final->compareTo(0) <= 0) {
            V1Input::field('discountValue', 'A zero-total challan cannot be posted. Owner approval is required.', 'ZERO_TOTAL_BLOCKED');
        }
        return ['mode' => $mode, 'value' => Exact::money($n), 'subtotal' => Exact::money($subtotal), 'amount' => Exact::money($reduction), 'total' => Exact::money($final)];
    }
}
