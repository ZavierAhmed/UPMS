<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Upms\ApiError;
use App\Upms\ProductionConnection;
use App\Upms\ProductionProfile;
use App\Upms\MaintenanceApproval;
use App\Http\Middleware\HostBoundary;
use PHPUnit\Framework\TestCase;

final class ReadinessTest extends TestCase
{
    public function test_read_only_inspection_cannot_enable_runtime_or_maintenance(): void
    {
        $c = ['enabled' => true, 'mode' => 'read-only-transport-verification', 'readOnlyMetadataApproved' => true, 'hostingVerified' => false, 'backupRestoreVerified' => false,
            'privateRoot' => '/private', 'publicRoot' => '/public', 'managementRoot' => '/management', 'schema' => 'candidate', 'user' => 'inspection', 'account' => 'inspection@localhost', 'passwordFile' => '/private/password',
            'serverVersion' => '10.11.19-MariaDB', 'serverId' => '123', 'origin' => 'https://app.unique-plastic.com', 'reference' => 'synthetic_read_only', 'transport' => 'tls', 'host' => 'database.example.invalid', 'port' => 3306, 'caFile' => '/private/ca'];
        ProductionProfile::validate($c, 'read-only-transport-verification');
        $this->addToAssertionCount(1);
        foreach (['approved-production-runtime', 'one-time-production-maintenance', 'one-time-clean-initialization', 'reviewed-clean-activation'] as $mode) {
            try {
                ProductionProfile::validate($c, $mode);
                $this->fail('Read-only profile accepted as a write profile');
            } catch (ApiError $error) {
                $this->assertSame(503, $error->status);
            }
        }
    }
    public function test_transport_modes_never_fall_back_to_plaintext_tcp(): void
    {
        $tls = ['transport' => 'tls','host' => 'database.example.invalid','port' => 3306,'caFile' => '/private/ca'];
        $socket = ['transport' => 'unix_socket','socket' => '/var/lib/mysql/mysql.sock','socketOwnerUid' => '27','serverHostname' => 'host.example.invalid','localSocketVerified' => true];
        $this->assertSame('tls', ProductionConnection::transport($tls));
        $this->assertSame('unix_socket', ProductionConnection::transport($socket));
        foreach ([['transport' => 'tcp'],[...$tls,'host' => '127.0.0.1'],[...$tls,'caFile' => ''],[...$tls,'port' => '3306;dbname=other'],[...$tls,'socket' => '/tmp/mysql.sock'],[...$socket,'host' => 'localhost'],[...$socket,'port' => 3306],[...$socket,'caFile' => '/private/ca'],[...$socket,'localSocketVerified' => false],[...$socket,'socket' => '../mysql.sock'],[...$socket,'socketOwnerUid' => '']] as $bad) {
            try {
                ProductionConnection::transport($bad);
                $this->fail('Unsafe transport accepted');
            } catch (ApiError $e) {
                $this->assertSame(503, $e->status);
            }
        }
    }
    public function test_host_boundaries_reject_nested_public_access_and_foreign_hosts(): void
    {
        $this->assertTrue(HostBoundary::allows('app.unique-plastic.com', '/api/v1/management/session/csrf', true));
        $this->assertTrue(HostBoundary::allows('unique-plastic.com', '/api/v1/public/inquiries', true));
        foreach ([['unique-plastic.com','/dashboard/api/v1/management',true],['unique-plastic.com','/api/v1/management',true],['app.unique-plastic.com','/api/v1/public/inquiries',true],['evil.example','/api/v1/management',true],['app.unique-plastic.com:444','/api/v1/management',true],['app.unique-plastic.com','/api/v1/management',false]] as $input) {
            $this->assertFalse(HostBoundary::allows(...$input));
        }
    }
    public function test_approval_fingerprint_binds_transport_and_authenticated_target(): void
    {
        $c = ['schema' => 'candidate','account' => 'runtime@localhost','serverId' => '3','serverVersion' => '10.11.19-MariaDB','transport' => 'unix_socket','socket' => '/var/lib/mysql/mysql.sock','socketOwnerUid' => '27','serverHostname' => 'local'];
        $hash = MaintenanceApproval::targetHash($c);
        foreach (['schema','account','serverId','serverVersion','transport','socket','socketOwnerUid','serverHostname'] as $key) {
            $bad = $c;
            $bad[$key] .= 'different';
            $this->assertNotSame($hash, MaintenanceApproval::targetHash($bad));
        }
    }
}
