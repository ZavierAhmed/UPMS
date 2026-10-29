<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class ManagementHeaders
{
    public const POLICY = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";

    public function handle(Request $request, Closure $next): Response
    {
        return self::apply($request, $next($request));
    }

    public static function apply(Request $request, Response $response): Response
    {
        if ($request->is('api/v1/management', 'api/v1/management/*', 'management', 'management/*')) {
            $response->headers->add([
                'Content-Security-Policy' => self::POLICY,
                'X-Frame-Options' => 'DENY',
                'X-Content-Type-Options' => 'nosniff',
                'Cache-Control' => 'no-store',
                'Referrer-Policy' => 'same-origin',
                'Permissions-Policy' => 'camera=(), microphone=(), geolocation=()',
                'X-Robots-Tag' => 'noindex, nofollow',
            ]);
        }

        return $response;
    }
}
