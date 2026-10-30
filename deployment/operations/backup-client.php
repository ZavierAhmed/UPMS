<?php

// Internal stdin/stdout worker. Invoke through backup-offhost.ps1; never run keygen in a console.
declare(strict_types=1);
require __DIR__.'/../../upms.php/vendor/autoload.php';
function exactRead($f, int $n): string
{
    $s = '';
    while (strlen($s) < $n && !feof($f)) {
        $chunk = fread($f, $n - strlen($s));
        if ($chunk === false) {
            throw new RuntimeException('CIPHER_READ_FAILED');
        }$s .= $chunk;
    }if (strlen($s) !== $n) {
        throw new RuntimeException('TRUNCATED_BACKUP');
    }return $s;
}
try {
    $r = json_decode(stream_get_contents(STDIN), true, 32, JSON_THROW_ON_ERROR);
    if (($r['action'] ?? '') === 'keygen') {
        $kp = sodium_crypto_box_keypair();
        echo json_encode(['publicKey' => base64_encode(sodium_crypto_box_publickey($kp)),'keyPair' => base64_encode($kp)]);
        sodium_memzero($kp);
        exit;
    }
    if (!in_array($r['action'] ?? '', ['validate','restore-lines'], true)) {
        throw new RuntimeException('UNKNOWN_BACKUP_ACTION');
    }
    $kp = base64_decode($r['keyPair'], true);
    if ($kp === false || strlen($kp) !== SODIUM_CRYPTO_BOX_KEYPAIRBYTES) {
        throw new RuntimeException('PRIVATE_KEY_REJECTED');
    }
    $f = fopen($r['file'], 'rb');
    $line = fgets($f, 16384);
    $e = json_decode($line, true, 16, JSON_THROW_ON_ERROR);
    if (($e['format'] ?? '') !== 'UPMS_SECRETSTREAM_V1' || !hash_equals($e['recipientSha256'] ?? '', hash('sha256', sodium_crypto_box_publickey($kp)))) {
        throw new RuntimeException('BACKUP_ENVELOPE_REJECTED');
    }
    $key = sodium_crypto_box_seal_open(base64_decode($e['sealedKey'], true), $kp);
    sodium_memzero($kp);
    if ($key === false) {
        throw new RuntimeException('BACKUP_KEY_OPEN_FAILED');
    }$state = sodium_crypto_secretstream_xchacha20poly1305_init_pull(base64_decode($e['streamHeader'], true), $key);
    sodium_memzero($key);
    $digest = hash_init('sha256');
    $counts = [];
    $triggerCount = 0;
    $frames = 0;
    $meta = null;
    $final = false;
    while (!feof($f)) {
        $prefix = fread($f, 4);
        if ($prefix === '') {
            break;
        }if (strlen($prefix) !== 4) {
            throw new RuntimeException('TRUNCATED_FRAME');
        }$n = unpack('N', $prefix)[1];
        if ($n < 17 || $n > 16777264) {
            throw new RuntimeException('FRAME_LENGTH_REJECTED');
        }$plain = sodium_crypto_secretstream_xchacha20poly1305_pull($state, exactRead($f, $n), 'Unique Plastic Industry UPMS backup v1');
        if ($plain === false) {
            throw new RuntimeException('BACKUP_AUTHENTICATION_FAILED');
        }[$data,$tag] = $plain;
        $record = json_decode($data, true, 128, JSON_THROW_ON_ERROR);
        if (($record['type'] ?? '') === 'END') {
            if ($tag !== SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_TAG_FINAL || $record['counts'] !== $counts || !hash_equals($record['contentSha256'], hash_final($digest)) || $record['recordsBeforeFooter'] !== $frames) {
                throw new RuntimeException('BACKUP_FOOTER_REJECTED');
            }$final = true;
            if (fread($f, 1) !== '') {
                throw new RuntimeException('TRAILING_BACKUP_BYTES');
            }break;
        }
        if ($tag !== SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_TAG_MESSAGE) {
            throw new RuntimeException('UNEXPECTED_BACKUP_TAG');
        }hash_update($digest, $data."\n");
        $frames++;
        switch ($record['type'] ?? '') {
            case 'META':if ($meta !== null || $record['backupId'] !== $e['backupId'] || $record['schema'] !== 'upms_v1' || $record['guardHash'] !== App\Upms\CrudGuards::hash()) {
                throw new RuntimeException('BACKUP_METADATA_REJECTED');
            }$meta = $record;
                break;
            case 'TRIGGERS':$rules = App\Upms\CrudGuards::plan();
                foreach ($record['rows'] as $row) {
                    $rule = $rules[$row['TRIGGER_NAME']] ?? null;
                    if (!$rule || $row['EVENT_MANIPULATION'] !== $rule['event'] || $row['EVENT_OBJECT_TABLE'] !== $rule['table'] || $row['ACTION_STATEMENT'] !== $rule['body'] || $row['DEFINER'] !== App\Upms\CrudGuards::DEFINER) {
                        throw new RuntimeException('BACKED_UP_TRIGGER_REJECTED');
                    }unset($rules[$row['TRIGGER_NAME']]);
                    $triggerCount++;
                }if ($rules) {
                    throw new RuntimeException('INCOMPLETE_BACKED_UP_GUARDS');
                }break;
            case 'TABLE':$t = $record['table'];
                if (isset($counts[$t]) || (!isset(App\Upms\Schema::TABLES[$t]) && $t !== App\Upms\CleanInitialization::RECEIPT) || !str_starts_with($record['ddl'], 'CREATE TABLE `'.$t.'`')) {
                    throw new RuntimeException('BACKUP_SCHEMA_REJECTED');
                }$counts[$t] = 0;
                break;
            case 'ROW':$t = $record['table'];
                if (!array_key_exists($t, $counts) || !is_array($record['row'])) {
                    throw new RuntimeException('BACKUP_ROW_REJECTED');
                }$counts[$t]++;
                break;
            default:throw new RuntimeException('BACKUP_RECORD_TYPE_REJECTED');
        }
    }
    fclose($f);
    sodium_memzero($state);
    if (!$final || count($counts) !== 20 || $triggerCount !== 45 || $meta === null) {
        throw new RuntimeException('INCOMPLETE_BACKUP');
    }
    if ($r['action'] === 'restore-lines') {
        // Second pass only after complete authentication; plaintext goes directly to SSH stdin, never disk.
        $kp = base64_decode($r['keyPair'], true);
        $stream = fopen($r['file'], 'rb');
        $envelope = json_decode(fgets($stream, 16384), true, 16, JSON_THROW_ON_ERROR);
        $dek = sodium_crypto_box_seal_open(base64_decode($envelope['sealedKey'], true), $kp);
        sodium_memzero($kp);
        $pull = sodium_crypto_secretstream_xchacha20poly1305_init_pull(base64_decode($envelope['streamHeader'], true), $dek);
        sodium_memzero($dek);
        while (!feof($stream)) {
            $prefix = fread($stream, 4);
            if ($prefix === '') {
                break;
            }
            if (strlen($prefix) !== 4) {
                throw new RuntimeException('TRUNCATED_RESTORE_STREAM');
            }
            $length = unpack('N', $prefix)[1];
            if ($length < 17 || $length > 16777264) {
                throw new RuntimeException('RESTORE_FRAME_REJECTED');
            }
            $decoded = sodium_crypto_secretstream_xchacha20poly1305_pull($pull, exactRead($stream, $length), 'Unique Plastic Industry UPMS backup v1');
            if ($decoded === false) {
                throw new RuntimeException('RESTORE_STREAM_AUTHENTICATION_FAILED');
            }
            fwrite(STDOUT, $decoded[0]."\n");
            if ($decoded[1] === SODIUM_CRYPTO_SECRETSTREAM_XCHACHA20POLY1305_TAG_FINAL) {
                break;
            }
        }
        fclose($stream);
        sodium_memzero($pull);
        exit;
    }
    echo json_encode(['passed' => true,'backupId' => $e['backupId'],'tables' => 20,'triggers' => 45,'rowCounts' => $counts,'createdUtc' => $meta['createdUtc'],'finalTagVerified' => true,'plaintextWrittenToDisk' => false]);
} catch (Throwable $e) {
    echo json_encode(['passed' => false,'code' => preg_match('/^[A-Z_]+$/D', $e->getMessage()) ? $e->getMessage() : 'LOCAL_BACKUP_CRYPTO_FAILED','secretsPrinted' => false]);
    exit(1);
}
