<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Upms\ApiError;
use App\Upms\OperatorPolicy;
use App\Upms\ProductionProfile;
use PHPUnit\Framework\TestCase;

final class ProductionProfileTest extends TestCase
{
    private function profile(): array
    {
        return ['enabled' => true,'hostingVerified' => true,'backupRestoreVerified' => true,'mode' => 'approved-production-runtime','reference' => 'synthetic_review_only','privateRoot' => '/private','publicRoot' => '/public','managementRoot' => '/management','schema' => 'synthetic_candidate','host' => 'database.example.invalid','port' => 3306,'user' => 'runtime','account' => 'runtime@example.invalid','passwordFile' => '/private/password','caFile' => '/private/ca','serverVersion' => '10.11.19-MariaDB','serverId' => '123','origin' => 'https://app.unique-plastic.com','operators' => ['admin' => '1','haris' => '2']];
    }

    public function test_validation_requires_complete_explicit_target_before_connection(): void
    {
        ProductionProfile::validate($this->profile());
        $this->addToAssertionCount(1);
        foreach (['enabled' => false,'hostingVerified' => false,'backupRestoreVerified' => false,'mode' => 'testing','schema' => 'upms_test_php_fixture','host' => '127.0.0.1','port' => '3306;dbname=other','serverVersion' => '8.0-MySQL','serverId' => '','origin' => 'http://app.unique-plastic.com','reference' => 'x','operators' => ['admin' => '1','haris' => '1']] as $key => $value) {
            $c = $this->profile();
            $c[$key] = $value;
            try {
                ProductionProfile::validate($c);
                $this->fail('Unsafe profile accepted: '.$key);
            } catch (ApiError $error) {
                $this->assertSame(503, $error->status);
            }
        }
    }

    public function test_disabled_example_cannot_connect(): void
    {
        $this->expectException(ApiError::class);
        ProductionProfile::load(dirname(__DIR__, 3).'/deployment/production-profile.disabled.example.json');
    }

    public function test_private_profile_loads_only_its_own_secret_and_rejects_web_roots(): void
    {
        $base = sys_get_temp_dir().'/upms-private-profile-'.bin2hex(random_bytes(8));
        mkdir($base, 0700);
        foreach (['private', 'public', 'management'] as $dir) {
            mkdir($base.'/'.$dir, 0700);
        }
        $c = $this->profile();
        $c['privateRoot'] = $base.'/private';
        $c['publicRoot'] = $base.'/public';
        $c['managementRoot'] = $base.'/management';
        $c['passwordFile'] = $base.'/private/password';
        $c['caFile'] = $base.'/private/ca';
        $profile = $base.'/private/profile.json';
        try {
            file_put_contents($c['passwordFile'], "Synthetic-local-only-password\n");
            file_put_contents($c['caFile'], 'Synthetic placeholder, not a real CA');
            file_put_contents($profile, json_encode($c, JSON_THROW_ON_ERROR));
            foreach ([$profile, $c['passwordFile'], $c['caFile']] as $file) {
                chmod($file, 0600);
            }
            $loaded = ProductionProfile::load($profile);
            $this->assertSame('Synthetic-local-only-password', $loaded['password']);
            $this->assertSame('database.example.invalid', $loaded['host']);
            // A trusted config claiming its private root is also web-accessible fails closed.
            $c['publicRoot'] = $base.'/private';
            file_put_contents($profile, json_encode($c, JSON_THROW_ON_ERROR));
            $this->expectException(ApiError::class);
            ProductionProfile::load($profile);
        } finally {
            foreach ([$profile, $c['passwordFile'], $c['caFile']] as $file) {
                unlink($file);
            }
            foreach (['private', 'public', 'management'] as $dir) {
                rmdir($base.'/'.$dir);
            }
            rmdir($base);
        }
    }

    public function test_policy_preserves_legacy_and_rejects_scope_confusion(): void
    {
        $c = ['operator_id' => '1'];
        $p = ['schema' => 'fixture','users' => ['admin' => '1','haris' => '2']];
        $this->assertTrue(OperatorPolicy::permits(['id' => '1','username' => 'legacy'], $c, null, 'fixture'));
        foreach (['admin' => '1','haris' => '2'] as $name => $id) {
            $this->assertTrue(OperatorPolicy::permits(['id' => $id,'username' => $name], $c, $p, 'fixture'));
        }
        $this->assertFalse(OperatorPolicy::permits(['id' => '2','username' => 'renamed'], $c, $p, 'fixture'));
        $this->expectException(ApiError::class);
        OperatorPolicy::permits(['id' => '1','username' => 'admin'], $c, $p, 'other_schema');
    }
}
