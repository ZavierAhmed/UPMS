<?php

declare(strict_types=1);

namespace App\Upms;

use Illuminate\Support\Facades\Crypt;

final class Identity
{
    public function __construct(private readonly Database $db)
    {
    }

    public static function now(): int
    {
        return (int) floor(microtime(true) * 1000);
    }

    public function audit(?string $actor, string $action, array $details = []): void
    {
        $this->db->execute('INSERT INTO identity_audit_events(actor_id,target_id,action,correlation,details,created_at) VALUES(?,?,?,?,?,UTC_TIMESTAMP(6))', [$actor, $actor, $action, (string) \Illuminate\Support\Str::uuid(), json_encode((object) $details, JSON_THROW_ON_ERROR)]);
    }

    public function user(string $id): array
    {
        $row = $this->db->one('SELECT id,login_key,display_name,enabled,authorization_version FROM users WHERE id=?', [$id]);
        if (!$row || !$row['enabled']) {
            throw new ApiError(401, 'SESSION_EXPIRED');
        }
        $roles = array_column($this->db->rows('SELECT role_code FROM user_roles WHERE user_id=?', [$id]), 'role_code');
        $permissions = array_column($this->db->rows('SELECT DISTINCT p.permission_code FROM role_permissions p JOIN user_roles r ON r.role_code=p.role_code WHERE r.user_id=? ORDER BY p.permission_code', [$id]), 'permission_code');
        $bootstrap = $this->db->one("SELECT id,details FROM identity_audit_events WHERE target_id=? AND action='administrator.bootstrap' LIMIT 1", [$id]);
        $rotation = $bootstrap && (json_decode($bootstrap['details'], true, 512, JSON_THROW_ON_ERROR)['requirePasswordChange'] ?? false) === true
            && !$this->db->one("SELECT id FROM identity_audit_events WHERE target_id=? AND action='user.password.changed' AND id>? LIMIT 1", [$id, $bootstrap['id']]);
        return ['id' => (string) $row['id'], 'username' => $row['login_key'], 'displayName' => $row['display_name'],
            ...($rotation ? ['passwordChangeRequired' => true] : []), 'version' => $row['authorization_version'], 'roles' => $roles, 'permissions' => $permissions];
    }

    public function session(?string $token): ?array
    {
        if (!$token || !preg_match('/^[a-f0-9]{64}$/D', $token)) {
            return null;
        }
        $row = $this->db->one('SELECT * FROM sessions WHERE token_hash=?', [hash('sha256', $token)]);
        if (!$row || $row['revoked'] || self::now() >= (int) $row['idle_expires'] || self::now() >= (int) $row['absolute_expires']) {
            return null;
        }
        $data = json_decode($row['data'], true, 512, JSON_THROW_ON_ERROR);
        // Separate cookie/format: existing Node sessions are preserved, never interpreted as PHP sessions.
        if (($data['format'] ?? '') !== 'upms-php-v1') {
            return null;
        }
        return ['hash' => $row['token_hash'], 'row' => $row, 'data' => $data];
    }

    public function authorize(?array $session, string $permission): array
    {
        if (!isset($session['data']['userId'])) {
            throw new ApiError(401, 'AUTH_REQUIRED');
        }
        // Always re-read under identity_guard, including after middleware loaded the cookie.
        $row = $this->db->one('SELECT * FROM sessions WHERE token_hash=?', [$session['hash']]);
        if (!$row || $row['revoked'] || (string) $row['user_id'] !== (string) $session['data']['userId']
            || self::now() >= (int) $row['idle_expires'] || self::now() >= (int) $row['absolute_expires']) {
            throw new ApiError(401, 'SESSION_EXPIRED');
        }
        $user = $this->user((string) $row['user_id']);
        if ($user['version'] !== $session['data']['authVersion']) {
            throw new ApiError(401, 'SESSION_EXPIRED');
        }
        if (($user['passwordChangeRequired'] ?? false) && !in_array($permission, ['portal.access', 'profile.read', 'profile.password', 'sessions.self'], true)) {
            throw new ApiError(403, 'PASSWORD_CHANGE_REQUIRED');
        }
        if (!in_array($permission, $user['permissions'], true)) {
            throw new ApiError(403, 'ACCESS_DENIED');
        }
        return $user;
    }

    public function create(?array $user = null): array
    {
        $token = bin2hex(random_bytes(32));
        $csrf = bin2hex(random_bytes(32));
        $now = self::now();
        $this->db->execute('DELETE FROM sessions WHERE absolute_expires<?', [$now]);
        if ((int) $this->db->one('SELECT COUNT(*) AS n FROM sessions')['n'] >= 4096) {
            throw new ApiError(503, 'IDENTITY_UNAVAILABLE');
        }
        $data = ['format' => 'upms-php-v1', 'issuedAt' => $now, 'csrf' => Crypt::encryptString($csrf),
            ...($user ? ['userId' => $user['id'], 'authVersion' => $user['version']] : [])];
        $this->db->execute('INSERT INTO sessions(token_hash,user_id,data,idle_expires,absolute_expires,revoked) VALUES(?,?,?,?,?,0)', [hash('sha256', $token), $user['id'] ?? null, json_encode($data, JSON_THROW_ON_ERROR), $now + config('upms.idle_ms'), $now + config('upms.absolute_ms')]);
        if ($user) {
            $this->audit($user['id'], 'login.succeeded');
        }
        return ['token' => $token, 'csrfToken' => $csrf];
    }

