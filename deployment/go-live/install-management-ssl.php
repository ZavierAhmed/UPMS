<?php

// Install only a validated leaf/key pair for the management virtual host; stdin keeps key out of argv.
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux') {
    exit(1);
}umask(0077);
$root = '/home/tsn6az96j3v7/upms-php83-staging/acme84';
try {
    $chain = file_get_contents($root.'/signed-chain.crt');
    $key = file_get_contents($root.'/domain.key');
    preg_match_all('~-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----~s', $chain, $certs);
    if (count($certs[0]) < 2 || !openssl_x509_check_private_key($certs[0][0], $key)) {
        throw new RuntimeException('CERTIFICATE_KEY_MISMATCH');
    }
    $info = openssl_x509_parse($certs[0][0]);
    if (($info['subject']['CN'] ?? '') !== 'app.unique-plastic.com' || ($info['validTo_time_t'] ?? 0) < time() + 86400 * 14) {
        throw new RuntimeException('CERTIFICATE_TARGET_REJECTED');
    }
    if (str_contains(json_encode($info['issuer']), 'STAGING')) {
        throw new RuntimeException('STAGING_CERTIFICATE_REJECTED');
    }
    $p = proc_open(['/usr/bin/uapi','--output=json','--input=json','SSL','install_ssl'], [0 => ['pipe','r'],1 => ['pipe','w'],2 => ['pipe','w']], $pipes);
    fwrite($pipes[0], json_encode(['domain' => 'app.unique-plastic.com','cert' => $certs[0][0],'key' => $key,'cabundle' => implode("\n", array_slice($certs[0], 1))], JSON_THROW_ON_ERROR));
    fclose($pipes[0]);
    $out = stream_get_contents($pipes[1]);
    $err = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $rc = proc_close($p);
    $r = json_decode($out, true, 64, JSON_THROW_ON_ERROR)['result'] ?? [];
    if ($rc !== 0 || ($r['status'] ?? 0) !== 1) {
        throw new RuntimeException('CPANEL_CERTIFICATE_INSTALL_FAILED');
    }
    echo json_encode(['installed' => true,'domain' => 'app.unique-plastic.com','issuer' => $info['issuer']['CN'] ?? null,'expiresUtc' => gmdate('c', $info['validTo_time_t']),'privateKeyPrinted' => false])."\n";
} catch (Throwable $e) {
    echo json_encode(['installed' => false,'code' => preg_match('/^[A-Z_]+$/D', $e->getMessage()) ? $e->getMessage() : 'SSL_INSTALL_REVIEW_REQUIRED','privateKeyPrinted' => false])."\n";
    exit(1);
}
