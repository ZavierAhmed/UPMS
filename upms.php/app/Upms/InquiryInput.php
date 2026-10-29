<?php

declare(strict_types=1);

namespace App\Upms;

final class InquiryInput
{
    private const WHITESPACE = '\x{0009}-\x{000D}\x{0020}\x{00A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}';

    // custom remains API-only for legacy clients and exact historical replays.
    public const CATEGORIES = ['buckets' => 'Plastic Buckets', 'cans' => 'Lubricant Cans', 'containers' => 'Plastic Cans', 'stickers' => 'Stickers', 'cartons' => 'Cartons', 'custom' => 'Custom Packaging'];

    public const FIELDS = ['customerName', 'companyName', 'email', 'phone', 'productCategory', 'quantity', 'capacity', 'message', 'website'];

    public static function decode(string $json): mixed
    {
        // JSON.parse retains lone UTF-16 surrogate escapes. PHP's decoder rejects
        // them. Encode those code units reversibly before decoding, while escaping
        // genuine U+E000 characters so they cannot collide with internal markers.
        $json = preg_replace_callback('/"(?:[^"\\\\]|\\\\.)*"/s', function ($match) {
            $literal = $match[0];
            $out = '';
            for ($i = 0, $n = strlen($literal); $i < $n; $i++) {
                if (substr($literal, $i, 3) === "\xEE\x80\x80") {
                    $out .= '\uE000\uE000';
                    $i += 2;

                    continue;
                }
                if ($literal[$i] !== '\\' || $i + 1 >= $n) {
                    $out .= $literal[$i];

                    continue;
                }
                $escape = substr($literal, $i, 6);
                if (! preg_match('/^\\\\u([a-f0-9]{4})$/iD', $escape, $unit)) {
                    $out .= substr($literal, $i, 2);
                    $i++;

                    continue;
                }
                $code = hexdec($unit[1]);
                if ($code >= 0xD800 && $code <= 0xDBFF && preg_match('/^\\\\u(d[c-f][a-f0-9]{2})$/iD', substr($literal, $i + 6, 6))) {
                    $out .= substr($literal, $i, 12);
                    $i += 11;

                    continue;
                }
                if ($code >= 0xD800 && $code <= 0xDFFF) {
                    $out .= '\uE000'.strtolower($unit[1]).';';
                } elseif ($code === 0xE000) {
                    $out .= '\uE000\uE000';
                } else {
                    $out .= $escape;
                }
                $i += 5;
            }

            return $out;
        }, $json);

        return json_decode($json, false, 512, JSON_THROW_ON_ERROR);
    }

    public static function length(string $s): int
    {
        return intdiv(strlen(mb_convert_encoding($s, 'UTF-16LE', 'UTF-8')), 2);
    }

    public static function email(string $s): bool
    {
        if (self::length($s) > 254 || preg_match('/['.self::WHITESPACE.'<>\x00-\x1f\x{7f}-\x{9f}]/u', $s)) {
            return false;
        }
        $i = strrpos($s, '@');
        if (! $i || $i === strlen($s) - 1) {
            return false;
        }
        $local = substr($s, 0, $i);
        $domain = substr($s, $i + 1);
        $invalid = '/[()\[\],:;@"\\\\]/u';
        $quoted = preg_match('/^"(?:[^"\\\\]|\\\\.)+"$/uD', $local);

        return ($quoted || (! preg_match($invalid, $local) && ! str_starts_with($local, '.') && ! str_contains($local, '..')))
            && ! preg_match($invalid, $domain) && ! str_starts_with($domain, '.') && ! str_contains($domain, '..');
    }

    public static function normalize(mixed $raw, int $level = 0): array
    {
        self::depth($raw);
        if (! $raw instanceof \stdClass) {
            throw new \InvalidArgumentException();
        }
        $result = [];
        $identity = [];
        foreach (self::FIELDS as $field) {
            $value = '';
            foreach (get_object_vars($raw) as $key => $v) {
                if (strtolower((string) $key) === strtolower($field)) {
                    $value = $v;
                }
            }
            if ($value !== null && ! is_string($value)) {
                throw new \InvalidArgumentException();
            }
            $encoded = V1Input::trim($value ?? '');
            $result[$field] = preg_replace_callback('/\x{E000}(\x{E000}|d[89a-f][0-9a-f]{2};)/u', fn ($m) => $m[1] === "\xEE\x80\x80" ? $m[1] : "\xEF\xBF\xBD", $encoded);
            if ($result[$field] !== $encoded) {
                $identity[$field] = $encoded;
            }
        }
        // Only the hash sees reversible code-unit identity. SMTP/outbox uses UTF-8
        // replacement, matching Node's string-to-buffer conversion. Unknown input
        // fields cannot supply this internal metadata.
        if ($identity) {
            $result['_codeUnitIdentity'] = $identity;
        }

        return $result;
    }

    private static function depth(mixed $v, int $level = 0): void
    {
        if (is_object($v) || is_array($v)) {
            if ($level >= 8) {
                throw new \InvalidArgumentException();
            }
            foreach ($v as $child) {
                self::depth($child, $level + 1);
            }
        }
    }

    public static function validate(array $r): array
    {
        $errors = [];
        foreach ([['customerName', 1, 100], ['companyName', 0, 150], ['email', 1, 254], ['phone', 1, 40], ['productCategory', 1, 30], ['quantity', 0, 80], ['capacity', 0, 80], ['message', 10, 4000]] as [$k,$min,$max]) {
            $n = self::length($r[$k]);
            if ($n < $min) {
                $errors[$k] = ['Please complete this field.'];
            } elseif ($n > $max) {
                $errors[$k] = ["Use no more than {$max} characters."];
            } elseif (preg_match($k === 'message' ? '/[\x00-\x08\x0b\x0c\x0e-\x1f\x{7f}-\x{9f}]/u' : '/[\x00-\x1f\x{7f}-\x{9f}]/u', $r[$k])) {
                $errors[$k] = ['Remove unsupported control characters.'];
            }
        }
        if (! isset($errors['email']) && ! self::email($r['email'])) {
            $errors['email'] = ['Enter a valid email address.'];
        }
        $digits = preg_match_all('/[0-9]/', $r['phone']);
        if (! isset($errors['phone']) && (! preg_match('/^[0-9+().\-'.self::WHITESPACE.']+$/uD', $r['phone']) || $digits < 7 || $digits > 20)) {
            $errors['phone'] = ['Enter a phone number with 7–20 digits; spaces, +, -, dots and parentheses are allowed.'];
        }
        if (! isset(self::CATEGORIES[$r['productCategory']])) {
            $errors['productCategory'] = ['Choose a listed product category.'];
        }
        if (self::length($r['message']) > 0 && self::length($r['message']) < 10) {
            $errors['message'] = ['Include at least 10 characters about your packaging requirements.'];
        }

        return $errors;
    }
}
