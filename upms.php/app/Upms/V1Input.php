<?php

declare(strict_types=1);

namespace App\Upms;

/** Explicit compatibility validators for the existing Zod Simple V1 inputs. */
final class V1Input
{
    private const LABELS = ['description' => 'Item description', 'quality' => 'Quality', 'colour' => 'Colour', 'packing' => 'Packing', 'date' => 'Date', 'partyId' => 'Client or vendor', 'sellingPrice' => 'Selling price', 'reason' => 'Justification', 'code' => 'Item code', 'discountMode' => 'Discount mode', 'discountValue' => 'Discount value', 'quantity' => 'Quantity', 'rate' => 'Rate', 'itemId' => 'Bottle', 'amount' => 'Amount', 'time' => 'Time', 'name' => 'Name'];

    public static function field(string $field, string $message, string $code = 'ENTRY_VALIDATION', ?array $details = null): never
    {
        throw new ApiError($code === 'INSUFFICIENT_STOCK' ? 409 : 400, $code, [$field => $message], $message, details: $details);
    }

    public static function trim(string $value): string
    {
        $ws = '\x{0009}-\x{000D}\x{0020}\x{00A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}';
        return preg_replace('/^['.$ws.']+|['.$ws.']+$/u', '', $value);
    }

    public static function item(object $input): array
    {
        return self::parse($input, [
            'code' => ['text', 64, 1, 'optional', '/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/D'],
            'sellingPrice' => ['string', 'nullable', 'optional'],
            'description' => ['text', 200, 1], 'quality' => ['text', 100, 1], 'colour' => ['text', 100, 1], 'packing' => ['text', 100, 1],
            'remarks' => ['text', 1000, 0, 'default', ''], 'active' => ['bool', 'default', true], 'version' => ['version', 'optional'], 'reason' => ['text', 500, 0, 'default', ''],
        ]);
    }

    public static function party(object $input): array
    {
        return self::parse($input, [
            'kind' => ['enum', ['CLIENT', 'VENDOR']], 'name' => ['text', 150, 1], 'phone' => ['text', 64, 0, 'default', ''], 'address' => ['text', 1000, 0, 'default', ''],
            'remarks' => ['text', 1000, 0, 'default', ''], 'active' => ['bool', 'default', true], 'version' => ['version', 'optional'], 'reason' => ['text', 500, 0, 'default', ''],
        ]);
    }

    public static function document(object $input): array
    {
        return self::parse($input, [
            'kind' => ['enum', array_keys(SimpleV1::EVENTS)], 'date' => ['date'], 'partyId' => ['id', 'nullable', 'default', null], 'originalId' => ['id', 'optional'],
            'reference' => ['text', 150, 0, 'default', ''], 'remarks' => ['text', 1000, 0, 'default', ''], 'reason' => ['text', 500, 0, 'default', ''],
            'amount' => ['string', 'default', '0'], 'discountMode' => ['enum', ['NONE', 'FIXED', 'PERCENT'], 'default', 'NONE'], 'discountValue' => ['string', 'default', '0'],
            'category' => ['text', 100, 0, 'default', ''], 'description' => ['text', 500, 0, 'default', ''], 'payee' => ['text', 150, 0, 'default', ''],
            'paymentStatus' => ['enum', ['PAID'], 'optional'], 'direction' => ['enum', ['OWED_TO_COMPANY', 'OWED_BY_COMPANY'], 'optional'], 'method' => ['enum', ['CASH', 'BANK_TRANSFER', 'CHEQUE_RECEIVED'], 'optional'],
            'chequeReference' => ['text', 150, 0, 'default', ''], 'correctsId' => ['id', 'optional'], 'vehicle' => ['text', 100, 0, 'default', ''], 'driver' => ['text', 100, 0, 'default', ''],
            'time' => ['time', 5, 0, 'default', ''], 'address' => ['text', 1000, 0, 'default', ''], 'paidImmediately' => ['bool', 'default', false], 'lines' => ['lines', 'default', []],
        ]);
    }

    public static function posting(object $input): array
    {
        return self::parse($input, ['version' => ['version']]);
    }

    public static function cancellation(object $input): array
    {
        return self::parse($input, ['version' => ['integer'], 'reason' => ['text', 500, 3]]);
    }

    private static function issue(array &$errors, string $path): void
    {
        $last = substr($path, (int) strrpos('.'.$path, '.'));
        $errors[$path ?: 'form'] = (self::LABELS[$last] ?? 'Field').' is missing or invalid. Please check this field.';
    }

