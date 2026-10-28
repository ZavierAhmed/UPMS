<?php

declare(strict_types=1);

namespace App\Upms;

final class Passwords
{
    public static function inputLength(string $value): int
    {
        // Zod/JavaScript string limits count UTF-16 units, not UTF-8 bytes/code points.
        return intdiv(strlen(mb_convert_encoding($value, 'UTF-16LE', 'UTF-8')), 2);
    }

    public static function bounded(Database $db, callable $action): mixed
    {
        // Two hashing slots shared across PHP workers on this isolated schema.
        // Mirrors Node's BUSY guard without assuming one long-lived PHP process.
        for ($slot = 0; $slot < 2; $slot++) {
            $key = 'upms-hash-'.substr(hash('sha256', config('upms.database')), 0, 40).'-'.$slot;
            if ((int) $db->one('SELECT GET_LOCK(?,0) AS acquired', [$key])['acquired'] === 1) {
                try {
                    return $action();
                } finally {
                    $db->one('SELECT RELEASE_LOCK(?) AS released', [$key]);
                }
            }
        }
        throw new ApiError(429, 'BUSY');
    }

    public static function verify(string $password, string $hash): bool
    {
        // Node argon2 0.45 emits m,p,t; libargon2 expects m,t,p. Reorder only the
        // PHC parameter header in memory. Preserve the salt, digest and stored hash.
        if (!preg_match('/^\$argon2id\$v=19\$([^$]+)\$([A-Za-z0-9+\/]+)\$([A-Za-z0-9+\/]+)$/D', $hash, $parts)) {
            return false;
        }
        $options = [];
        foreach (explode(',', $parts[1]) as $entry) {
            if (!preg_match('/^(m|t|p)=([1-9][0-9]*)$/D', $entry, $pair) || isset($options[$pair[1]])) {
                return false;
            }
            $options[$pair[1]] = $pair[2];
        }
        // Existing reference parameters. Reject corrupted/excessive cost headers.
        if (count($options) !== 3 || ($options['m'] ?? '') !== '19456' || ($options['t'] ?? '') !== '2' || ($options['p'] ?? '') !== '1') {
            return false;
        }
        return password_verify($password, '$argon2id$v=19$m=19456,t=2,p=1$'.$parts[2].'$'.$parts[3]);
    }
}
