<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class HostBoundary
{
    public static function allows(string $host, string $path, bool $secure): bool
    {
        if (!$secure) {
            return false;
        }
        if (strtolower($host) === 'unique-plastic.com') {
            return $path === '/api/v1/public/inquiries';
        }
        return strtolower($host) === 'app.unique-plastic.com' && ($path === '/api/v1/management' || str_starts_with($path, '/api/v1/management/'));
    }
    public function handle(Request $request, Closure $next): Response
    {
        if ((config('upms.enforce_host_boundary') || config('upms.production_profile')) && !self::allows((string)$request->server('HTTP_HOST'), $request->getPathInfo(), $request->isSecure())) {
            return new Response('', 404, ['Cache-Control' => 'no-store','X-Content-Type-Options' => 'nosniff']);
        }
        return $next($request);
    }
}