    private static function parse(object $input, array $schema, string $prefix = '', bool $strict = true, ?array &$parentErrors = null): array
    {
        $errors = [];
        $output = [];
        foreach ($schema as $key => $rule) {
            $path = $prefix.$key;
            if (!property_exists($input, $key)) {
                $default = array_search('default', $rule, true);
                if ($default !== false) {
                    $output[$key] = $rule[$default + 1];
                } elseif (!in_array('optional', $rule, true)) {
                    self::issue($errors, $path);
                }
                continue;
            }
            $v = $input->$key;
            if ($v === null && in_array('nullable', $rule, true)) {
                $output[$key] = null;
                continue;
            }
            $valid = true;
            switch ($rule[0]) {
                case 'text':
                case 'time':
                    if (!is_string($v)) {
                        $valid = false;
                        break;
                    }
                    $v = self::trim($v);
                    // Installed Zod 4.6 string bounds count Unicode code points.
                    $length = mb_strlen($v, 'UTF-8');
                    $valid = $length <= $rule[1] && $length >= $rule[2];
                    if ($key === 'code') {
                        $valid = $valid && (bool) preg_match($rule[4], $v);
                    }
                    if ($rule[0] === 'time') {
                        $valid = $valid && ($v === '' || preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/D', $v));
                    }
                    break;
                case 'string':
                    $valid = is_string($v);
                    break;
                case 'bool':
                    $valid = is_bool($v);
                    break;
                case 'enum':
                    $valid = in_array($v, $rule[1], true);
                    break;
                case 'id':
                    $valid = is_string($v) && (bool) preg_match('/^[1-9][0-9]*$/D', $v);
                    break;
                case 'version':
                case 'integer':
                    $valid = (is_int($v) || is_float($v)) && ($rule[0] === 'integer' || $v >= 1) && $v <= 9007199254740991 && $v >= -9007199254740991 && floor($v) === (float) $v;
                    if ($valid) {
                        $v = (int) $v;
                    }
                    break;
                case 'date':
                    $d = is_string($v) && preg_match('/^\d{4}-\d{2}-\d{2}$/D', $v) ? \DateTimeImmutable::createFromFormat('!Y-m-d', $v) : false;
                    $valid = $d && $d->format('Y-m-d') === $v;
                    break;
                case 'lines':
                    $valid = is_array($v) && count($v) <= 100;
                    if (is_array($v)) {
                        $lines = [];
                        foreach ($v as $i => $line) {
                            if (!is_object($line)) {
                                self::issue($errors, $path.'.'.$i);
                                continue;
                            }
                            $lines[] = self::parse($line, ['itemId' => ['id'], 'originalLineId' => ['id', 'optional'], 'quantity' => ['string'], 'rate' => ['string', 'default', '0']], $path.'.'.$i.'.', false, $errors);
                        }
                        $v = $lines;
                    }
                    break;
            }
            if (!$valid) {
                self::issue($errors, $path);
            }
            $output[$key] = $v;
        }
        if ($strict && array_diff(array_keys(get_object_vars($input)), array_keys($schema))) {
            $errors[$prefix ? rtrim($prefix, '.') : 'form'] = 'Some submitted fields are not supported. Refresh this page and try again.';
        }
        if ($parentErrors !== null) {
            $parentErrors = [...$parentErrors, ...$errors];
        } elseif ($errors) {
            throw new ApiError(400, 'INVALID_INPUT', $errors);
        }
        return $output;
    }

    public static function uniqueLines(array $lines): void
    {
        $seen = [];
        foreach ($lines as $i => $line) {
            if (isset($seen[$line['itemId']])) {
                self::field('lines.'.$i.'.itemId', 'This bottle is already included. Update its quantity in the existing row.', 'DUPLICATE_BOTTLE');
            }
            $seen[$line['itemId']] = true;
        }
    }

    public static function price(string $value, string $field): string
    {
        return Exact::money(self::cents($value, $field));
    }

    public static function cents(string $value, string $field, bool $zero = false): \Brick\Math\BigInteger
    {
        try {
            return Exact::cents($value, zero: $zero);
        } catch (ApiError) {
            self::field($field, $zero ? 'Enter a valid amount with up to two decimal places.' : 'Enter a price greater than zero with up to two decimal places.');
        }
    }
}
