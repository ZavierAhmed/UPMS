<?php

// Validated HTTPS only. No administrator credentials, database writes or SMTP submissions.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    exit(1);
}umask(0077);
$stage = '/home/tsn6az96j3v7/upms-php83-staging';
$release = $stage.'/php84-release';
$checks = [];
function request(string $url): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true,CURLOPT_HEADER => true,CURLOPT_TIMEOUT => 20,CURLOPT_SSL_VERIFYPEER => true,CURLOPT_SSL_VERIFYHOST => 2,CURLOPT_FOLLOWLOCATION => false]);
    $r = curl_exec($ch);
    if ($r === false) {
        throw new RuntimeException('VALIDATED_HTTP_FAILED');
    }$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    curl_close($ch);
    return [$code,substr($r, 0, $size),substr($r, $size)];
}
try {
    $assets = 0;
    foreach (['public' => 'https://unique-plastic.com','management' => 'https://app.unique-plastic.com'] as $tree => $origin) {
        [$status,$headers,$body] = request($origin.'/');
        $checks[$tree.'_page'] = $status === 200 && str_contains($body, 'Unique Plastic Industry') && str_contains($body, 'id="root"');
        $checks[$tree.'_nosniff'] = stripos($headers, 'x-content-type-options: nosniff') !== false;
        $checks[$tree.'_frame_denied'] = stripos($headers, 'x-frame-options: DENY') !== false;
        $checks[$tree.'_http_redirect'] = request(str_replace('https:', 'http:', $origin).'/')[0] === 307;
        if ($tree === 'management') {
            $checks['management_csp'] = stripos($headers, "frame-ancestors 'none'") !== false;
            $checks['management_no_store'] = stripos($headers, 'cache-control: no-store') !== false;
        }
        $html = file_get_contents($release.'/'.$tree.'/index.html');
        preg_match_all('~(?:src|href)="(/[^"<>]+\.(?:js|css))"~', $html, $matches);
        foreach ($matches[1] as $asset) {
            [$status,,$bytes] = request($origin.$asset);
            $source = $release.'/'.$tree.$asset;
            $checks[$tree.'_asset_'.basename($asset)] = $status === 200 && is_file($source) && hash_equals(hash_file('sha256', $source), hash('sha256', $bytes));
            $assets++;
        }
        foreach (['/.env','/vendor/autoload.php','/storage/logs/laravel.log','/composer.json','/scripts/provision-admins.php'] as $path) {
            $checks[$tree.'_private_'.$path] = in_array(request($origin.$path)[0], [403,404], true);
        }
    }
    $checks['public_management_blocked'] = in_array(request('https://unique-plastic.com/api/v1/management/session/csrf')[0], [403,404], true);
    $checks['management_public_blocked'] = in_array(request('https://app.unique-plastic.com/api/v1/public/inquiries')[0], [403,404], true);
    $checks['public_dashboard_blocked'] = in_array(request('https://unique-plastic.com/dashboard/')[0], [403,404], true);
    [$code,,$body] = request('https://app.unique-plastic.com/api/v1/management/session/csrf');
    $checks['runtime_disabled'] = $code === 503 && str_contains($body, 'DATABASE_PROFILE_REJECTED');
    $checks['private_backend_outside_web'] = !str_starts_with(realpath($release.'/private/backend'), realpath('/home/tsn6az96j3v7/public_html').'/');
    $checks['smtp_disabled'] = str_contains(file_get_contents($release.'/private/backend/.env'), "INQUIRY_MODE=Disabled\n");
    $report = ['passed' => !in_array(false, $checks, true),'checks' => $checks,'checkCount' => count($checks),'assetsVerified' => $assets,'httpsValidationBypassed' => false,'administratorPasswordsSent' => false,'smtpContacted' => false,'sessionAndCsrfPendingActivation' => true,'verifiedUtc' => gmdate('c')];
    file_put_contents($stage.'/runtime/hosted84-report.json', json_encode($report, JSON_PRETTY_PRINT));
    chmod($stage.'/runtime/hosted84-report.json', 0600);
    echo json_encode($report, JSON_PRETTY_PRINT)."\n";
    exit($report['passed'] ? 0 : 1);
} catch (Throwable $e) {
    echo json_encode(['passed' => false,'code' => preg_match('/^[A-Z_]+$/D',$e->getMessage()) ? $e->getMessage() : 'HOSTED_VERIFICATION_FAILED'])."\n";
    exit(1);
}
