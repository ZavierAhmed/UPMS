<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Http\Middleware\ManagementHeaders;
use Illuminate\Support\Facades\Route;
use Symfony\Component\Mime\Header\ParameterizedHeader;
use Tests\TestCase;

final class ReleaseSecurityTest extends TestCase
{
    public function test_management_headers_survive_success_rejection_and_framework_errors(): void
    {
        Route::get('/management/header-probe', fn () => response('synthetic'));
        Route::get('/management/error-probe', fn () => throw new \RuntimeException('synthetic failure'));
        foreach (['/management/header-probe' => 200, '/management/error-probe' => 503, '/api/v1/management/session/current' => 401, '/api/v1/management/nonexistent' => 401] as $path => $status) {
            $response = $this->get('https://localhost'.$path);
            // Authorization may reject before route selection; every response must retain policy.
            if (str_starts_with($path, '/management/')) {
                $response->assertStatus($status);
            }
            $response->assertHeader('Content-Security-Policy', ManagementHeaders::POLICY)
                ->assertHeader('X-Frame-Options', 'DENY')
                ->assertHeader('X-Content-Type-Options', 'nosniff');
            self::assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
            self::assertStringNotContainsString('unsafe-inline', $response->headers->get('Content-Security-Policy'));
        }
    }

    public function test_patched_mime_rejects_injected_parameter_names_and_accepts_normal_names(): void
    {
        $header = new ParameterizedHeader('Content-Disposition', 'attachment');
        $header->setParameter('filename', 'synthetic.txt');
        self::assertStringContainsString('synthetic.txt', $header->toString());
        foreach (["filename\r\nX-Injected: yes", 'bad name', 'bad;name', 'bad=name'] as $name) {
            try {
                $header->setParameter($name, 'value');
                self::fail('Invalid MIME parameter name was accepted');
            } catch (\InvalidArgumentException $error) {
                self::assertNotSame('', $error->getMessage());
            }
        }
    }
}
