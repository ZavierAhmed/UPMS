<?php

declare(strict_types=1);
// Manual private CLI only: TLS handshake/EHLO/QUIT, never AUTH/MAIL/RCPT/DATA.
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
$o = getopt('', ['host:','port:','mode:','ca:']);
$host = $o['host'] ?? '';
$port = $o['port'] ?? '';
$mode = $o['mode'] ?? '';
$socket = null;
try {
    if (filter_var($host, FILTER_VALIDATE_IP) || !preg_match('/^(?:[a-zA-Z0-9][a-zA-Z0-9-]*\.)+[a-zA-Z0-9-]+$/D', $host) || !ctype_digit($port) || !in_array((int)$port, [465,587], true) || !in_array($mode, ['implicit','starttls'], true) || ($mode === 'implicit') !== ((int)$port === 465)) {
        throw new RuntimeException('EXPLICIT_APPROVED_SMTP_TARGET_REQUIRED');
    }
    $ssl = ['verify_peer' => true,'verify_peer_name' => true,'allow_self_signed' => false,'peer_name' => $host,'SNI_enabled' => true,'crypto_method' => STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT];
    if (isset($o['ca'])) {
        if (!is_file($o['ca'])) {
            throw new RuntimeException('CA_FILE_UNAVAILABLE');
        }$ssl['cafile'] = $o['ca'];
    }
    $socket = @stream_socket_client(($mode === 'implicit' ? 'tls' : 'tcp').'://'.$host.':'.$port, $errno, $error, 3, STREAM_CLIENT_CONNECT, stream_context_create(['ssl' => $ssl]));
    if (!$socket) {
        throw new RuntimeException('CONNECT_OR_VERIFIED_TLS_FAILED');
    }stream_set_timeout($socket, 3);
    $reply = static function ($s) {
        $out = '';
        for ($i = 0;$i < 64;$i++) {
            $line = fgets($s, 1024);
            if ($line === false) {
                throw new RuntimeException('SMTP_TIMEOUT_OR_EOF');
            }$out .= $line;
            if (strlen($out) > 8192) {
                throw new RuntimeException('SMTP_REPLY_TOO_LARGE');
            }if (preg_match('/^[0-9]{3} /', $line)) {
                return $out;
            }
        }throw new RuntimeException('SMTP_REPLY_TOO_LARGE');
    };
    if (!preg_match('/^220[ -]/', $reply($socket))) {
        throw new RuntimeException('SMTP_GREETING_REJECTED');
    }
    if ($mode === 'starttls') {
        fwrite($socket, "EHLO probe.invalid\r\n");
        $cap = $reply($socket);
        if (!preg_match('/^250[ -]STARTTLS\b/im', $cap)) {
            throw new RuntimeException('STARTTLS_NOT_ADVERTISED');
        }fwrite($socket, "STARTTLS\r\n");
        if (!preg_match('/^220[ -]/', $reply($socket))) {
            throw new RuntimeException('STARTTLS_REJECTED');
        }if (@stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT) !== true) {
            throw new RuntimeException('VERIFIED_TLS_FAILED');
        }
    }
    $meta = stream_get_meta_data($socket);
    if (empty($meta['crypto']['protocol'])) {
        throw new RuntimeException('TLS_NOT_ESTABLISHED');
    }fwrite($socket, "QUIT\r\n");
    echo json_encode(['passed' => true,'tls' => $meta['crypto']['protocol'],'credentialsUsed' => false,'messagesSent' => 0,'inboxDeliveryVerified' => false], JSON_PRETTY_PRINT).PHP_EOL;
} catch (Throwable $e) {
    $code = preg_match('/^[A-Z_]+$/D', $e->getMessage()) ? $e->getMessage() : 'PROBE_FAILED';
    echo json_encode(['passed' => false,'code' => $code,'credentialsUsed' => false,'messagesSent' => 0]).PHP_EOL;
    exit(1);
} finally {
    if (is_resource($socket)) {
        fclose($socket);
    }
}
