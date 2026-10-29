<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Upms\CleanSqlImport;
use App\Upms\CleanInitialization;
use App\Upms\DiagnosticFailure;
use App\Upms\ApiError;
use PHPUnit\Framework\TestCase;

final class CleanSqlImportTest extends TestCase
{
    public function test_generator_preserves_plan_and_excludes_credentials_and_destructive_statements(): void
    {
        $sql = CleanSqlImport::sql();
        $this->assertSame('6c75b59659dca955a2c9c95e907f4979e7d7ba3fd58979d6d2210c1eb701a24a', CleanInitialization::hash());
        $this->assertSame($sql, CleanSqlImport::sql());
        $this->assertSame(hash('sha256', $sql), CleanSqlImport::digest());
        $this->assertSame(20, substr_count($sql, 'CREATE TABLE `'));
        $this->assertStringContainsString('BEGIN NOT ATOMIC', $sql);
        $this->assertStringContainsString('DECLARE EXIT HANDLER FOR SQLEXCEPTION', $sql);
        $this->assertStringContainsString('IMPORTED_NOT_ACTIVATED', $sql);
        $this->assertDoesNotMatchRegularExpression('/\b(?:DROP|TRUNCATE|DELETE|USE)\s+(?:DATABASE|TABLE|FROM|`|[a-z_])/i', preg_replace('/^--.*$/m', '', $sql));
        $this->assertDoesNotMatchRegularExpression('/INSERT INTO `(?:users|user_roles|v1_items|v1_parties|v1_documents|sessions|identity_audit_events)`/i', $sql);
        $this->assertStringNotContainsString('$argon2', $sql);
        $this->assertStringNotContainsString('upms_test_php_', $sql);
        $this->assertStringNotContainsString('IF NOT EXISTS', $sql);
    }
    public function test_diagnostic_redacts_database_exception_content(): void
    {
        foreach ([1045 => 'authentication',1044 => 'database_permissions',1049 => 'schema_selection',2002 => 'socket_connection',2026 => 'tls_verification',1142 => 'database_permissions',9999 => 'pdo_configuration'] as $native => $category) {
            $e = new \PDOException('PRIVATE_PASSWORD SECRET SQL /private/file');
            $e->errorInfo = ['HY000',$native,'PRIVATE_PASSWORD'];
            $result = DiagnosticFailure::describe($e, 'pdo_connect');
            $this->assertSame($category, $result['category']);
            $this->assertSame($native, $result['nativeError']);
            $this->assertStringNotContainsString('PRIVATE', json_encode($result));
        }
        $e = new \PDOException('SECRET');
        $e->errorInfo = ['IM001',0,'SECRET'];
        $this->assertSame('PDO_ATTRIBUTE_UNSUPPORTED', DiagnosticFailure::describe($e, 'pdo_transport')['code']);
        $this->assertSame('PDO_SESSION_CONFIGURATION_FAILED', DiagnosticFailure::describe(new \PDOException('SECRET'), 'session_configuration')['code']);
    }
    public function test_safe_pin_details_never_include_arbitrary_error_details(): void
    {
        $e = new ApiError(503, 'PRODUCTION_IDENTITY_REJECTED', details:['password' => 'SECRET','checks' => ['version' => false,'schema' => true,'account' => 'SECRET','serverId' => true]]);
        $r = DiagnosticFailure::describe($e, 'identity_validation');
        $this->assertSame(['version' => false,'schema' => true,'serverId' => true], $r['pinChecks']);
        $this->assertStringNotContainsString('SECRET', json_encode($r));
        $this->assertSame('socket_driver_mismatch', DiagnosticFailure::describe(new ApiError(503, 'LOCAL_SOCKET_TRANSPORT_REJECTED'), 'pdo_transport')['category']);
        $this->assertSame('secret_file', DiagnosticFailure::describe(new ApiError(503, 'PRODUCTION_PASSWORD_ENCODING_REJECTED'), 'profile_loading')['category']);
        $this->assertSame('DIAGNOSTIC_LIBRARY_UNAVAILABLE', DiagnosticFailure::describe(new \RuntimeException('SECRET'), 'library_loading')['code']);
    }
    public function test_package_requires_all_files_and_detects_tampering(): void
    {
        $source = dirname(__DIR__, 3).'/deployment/phpmyadmin';
        $dir = sys_get_temp_dir().'/upms-package-'.bin2hex(random_bytes(6));
        mkdir($dir, 0700);
        try {
            foreach (glob($source.'/*') as $file) {
                copy($file, $dir.'/'.basename($file));
            }
            $this->assertSame(CleanSqlImport::digest(), CleanSqlImport::package($dir)['sqlSha256']);
            $path = $dir.'/upms-production-clean-manifest.json';
            $manifest = json_decode(file_get_contents($path), true, 32, JSON_THROW_ON_ERROR);
            unset($manifest['files']['verify-clean-import.php']);
            file_put_contents($path, json_encode($manifest));
            try {
                CleanSqlImport::package($dir);
                $this->fail('Incomplete package accepted');
            } catch (\RuntimeException $e) {
                $this->assertSame('IMPORT_PACKAGE_FILE_SET_REJECTED', $e->getMessage());
            }
            copy($source.'/upms-production-clean-manifest.json', $path);
            file_put_contents($dir.'/upms-production-clean.sql', "\n-- tampered", FILE_APPEND);
            $this->expectExceptionMessage('IMPORT_PACKAGE_DIGEST_REJECTED');
            CleanSqlImport::package($dir);
        } finally {
            foreach (glob($dir.'/*') as $file) {
                unlink($file);
            }rmdir($dir);
        }
    }
}
