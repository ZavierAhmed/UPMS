<?php

declare(strict_types=1);

namespace App\Upms;

/** Simple V1 command protocol, not the separate legacy ERP coordinate protocol. */
final class BusinessCommand
{
    public function __construct(private readonly Database $db, private readonly Identity $identity)
    {
    }

    public static function json(mixed $value): string
    {
        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_LINE_TERMINATORS | JSON_THROW_ON_ERROR);
    }

    public static function canonical(mixed $value): string
    {
        if (is_object($value)) {
            $keys = array_keys(get_object_vars($value));
            usort($keys, fn ($a, $b) => strcmp(mb_convert_encoding((string) $a, 'UTF-16BE'), mb_convert_encoding((string) $b, 'UTF-16BE')));
            return '{'.implode(',', array_map(fn ($key) => self::json((string) $key).':'.self::canonical($value->$key), $keys)).'}';
        }
        if (is_array($value)) {
            return '['.implode(',', array_map(self::canonical(...), $value)).']';
        }
        // Numeric JSON metadata must obey JavaScript's safe-integer rule. Money and
        // document IDs are validated strings and never calculated using floats.
        if ((is_int($value) && ($value > 9007199254740991 || $value < -9007199254740991))
            || (is_float($value) && (!is_finite($value) || floor($value) !== $value || abs($value) > 9007199254740991))) {
            throw new ApiError(400, 'INVALID_EXACT_VALUE');
        }
        return self::json(is_float($value) ? (int) $value : $value);
    }

    public function operator(?array $session): array
    {
        $user = $this->identity->authorize($session, 'portal.access');
        $control = $this->db->one('SELECT * FROM v1_control WHERE id=1');
        if ($user['passwordChangeRequired'] ?? false) {
            throw new ApiError(403, 'PASSWORD_CHANGE_REQUIRED');
        }
        if (!in_array('administrator', $user['roles'], true) || !OperatorPolicy::permits($user, $control ?? [], config('upms.designated_operators'), (string) config('upms.database'))) {
            throw new ApiError(403, 'V1_OPERATOR_ONLY');
        }
        return [$user, $control];
    }

    public function run(?array $session, mixed $key, string $operation, mixed $input, callable $work, ?callable $scope = null): array
    {
        if (!is_string($key) || !preg_match('/^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/D', $key)) {
            throw new ApiError(400, 'IDEMPOTENCY_KEY_REQUIRED');
        }
        return $this->db->transaction(function () use ($session, $key, $operation, $input, $work, $scope): array {
            [$user, $control] = $this->operator($session);
            if ($scope !== null) {
                $scope();
            }
            $hash = hash('sha256', self::canonical((object) ['operation' => $operation, 'input' => $input]));
            $existing = $this->db->one('SELECT * FROM v1_commands WHERE `key`=?', [$key]);
            if ($existing) {
                if ((string) $existing['actor_id'] !== $user['id'] || $existing['fingerprint'] !== $hash) {
                    throw new ApiError(409, 'IDEMPOTENCY_CONFLICT');
                }
                return json_decode($existing['result'], true, 512, JSON_THROW_ON_ERROR);
            }
            if ($control['state'] !== 'READY') {
                throw new ApiError(409, 'V1_CUTOVER_PENDING');
            }
            // No bypass: Database validates the independently selected profile.
            $result = $work($user, $control);
            $this->db->execute('INSERT INTO v1_commands(`key`,actor_id,fingerprint,result) VALUES(?,?,?,?)', [$key, $user['id'], $hash, self::json($result)]);
            return $result;
        });
    }

    public static function timestamp(): string
    {
        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        return $now->format('Y-m-d H:i:s.').substr($now->format('u'), 0, 3).'000';
    }

    public static function truthy(mixed $value): bool
    {
        return !($value === null || $value === false || $value === '' || $value === 0 || $value === 0.0);
    }

    public function audit(array $user, string $action, string $reference, string $reason): void
    {
        $this->db->execute('INSERT INTO v1_audit(actor_id,action,reference,reason,created_at) VALUES(?,?,?,?,?)', [$user['id'], $action, $reference, $reason !== '' ? $reason : str_replace('.', ' ', $action), self::timestamp()]);
    }
}
