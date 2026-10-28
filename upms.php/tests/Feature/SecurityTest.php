<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Upms\ApiError;
use App\Upms\Database;
use App\Upms\Identity;
use App\Upms\Schema;
use PDO;
use Tests\TestCase;

final class SecurityTest extends TestCase
{
    private PDO $admin;
    private array $baseline;
    private array $bootstrap;

    protected function setUp(): void
    {
        parent::setUp();
        $name = config('upms.database');
        self::assertMatchesRegularExpression('/^upms_test_php_[0-9]+$/', $name);
        $port = getenv('PHP_TEST_ADMIN_PORT') ?: '3328';
        self::assertContains($port, ['3328', '3330']);
        self::assertSame($port, (string) config('upms.port'));
        $password = getenv('PHP_TEST_ADMIN_PASSWORD');
        self::assertNotFalse($password, 'Explicit isolated-instance test password required');
        $this->admin = new PDO('mysql:host=127.0.0.1;port='.$port.';dbname='.$name, getenv('PHP_TEST_ADMIN_USER') ?: 'root', $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $this->baseline = $this->admin->query('SELECT * FROM users WHERE id=1')->fetch(PDO::FETCH_ASSOC);
        $this->bootstrap = $this->admin->query("SELECT id,details FROM identity_audit_events WHERE target_id=1 AND action='administrator.bootstrap' LIMIT 1")->fetch(PDO::FETCH_ASSOC);
        $this->admin->exec('DELETE FROM login_attempts');
    }

    protected function tearDown(): void
    {
        if (isset($this->baseline)) {
            $q = $this->admin->prepare('UPDATE users SET password_hash=?,enabled=?,authorization_version=? WHERE id=1');
            $q->execute([$this->baseline['password_hash'], $this->baseline['enabled'], $this->baseline['authorization_version']]);
            $q = $this->admin->prepare('UPDATE identity_audit_events SET details=? WHERE id=?');
            $q->execute([$this->bootstrap['details'], $this->bootstrap['id']]);
            $this->admin->exec("DELETE FROM identity_audit_events WHERE action='user.password.changed' OR action='administrator.bootstrap' AND details LIKE '%php-test-rotation%'");
            $this->admin->exec("DELETE FROM user_roles WHERE user_id=1");
            $this->admin->exec("INSERT INTO user_roles(user_id,role_code) VALUES(1,'administrator')");
            $this->admin->exec('UPDATE v1_control SET operator_id=1 WHERE id=1');
        }
        parent::tearDown();
    }

    private function http(string $method, string $path, ?string $token = null, ?string $csrf = null, mixed $body = null, array $server = []): mixed
    {
        $server = [...['HTTPS' => 'on', 'HTTP_ORIGIN' => config('upms.origin'), 'CONTENT_TYPE' => 'application/json'], ...$server];
        if ($csrf !== null) {
            $server['HTTP_X_CSRF_TOKEN'] = $csrf;
        }
        $origin = $server['HTTPS'] === 'off' ? str_replace('https://', 'http://', config('upms.origin')) : config('upms.origin');
        return $this->call($method, $origin.'/api/v1/management/'.$path, [], $token ? [config('upms.cookie') => $token] : [], [], $server, $body === null ? null : (is_string($body) ? $body : json_encode($body)));
    }

    private function anonymous(): array
    {
        $r = $this->http('GET', 'session/csrf');
        $r->assertOk();
        $cookies = $r->headers->getCookies();
        self::assertCount(1, $cookies);
        self::assertTrue($cookies[0]->isSecure());
        self::assertTrue($cookies[0]->isHttpOnly());
        self::assertSame('strict', $cookies[0]->getSameSite());
        self::assertNull($cookies[0]->getDomain());
        return [$cookies[0]->getValue(), $r->json('csrfToken')];
    }

    private function login(): array
    {
        [$token, $csrf] = $this->anonymous();
        $r = $this->http('POST', 'session/login', $token, $csrf, ['username' => 'PHP-ADMIN', 'password' => 'Synthetic-Only-2026!']);
        $r->assertOk();
        $fixture = json_decode(file_get_contents(__DIR__.'/../../../tmp/php-runtime/contracts.json'), true);
        self::assertSame($fixture['loginUser'], $r->json('user'));
        $new = $r->headers->getCookies()[0]->getValue();
        self::assertNotSame($token, $new);
        self::assertNull(app(Identity::class)->session($token));
        return [$new, $r->json('csrfToken')];
    }

    public function test_login_current_logout_and_protected_session_storage(): void
    {
        [$token, $csrf] = $this->login();
        $row = app(Database::class)->one('SELECT * FROM sessions WHERE token_hash=?', [hash('sha256', $token)]);
        self::assertStringNotContainsString($token, json_encode($row));
        self::assertStringNotContainsString($csrf, $row['data']);
        $this->http('GET', 'session/current', $token)->assertOk()->assertJsonPath('csrfToken', $csrf);
        $this->http('POST', 'session/logout', $token, $csrf, (object) [])->assertNoContent();
        $this->http('GET', 'session/current', $token)->assertUnauthorized();
    }

    public function test_csrf_origin_json_and_body_limits(): void
    {
        [$token, $csrf] = $this->anonymous();
        $input = ['username' => 'php-admin', 'password' => 'Synthetic-Only-2026!'];
        $this->http('POST', 'session/login', $token, null, $input)->assertForbidden()->assertJsonPath('error.code', 'CSRF_REJECTED');
        $this->http('POST', 'session/login', $token, $csrf, $input, ['HTTP_ORIGIN' => 'https://attacker.test'])->assertForbidden();
        $this->http('POST', 'session/login', $token, $csrf, $input, ['CONTENT_TYPE' => 'text/plain'])->assertStatus(415);
        $this->http('POST', 'session/login', $token, $csrf, '{invalid')->assertStatus(400)->assertJsonPath('error.code', 'INVALID_INPUT');
        $this->http('POST', 'session/login', $token, $csrf, str_repeat('x', 12289))->assertStatus(413);
        $this->http('GET', 'session/current', null)->assertUnauthorized();
        $this->http('POST', 'session/logout', null, null, (object) [])->assertUnauthorized();
        $this->http('GET', 'session/csrf', null, null, null, ['HTTPS' => 'off', 'HTTP_X_FORWARDED_PROTO' => 'https'])->assertStatus(400);
    }

    public function test_login_throttling_and_sql_injection(): void
    {
        [$token, $csrf] = $this->anonymous();
        for ($i = 0; $i < 10; $i++) {
            $this->http('POST', 'session/login', $token, $csrf, ['username' => "x' OR 1=1 --", 'password' => 'wrong'])->assertUnauthorized();
        }
        $this->http('POST', 'session/login', $token, $csrf, ['username' => "x' OR 1=1 --", 'password' => 'wrong'])->assertStatus(429)->assertJsonPath('error.code', 'LOGIN_THROTTLED');
        self::assertSame('1', (string) app(Database::class)->one('SELECT COUNT(*) AS n FROM users')['n']);
    }

    public function test_disabled_account_and_version_revocation(): void
    {
        [$token] = $this->login();
        $this->admin->exec('UPDATE users SET authorization_version=authorization_version+1 WHERE id=1');
        $this->http('GET', 'session/current', $token)->assertUnauthorized()->assertJsonPath('error.code', 'SESSION_EXPIRED');
        $this->admin->exec('UPDATE users SET enabled=0 WHERE id=1');
        [$anon, $csrf] = $this->anonymous();
        $this->http('POST', 'session/login', $anon, $csrf, ['username' => 'php-admin', 'password' => 'Synthetic-Only-2026!'])->assertUnauthorized()->assertJsonPath('error.code', 'INVALID_CREDENTIALS');
    }

    public function test_idle_absolute_expiry_and_no_touch_resurrection(): void
    {
        foreach (['idle_expires', 'absolute_expires'] as $column) {
            [$token] = $this->login();
            $session = app(Identity::class)->session($token);
            $q = $this->admin->prepare('UPDATE sessions SET '.$column.'=1 WHERE token_hash=?');
            $q->execute([hash('sha256', $token)]);
            $this->http('GET', 'session/current', $token)->assertUnauthorized();
            app(Identity::class)->touch($session);
            self::assertNull(app(Identity::class)->session($token));
        }
    }

    public function test_permission_operator_and_forced_password_rotation(): void
    {
        [$token] = $this->login();
        $this->admin->exec("DELETE FROM user_roles WHERE user_id=1");
        $this->http('GET', 'session/current', $token)->assertForbidden()->assertJsonPath('error.code', 'ACCESS_DENIED');
        $this->admin->exec("INSERT INTO user_roles(user_id,role_code) VALUES(1,'inventory')");
        $this->http('GET', 'simple-v1/items', $token)->assertForbidden()->assertJsonPath('error.code', 'V1_OPERATOR_ONLY');
        $this->admin->exec("DELETE FROM user_roles WHERE user_id=1");
        $this->admin->exec("INSERT INTO user_roles(user_id,role_code) VALUES(1,'administrator')");
        $q = $this->admin->prepare('UPDATE identity_audit_events SET details=? WHERE id=?');
        $q->execute(['{"requirePasswordChange":true}', $this->bootstrap['id']]);
        $this->http('GET', 'session/current', $token)->assertOk()->assertJsonPath('user.passwordChangeRequired', true);
        $this->http('GET', 'simple-v1/items', $token)->assertForbidden()->assertJsonPath('error.code', 'PASSWORD_CHANGE_REQUIRED');
    }

    public function test_password_change_revokes_all_sessions_and_preserves_account(): void
    {
        [$one, $csrf] = $this->login();
        [$two] = $this->login();
        $this->http('POST', 'profile/password', $one, $csrf, ['currentPassword' => 'Synthetic-Only-2026!', 'newPassword' => 'Changed-Synthetic-Only-2026!'])->assertNoContent();
        $this->http('GET', 'session/current', $one)->assertUnauthorized();
        $this->http('GET', 'session/current', $two)->assertUnauthorized();
        [$anon, $csrf] = $this->anonymous();
        $this->http('POST', 'session/login', $anon, $csrf, ['username' => 'php-admin', 'password' => 'Changed-Synthetic-Only-2026!'])->assertOk();
        self::assertSame('1', (string) app(Database::class)->one('SELECT COUNT(*) AS n FROM users')['n']);
    }

    public function test_schema_readiness_rollback_and_runtime_business_write_denial(): void
    {
        $db = app(Database::class);
        Schema::verify($db);
        try {
            $db->transaction(function () use ($db): void {
                $db->execute("INSERT INTO login_attempts(bucket,window_start,attempts) VALUES('rollback-test',1,1)");
                throw new \RuntimeException('synthetic rollback');
            });
        } catch (\RuntimeException $e) {
            self::assertSame('synthetic rollback', $e->getMessage());
        }
        self::assertNull($db->one("SELECT * FROM login_attempts WHERE bucket='rollback-test'"));
        try {
            $db->execute('UPDATE v1_control SET next_dc=next_dc+1 WHERE id=1');
            self::fail('Runtime must lack business UPDATE grants');
        } catch (\PDOException $e) {
            self::assertSame('42000', $e->getCode());
        }
        [$token, $csrf] = $this->login();
        $this->http('POST', 'simple-v1/documents', $token, $csrf, ['kind' => 'EXPENSE'], ['HTTP_IDEMPOTENCY_KEY' => '00000000-0000-0000-0000-000000000000'])->assertStatus(400)->assertJsonPath('error.code', 'INVALID_INPUT');
        $this->http('GET', 'users', $token)->assertForbidden()->assertJsonPath('error.code', 'LEGACY_DISABLED_IN_V1');
    }

    public function test_owner_database_and_remote_profiles_are_rejected_before_connection(): void
    {
        config(['upms.database' => 'upms']);
        try {
            (new Database())->pdo();
            self::fail('Owner database accepted');
        } catch (ApiError $e) {
            self::assertSame('DATABASE_PROFILE_REJECTED', $e->apiCode);
        }
        config(['upms.database' => 'upms_test_php_1', 'upms.host' => '184.168.100.110']);
        $this->expectException(ApiError::class);
        (new Database())->pdo();
    }

    public function test_hashing_capacity_is_bounded_across_workers(): void
    {
        $keys = [];
        foreach ([0, 1] as $slot) {
            $key = 'upms-hash-'.substr(hash('sha256', config('upms.database')), 0, 40).'-'.$slot;
            $q = $this->admin->prepare('SELECT GET_LOCK(?,0)');
            $q->execute([$key]);
            self::assertSame('1', (string) $q->fetchColumn());
            $keys[] = $key;
        }
        try {
            [$token, $csrf] = $this->anonymous();
            $this->http('POST', 'session/login', $token, $csrf, ['username' => 'php-admin', 'password' => 'Synthetic-Only-2026!'])->assertStatus(429)->assertJsonPath('error.code', 'BUSY');
        } finally {
            foreach ($keys as $key) {
                $q = $this->admin->prepare('SELECT RELEASE_LOCK(?)');
                $q->execute([$key]);
            }
        }
    }

    public function test_reconciliation_detects_the_same_corruptions_as_node(): void
    {
        $fixture = json_decode(file_get_contents(__DIR__.'/../../../tmp/php-runtime/contracts.json'), true);
        self::assertCount(6, $fixture['reconciliationCorruptions'] ?? [], 'Run scripts/php-reconciliation-contracts.mjs');
        [$token] = $this->login();
        foreach ($fixture['reconciliationCorruptions'] as $case) {
            self::assertContains($case['table'], ['v1_stock', 'v1_documents', 'v1_lines']);
            $apply = function ($values) use ($case): void {
                $sql = 'UPDATE `'.$case['table'].'` SET '.implode(',', array_map(fn ($k) => '`'.$k.'`=?', array_keys($values))).' WHERE `'.$case['key'].'`=?';
                $q = $this->admin->prepare($sql);
                $q->execute([...array_values($values), $case['id']]);
            };
            try {
                $apply($case['values']);
                $r = $this->http('GET', 'simple-v1/reconciliation', $token);
                $r->assertOk();
                self::assertSame($case['expected'], $r->json());
            } finally {
                $apply($case['restore']);
            }
        }
        $this->http('GET', 'simple-v1/reconciliation', $token)->assertJsonPath('matched', true);
    }

    public function test_read_endpoints_leave_all_business_tables_unchanged(): void
    {
        $db = app(Database::class);
        $snapshot = function () use ($db): array {
            $state = [];
            foreach (array_keys(Schema::TABLES) as $table) {
                if (str_starts_with($table, 'v1_')) {
                    $state[$table] = $db->rows('SELECT * FROM `'.$table.'`');
                }
            }
            return $state;
        };
        $before = $snapshot();
        [$token] = $this->login();
        foreach (['state', 'items', 'parties?kind=CLIENT', 'documents', 'overview', 'register', 'movements', 'ledgers/1', 'reconciliation'] as $path) {
            $this->http('GET', 'simple-v1/'.$path, $token)->assertOk();
        }
        self::assertSame($before, $snapshot());
    }
}
