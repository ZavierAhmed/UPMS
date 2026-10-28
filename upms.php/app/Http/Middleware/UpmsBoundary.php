<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Upms\ApiError;
use App\Upms\Database;
use App\Upms\Identity;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Cookie;

final class UpmsBoundary
{
    public function handle(Request $request, Closure $next): mixed
    {
        $reference = (string) \Illuminate\Support\Str::uuid();
        try {
            // Never trust forwarded scheme headers; TLS must terminate at Apache in this layout.
            if (!$request->isSecure()) {
                throw new ApiError(400, 'HTTPS_REQUIRED');
            }
            $origin = config('upms.origin');
            if (!$origin || !preg_match('#^https://[a-z0-9.-]+(?::[0-9]+)?$#D', $origin) || $request->getSchemeAndHttpHost() !== $origin) {
                throw new ApiError(403, 'ORIGIN_REJECTED');
            }
            $unsafe = !in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true);
            if ($request->header('sec-fetch-site') === 'cross-site' || ($unsafe && $request->header('origin') !== $origin)) {
                throw new ApiError(403, 'ORIGIN_REJECTED');
            }
            if ($unsafe && strtolower(explode(';', $request->header('content-type', ''))[0]) !== 'application/json') {
                throw new ApiError(415, 'JSON_REQUIRED');
            }
            if (strlen($request->getContent()) > 12288) {
                throw new ApiError(413, 'REQUEST_TOO_LARGE');
            }
            if ($unsafe) {
                try {
                    $input = json_decode($request->getContent(), false, 512, JSON_THROW_ON_ERROR);
                    if (!is_object($input)) {
                        throw new \JsonException();
                    }
                } catch (\JsonException) {
                    throw new ApiError(400, 'INVALID_INPUT');
                }
            }
            $db = app(Database::class);
            $identity = app(Identity::class);
            $session = $identity->session($request->cookie(config('upms.cookie')));
            $request->attributes->set('upms.session', $session);
            $path = $request->path();
            $base = 'api/v1/management/';
            if (!in_array($path, [$base.'session/csrf', $base.'session/login'], true)) {
                $identity->read($session, 'portal.access', fn () => null);
            }
            if ($unsafe && (!$session || !hash_equals($identity->csrf($session), $request->header('x-csrf-token', '')))) {
                throw new ApiError(403, 'CSRF_REJECTED');
            }
            $response = $next($request);
            if ($session && !in_array($path, [$base.'session/login', $base.'session/logout', $base.'profile/password'], true)) {
                $db->transaction(fn () => $identity->touch($session));
                $response->headers->setCookie(self::cookie($request->cookie(config('upms.cookie'))));
            }
        } catch (\Throwable $error) {
            $response = \App\Upms\ErrorResponse::render($error, $request, $reference);
        }
        $response->headers->add(['Cache-Control' => 'no-store', 'X-Robots-Tag' => 'noindex, nofollow', 'Vary' => 'Cookie', 'X-Content-Type-Options' => 'nosniff']);
        return $response;
    }

    public static function cookie(string $token, bool $clear = false): Cookie
    {
        return Cookie::create(config('upms.cookie'), $clear ? '' : $token, $clear ? 1 : time() + 1800, '/', null, true, true, false, 'strict');
    }
}
