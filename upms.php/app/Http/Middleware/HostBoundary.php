<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class HostBoundary
{
    public static function allows(string $host, string $path, bool $secure, string $managementHost = 'app.unique-plastic.com'): bool
    {
        if (!$secure) {
            return false;
        }
        if (strtolower($host) === 'unique-plastic.com') {
            return $path === '/api/v1/public/inquiries';
        }
        return in_array($managementHost, ['app.unique-plastic.com','p43-app.unique-plastic.com'],true)
            && strtolower($host) === $managementHost && ($path === '/api/v1/management' || str_starts_with($path, '/api/v1/management/'));
    }
    public function handle(Request $request, Closure $next): Response
    {
        $host = 'app.unique-plastic.com';
        if ((string)$request->server('HTTP_HOST') === 'p43-app.unique-plastic.com' && config('upms.production_profile')) {
            $profile = \App\Upms\ProductionProfile::load(config('upms.production_profile'));
            if (($profile['origin']??'') === 'https://p43-app.unique-plastic.com') { $host = 'p43-app.unique-plastic.com'; }
        }
        if ((config('upms.enforce_host_boundary') || config('upms.production_profile')) && !self::allows((string)$request->server('HTTP_HOST'), $request->getPathInfo(), $request->isSecure(), $host)) {
            return new Response('', 404, ['Cache-Control' => 'no-store','X-Content-Type-Options' => 'nosniff']);
        }
        return $next($request);
    }
}
