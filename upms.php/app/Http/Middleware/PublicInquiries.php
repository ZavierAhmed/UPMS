<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Upms\InquiryDelivery;
use App\Upms\InquiryInput;
use App\Upms\InquiryStore;
use Closure;
use Illuminate\Http\Request;

final class PublicInquiries
{
    public function handle(Request $r, Closure $next): mixed
    {
        $path = '/'.ltrim($r->getPathInfo(), '/');
        // Management retains its own origin/session/CSRF policy. Every other API
        // path uses the authoritative public API's case-insensitive 404 envelope.
        if (! preg_match('#^/api(?:/|$)#i', $path) || str_starts_with($path, '/api/v1/management')) {
            return $next($r);
        }
        $id = bin2hex(random_bytes(16));
        $reply = fn ($status, $body) => response()->json($body, $status)->withHeaders(['X-Correlation-ID' => $id, 'Cache-Control' => 'no-store', 'X-Content-Type-Options' => 'nosniff', 'X-Frame-Options' => 'DENY', 'Referrer-Policy' => 'strict-origin-when-cross-origin']);
        $error = fn ($status, $code, $message, $errors = null) => $reply($status, ['code' => $code, 'message' => $message, 'correlationId' => $id, 'errors' => $errors]);
        if (strtolower(preg_replace('#/$#', '', $path)) !== '/api/v1/public/inquiries' || $r->method() !== 'POST') {
            return $error(404, 'not_found', 'This API endpoint is not available.');
        }
        try {
            $c = config('inquiries');
            $expected = $c['origin'] ?: $r->getSchemeAndHttpHost();
            if (self::origin($expected) === null) {
                return $error(503, 'busy', 'Our inquiry service is busy. Please contact us directly or try later.');
            }
            // Public host cannot be used to reach private management. Likewise do
            // not accept inquiries on the configured private management host.
            $origin = $r->header('origin');
            if (($c['origin'] && self::origin($r->getSchemeAndHttpHost()) !== self::origin($expected)) || ($origin && self::origin($origin) !== self::origin($expected)) || $r->header('sec-fetch-site') === 'cross-site') {
                return $error(403, 'origin_not_allowed', 'This request must be sent from our website.');
            }
            if (trim(explode(';', $r->header('content-type', ''))[0]) !== 'application/json' || $r->headers->has('content-encoding')) {
                return $error(415, 'unsupported_content', 'Send the inquiry as JSON without content encoding.');
            }
            $tooLarge = fn () => $error(413, 'request_too_large', 'Your inquiry is too large. Please shorten the message.');
            if ((float) $r->header('content-length', '0') > 16384) {
                return $tooLarge();
            }
            $store = new InquiryStore($c['storage']);
            try {
                $retry = $store->rate($r->getClientIp() ?? '', $c['rate_limit']);
            } catch (\Throwable) {
                return $error(503, 'busy', 'Our inquiry service is busy. Please contact us directly or try later.');
            }
            if ($retry !== null) {
                $res = $error(429, 'rate_limited', 'Too many attempts. Please wait before trying again, or contact us by phone or email.');
                $res->headers->set('Retry-After', (string) $retry);

                return $res;
            }
            $key = $r->header('idempotency-key', '');
            if (! preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iD', $key) || $key === '00000000-0000-0000-0000-000000000000') {
                return $error(400, 'invalid_idempotency_key', 'A valid request key is required. Reload the page and try again.');
            }
            $raw = $r->getContent();
            if (strlen($raw) > 16384) {
                return $tooLarge();
            }
            try {
                // WHATWG TextDecoder strips one leading UTF-8 BOM, as in Express.
                $decoded = InquiryInput::decode(str_starts_with($raw, "\xEF\xBB\xBF") ? substr($raw, 3) : $raw);
                if ($decoded === null) {
                    return $error(400, 'invalid_json', 'An inquiry is required.');
                }
                $input = InquiryInput::normalize($decoded);
            } catch (\Throwable) {
                return $error(400, 'invalid_json', 'The inquiry could not be read. Please check the form and try again.');
            }
            if ($input['website'] !== '') {
                return $error(400, 'invalid_submission', 'This inquiry could not be accepted. Please contact us directly.');
            }
            $errors = InquiryInput::validate($input);
            if ($errors) {
                return $error(400, 'validation_failed', 'Please check the highlighted fields.', $errors);
            }
            try {
                $result = $store->submit(strtolower($key), $input, max(100, min(60000, $c['timeout_ms'])), fn ($ref) => (new InquiryDelivery)->send($c, $input, $ref));
            } catch (\Throwable) {
                return $error(503, 'busy', 'Our inquiry service is busy. Please contact us directly or try later.');
            }
            if (isset($result['error'])) {
                return $result['error'] === 'busy' ? $error(503, 'busy', 'Our inquiry service is busy. Please contact us directly or try later.') : $error(409, 'idempotency_conflict', 'This request key was used for different details. Please contact us if delivery is uncertain.');
            }
            $success = match ($result['outcome']) {
                'SmtpAccepted' => ['smtp_accepted', 'Your inquiry was accepted by our mail server for delivery to our team. Inbox receipt is not yet confirmed.'],
                'DevelopmentSaved' => ['development_saved', 'Development only: your inquiry was saved to the local outbox. No email was sent.'], default => null,
            };
            if ($success) {
                return $reply(200, ['status' => $success[0], 'message' => $success[1], 'reference' => $result['reference'], 'correlationId' => $id]);
            }

            return match ($result['outcome']) {
                'Unavailable' => $error(503, 'delivery_unavailable', 'Online inquiries are currently unavailable. Your inquiry has not been sent. Please call or email us.'),
                'Rejected' => $error(502, 'delivery_rejected', 'The mail service did not accept your inquiry. Please call or email us, or try again later.'),
                default => $error(503, 'delivery_unknown', 'Delivery could not be confirmed. Please contact us by phone or email with reference '.$result['reference'].' before submitting again.'),
            };
        } catch (\Throwable) {
            return $error(500, 'request_failed', 'We could not process the request. Please contact us by phone or email.');
        }
    }

    private static function origin(string $url): ?string
    {
        $p = parse_url($url);
        if (! $p || ! isset($p['scheme'], $p['host']) || ! in_array(strtolower($p['scheme']), ['https', 'http'], true)) {
            return null;
        }
        $scheme = strtolower($p['scheme']);
        $port = $p['port'] ?? ($scheme === 'https' ? 443 : 80);

        return $scheme.'://'.strtolower($p['host']).':'.$port;
    }
}
