<?php

declare(strict_types=1);

namespace App\Upms;

final class OperatorPolicy
{
    public static function permits(array $user, array $control, mixed $policy, string $schema): bool
    {
        if ($policy === null || $policy === '') {
            return (string) ($control['operator_id'] ?? '') === $user['id'];
        }
        if (is_string($policy)) {
            try {
                $policy = json_decode($policy, true, 16, JSON_THROW_ON_ERROR);
            } catch (\Throwable) {
                throw new ApiError(503, 'V1_OPERATOR_POLICY_REJECTED');
            }
        }
        $users = is_array($policy) ? ($policy['users'] ?? null) : null;
        $keys = is_array($policy) ? array_keys($policy) : [];
        sort($keys);
        $names = is_array($users) ? array_keys($users) : [];
        sort($names);
        if ($keys !== ['schema', 'users'] || ($policy['schema'] ?? null) !== $schema || $names !== ['admin', 'haris']
            || !is_string($users['admin']) || !is_string($users['haris'])
            || !preg_match('/^[1-9][0-9]*$/D', $users['admin']) || !preg_match('/^[1-9][0-9]*$/D', $users['haris'])
            || $users['admin'] === $users['haris'] || !in_array((string) ($control['operator_id'] ?? ''), $users, true)) {
            throw new ApiError(503, 'V1_OPERATOR_POLICY_REJECTED');
        }
        return isset($users[$user['username']]) && $users[$user['username']] === $user['id'];
    }
}
