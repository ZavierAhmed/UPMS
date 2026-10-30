<?php

declare(strict_types=1);

namespace App\Upms;

use PDO;

/** Maintenance-only service. Never registered as an HTTP route or called at startup. */
final class AdminProvisioning
{
    public static function apply(PDO $pdo, string $reference, array $passwords, ?array $legacyRecoveryWaiver = null): array
    {
        if (!preg_match('/^[a-zA-Z0-9_-]{12,64}$/D', $reference)) {
            throw new \RuntimeException('PROVISION_REFERENCE_REQUIRED');
        }
        $pdo->beginTransaction();
        try {
            if (!$pdo->query('SELECT id FROM identity_guard WHERE id=1 FOR UPDATE')->fetchColumn()) {
                throw new \RuntimeException('SCHEMA_INCOMPATIBLE');
            }
            $permissions = $pdo->query("SELECT permission_code FROM role_permissions WHERE role_code='administrator' ORDER BY permission_code")->fetchAll(PDO::FETCH_COLUMN);
            $expected = ['portal.access', 'profile.read', 'profile.password', 'sessions.self', 'users.read', 'users.create', 'users.update', 'roles.read', 'roles.assign', 'audit.read', 'sessions.revoke'];
            sort($expected);
            if ($permissions !== $expected) {
                throw new \RuntimeException('ADMINISTRATOR_CATALOG_CONFLICT');
            }
            $rows = $pdo->query("SELECT u.id,u.login_key,u.display_name,u.enabled FROM users u JOIN user_roles r ON r.user_id=u.id WHERE r.role_code='administrator' AND u.enabled=1")->fetchAll(PDO::FETCH_ASSOC);
            if (count($rows) > 2 || array_diff(array_column($rows, 'login_key'), ['admin', 'haris'])) {
                throw new \RuntimeException('EXISTING_ADMINISTRATOR_CONFLICT');
            }
            $receipt = $pdo->prepare("SELECT details FROM identity_audit_events WHERE action='administrators.provisioned' AND correlation=? ORDER BY id DESC LIMIT 1");
            $receipt->execute([$reference]);
            $previous = $receipt->fetchColumn();
            $ids = [];
            $missing = [];
            foreach (['admin' => 'Admin', 'haris' => 'Haris'] as $name => $display) {
                $query = $pdo->prepare('SELECT id,enabled,display_name FROM users WHERE login_key=? FOR UPDATE');
                $query->execute([$name]);
                $user = $query->fetch(PDO::FETCH_ASSOC);
                if ($user) {
                    $role = $pdo->prepare("SELECT COUNT(*) FROM user_roles WHERE user_id=? AND role_code='administrator'");
                    $role->execute([$user['id']]);
                    if (!$user['enabled'] || !$role->fetchColumn() || $user['display_name'] !== $display) {
                        throw new \RuntimeException('DESIGNATED_USERNAME_CONFLICT');
                    }
                    $ids[$name] = (string) $user['id'];
                } else {
                    $missing[$name] = $display;
                }
            }
            if ($previous !== false) {
                $receiptData = json_decode($previous, true, 16, JSON_THROW_ON_ERROR);
                if ($missing || ($receiptData['users'] ?? null) !== $ids) {
                    throw new \RuntimeException('PROVISION_RECEIPT_CONFLICT');
                }
                $pdo->commit();
                return ['users' => $ids, 'created' => $receiptData['created'] ?? [], 'changed' => false];
            }
            foreach ($missing as $name => $display) {
                $password = $passwords[$name] ?? null;
                if (!is_string($password) || strlen($password) < 24 || strlen($password) > 128) {
                    throw new \RuntimeException('STRONG_PRIVATE_CREDENTIAL_REQUIRED');
                }
            }
            if (count($missing) === 2 && hash_equals($passwords['admin'], $passwords['haris'])) {
                throw new \RuntimeException('DISTINCT_CREDENTIALS_REQUIRED');
            }
            foreach ($missing as $name => $display) {
                $hash = password_hash($passwords[$name], PASSWORD_ARGON2ID, ['memory_cost' => 19456, 'time_cost' => 2, 'threads' => 1]);
                $insert = $pdo->prepare('INSERT INTO users(login_key,display_name,password_hash,enabled,authorization_version,created_at,updated_at) VALUES(?,?,?,1,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))');
                $insert->execute([$name, $display, $hash]);
                $ids[$name] = (string) $pdo->lastInsertId();
                $pdo->prepare("INSERT INTO user_roles(user_id,role_code) VALUES(?,'administrator')")->execute([$ids[$name]]);
            }
            $ids = ['admin' => $ids['admin'], 'haris' => $ids['haris']];
            $operator = $pdo->query('SELECT operator_id FROM v1_control WHERE id=1 FOR UPDATE')->fetchColumn();
            if ($operator !== false && $operator !== null && !in_array((string) $operator, $ids, true)) {
                throw new \RuntimeException('EXISTING_OPERATOR_CONFLICT');
            }
            foreach ($ids as $name => $id) {
                $action = isset($missing[$name]) ? 'administrator.bootstrap' : 'administrator.rotation.required';
                $pdo->prepare('INSERT INTO identity_audit_events(actor_id,target_id,action,correlation,details,created_at) VALUES(NULL,?,?,?,?,UTC_TIMESTAMP(6))')->execute([$id, $action, $reference, json_encode(['requirePasswordChange' => true, 'source' => 'approved-maintenance-cli'], JSON_THROW_ON_ERROR)]);
                $pdo->prepare('UPDATE users SET authorization_version=authorization_version+1,updated_at=UTC_TIMESTAMP(6) WHERE id=?')->execute([$id]);
                $pdo->prepare('UPDATE sessions SET revoked=1 WHERE user_id=?')->execute([$id]);
            }
            $pdo->prepare("INSERT INTO identity_audit_events(actor_id,target_id,action,correlation,details,created_at) VALUES(NULL,NULL,'administrators.provisioned',?,?,UTC_TIMESTAMP(6))")->execute([$reference, json_encode(['users' => $ids, 'created' => array_keys($missing), 'maintenanceAccount' => $pdo->query('SELECT CURRENT_USER()')->fetchColumn(), 'legacyRecoveryWaiver' => $legacyRecoveryWaiver], JSON_THROW_ON_ERROR)]);
            $pdo->commit();
            return ['users' => $ids, 'created' => array_keys($missing), 'changed' => true];
        } catch (\Throwable $error) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $error;
        }
    }
}