    public function read(?array $session, string $permission, callable $action): mixed
    {
        try {
            return $this->db->transaction(fn () => $action($this->authorize($session, $permission)));
        } catch (ApiError $error) {
            if ($error->apiCode === 'ACCESS_DENIED') {
                $this->db->transaction(fn () => $this->audit($session['data']['userId'], 'authorization.denied', ['permission' => $permission]));
            }
            throw $error;
        }
    }

    public function csrf(array $session): string
    {
        return Crypt::decryptString($session['data']['csrf']);
    }

    public function touch(array $session): void
    {
        $now = self::now();
        $this->db->execute('UPDATE sessions SET idle_expires=? WHERE token_hash=? AND revoked=0 AND idle_expires>? AND absolute_expires>?', [$now + config('upms.idle_ms'), $session['hash'], $now, $now]);
    }

    public function revoke(array $session): void
    {
        $this->db->execute("UPDATE sessions SET revoked=1,data='{}' WHERE token_hash=?", [$session['hash']]);
    }

    public function login(string $username, string $password): ?array
    {
        $key = strtolower($username);
        $allowed = $this->db->transaction(function () use ($key): bool {
            $now = self::now();
            $this->db->execute('DELETE FROM login_attempts WHERE window_start<?', [$now - 120000]);
            $permitted = true;
            foreach (['global', hash('sha256', $key)] as $i => $bucket) {
                $row = $this->db->one('SELECT * FROM login_attempts WHERE bucket=?', [$bucket]);
                if (!$row || $now - (int) $row['window_start'] >= 60000) {
                    if (!$row && (int) $this->db->one('SELECT COUNT(*) AS n FROM login_attempts')['n'] >= 4096) {
                        $permitted = false;
                        continue;
                    }
                    $this->db->execute('INSERT INTO login_attempts(bucket,window_start,attempts) VALUES(?,?,1) ON DUPLICATE KEY UPDATE window_start=VALUES(window_start),attempts=1', [$bucket, $now]);
                } else {
                    if ($row['attempts'] >= ($i ? 10 : 60)) {
                        $permitted = false;
                    }
                    $this->db->execute('UPDATE login_attempts SET attempts=? WHERE bucket=?', [min($row['attempts'] + 1, 1000), $bucket]);
                }
            }
            return $permitted;
        });
        if (!$allowed) {
            throw new ApiError(429, 'LOGIN_THROTTLED');
        }
        $before = $this->db->one('SELECT * FROM users WHERE login_key=?', [$key]);
        // Fixed representative Argon2id dummy; same cost as Node. Never an account credential.
        $hash = $before['password_hash'] ?? config('upms.dummy_hash');
        if (!$hash) {
            throw new ApiError(503, 'IDENTITY_UNAVAILABLE');
        }
        $valid = Passwords::bounded($this->db, fn () => Passwords::verify($password, $hash));
        return $this->db->transaction(function () use ($valid, $before): ?array {
            $current = $before ? $this->db->one('SELECT * FROM users WHERE id=?', [$before['id']]) : null;
            if (!$valid || !$current || !$current['enabled'] || $current['password_hash'] !== $before['password_hash'] || $current['authorization_version'] !== $before['authorization_version']) {
                $this->audit(null, 'login.failed');
                return null;
            }
            return $this->user((string) $current['id']);
        });
    }

    public function changePassword(array $session, string $old, string $new): void
    {
        if ($old === $new) {
            throw new ApiError(400, 'PASSWORD_MUST_DIFFER');
        }
        $before = $this->read($session, 'profile.password', function ($user): array {
            return $this->db->one('SELECT * FROM users WHERE id=?', [$user['id']]);
        });
        if (!Passwords::bounded($this->db, fn () => Passwords::verify($old, $before['password_hash']))) {
            throw new ApiError(401, 'INVALID_CREDENTIALS');
        }
        $hash = Passwords::bounded($this->db, fn () => password_hash($new, PASSWORD_ARGON2ID, ['memory_cost' => 19456, 'time_cost' => 2, 'threads' => 1]));
        $this->read($session, 'profile.password', function ($user) use ($before, $hash): void {
            $current = $this->db->one('SELECT password_hash FROM users WHERE id=?', [$user['id']]);
            if ($current['password_hash'] !== $before['password_hash']) {
                throw new ApiError(409, 'STALE_VERSION');
            }
            $this->db->execute('UPDATE users SET password_hash=?,authorization_version=authorization_version+1,updated_at=UTC_TIMESTAMP(6) WHERE id=?', [$hash, $user['id']]);
            $this->db->execute('DELETE FROM sessions WHERE user_id=?', [$user['id']]);
            $this->audit($user['id'], 'user.password.changed');
        });
    }
}
