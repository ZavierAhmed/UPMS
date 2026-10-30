<?php

declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
function expectLive(array $r, int $status, ?string $code = null): void
{
    if ($r['status'] !== $status || ($code !== null && ($r['body']['error']['code'] ?? null) !== $code)) {
        throw new RuntimeException('LIVE_EXPECTATION_FAILED');
    }
}
function callLive(CurlHandle $h, string $method, string $path, array $body = [], string $csrf = '', array $extra = []): array
{
    $headers = ['Accept: application/json','Content-Type: application/json','Origin: https://app.unique-plastic.com','X-CSRF-Token: '.$csrf];
    foreach ($extra as $key => $value) {
        $headers = array_values(array_filter($headers, fn ($line) => !str_starts_with(strtolower($line), strtolower($key).':')));
        $headers[] = $key.': '.$value;
    }
    $responseHeaders = [];
    curl_setopt_array($h, [CURLOPT_URL => 'https://app.unique-plastic.com'.$path,CURLOPT_CUSTOMREQUEST => $method,CURLOPT_POSTFIELDS => $method === 'GET' ? null : json_encode((object)$body, JSON_THROW_ON_ERROR),CURLOPT_HTTPHEADER => $headers,CURLOPT_HEADERFUNCTION => static function ($ch, $line) use (&$responseHeaders) {
        $responseHeaders[] = trim($line);
        return strlen($line);
    }]);
    $raw = curl_exec($h);
    if ($raw === false) {
        throw new RuntimeException('VALIDATED_HTTPS_REQUEST_FAILED');
    }
    $status = curl_getinfo($h, CURLINFO_HTTP_CODE);
    $data = json_decode($raw, true);
    foreach ($responseHeaders as $line) {
        if (stripos($line, 'Set-Cookie: __Host-upms-php=') === 0) {
            $lower = strtolower($line);
            foreach (['; path=/','; secure','; httponly','; samesite=strict'] as $required) {
                if (!str_contains($lower, $required)) {
                    throw new RuntimeException('COOKIE_POLICY_FAILED');
                }
            }if (str_contains($lower, '; domain=')) {
                throw new RuntimeException('COOKIE_DOMAIN_REJECTED');
            }
        }
    }
    return ['status' => $status,'body' => $data,'headers' => $responseHeaders];
}
function newHandle(): CurlHandle
{
    $h = curl_init();
    curl_setopt_array($h, [CURLOPT_RETURNTRANSFER => true,CURLOPT_COOKIEFILE => '',CURLOPT_SSL_VERIFYPEER => true,CURLOPT_SSL_VERIFYHOST => 2,CURLOPT_FOLLOWLOCATION => false,CURLOPT_TIMEOUT => 25]);
    return $h;
}
function businessFingerprint(PDO $p): array
{
    $out = [];
    foreach (App\Upms\CleanInitialization::BUSINESS as $table) {
        $rows = $p->query('SELECT * FROM `'.$table.'`')->fetchAll(PDO::FETCH_ASSOC);
        $out[$table] = ['count' => count($rows),'sha256' => hash('sha256', json_encode($rows,JSON_THROW_ON_ERROR))];
    }return $out;
}
