<?php

// Shared read-only readiness checks. Never approves risks, enables runtime or changes credentials.
declare(strict_types=1);
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
function connect85(string $profile): array
{
    $c = App\Upms\ProductionProfile::load($profile, 'read-only-transport-verification');
    return [$c,App\Upms\ProductionConnection::connect($c)];
}
function runtime85(string $s): array
{
    $path = $s.'/runtime/runtime84.DISABLED.json';
    if (is_link($path) || (fileperms($path) & 0077)) {
        throw new RuntimeException('PRIVATE_RUNTIME_PROFILE_REQUIRED');
    }
    $c = json_decode(file_get_contents($path), true, 32, JSON_THROW_ON_ERROR);
    $c['enabled'] = true;
    $c['mode'] = 'read-only-transport-verification';
    $c['readOnlyMetadataApproved'] = true;
    $temp = $s.'/runtime/readiness85-'.bin2hex(random_bytes(8)).'.json';
    privateJson($temp, $c);
    try {
        return connect85($temp);
    } finally {
        unlink($temp);
    }
}
function release85(string $s): array
{
    $manifest = $s.'/php84-release/MANIFEST.json';
    if (!hash_equals('059da290b1b4c9f13732daa15b958bb0c5d6db78471d797f62e32bce9ecfb037', hash_file('sha256', $manifest))) {
        throw new RuntimeException('BASE_RELEASE_MANIFEST_REJECTED');
    }
    $base = json_decode(file_get_contents($manifest), true, 64, JSON_THROW_ON_ERROR);
    $patchPath = $s.'/php85-tools/PATCH85.json';
    $patch = json_decode(file_get_contents($patchPath), true, 64, JSON_THROW_ON_ERROR);
    $overrides = [];
    $count = 0;
    foreach ($patch['files'] as $row) {
        $file = $row['destination'];
        if (!str_starts_with($file, $s.'/') || str_contains($file, '/../') || is_link($file) || !is_file($file) || !hash_equals($row['sha256Lf'], hash('sha256', str_replace("\r\n", "\n", file_get_contents($file))))) {
            throw new RuntimeException('RELEASE_PATCH_REJECTED');
        }
        if (str_starts_with($file, $s.'/php84-release/')) {
            $overrides[substr($file, strlen($s.'/php84-release/'))] = true;
        }$count++;
    }
    foreach ($base['files'] as $row) {
        $name = $row['path'];
        if (isset($overrides[$name])) {
            continue;
        }$file = $s.'/php84-release/'.$name;
        if (is_link($file) || !is_file($file) || !hash_equals($row['sha256'], hash_file('sha256', $file))) {
            throw new RuntimeException('BASE_RELEASE_FILE_REJECTED');
        }$count++;
    }
    $published = 0;
    foreach (['public' => '/home/tsn6az96j3v7/public_html', 'management' => '/home/tsn6az96j3v7/public_html/dashboard'] as $tree => $webRoot) {
        $sourceRoot = $s.'/php84-release/'.$tree;
        $host = $tree === 'public' ? 'unique-plastic.com' : 'app.unique-plastic.com';
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($sourceRoot, FilesystemIterator::SKIP_DOTS)) as $f) {
            if (!$f->isFile()) {
                continue;
            }
            $relative = substr($f->getPathname(), strlen($sourceRoot) + 1);
            $bytes = file_get_contents($f->getPathname());
            if (in_array($relative, ['inquiry.php','gateway.php'], true)) {
                $old = $s.'/payload/release/private/backend';
                if (substr_count($bytes, $old) !== 1) {
                    throw new RuntimeException('GATEWAY_SOURCE_PREIMAGE_REJECTED');
                }
                $bytes = str_replace($old, $s.'/php84-release/private/backend', $bytes);
            }
            if ($relative === '.htaccess') {
                $prefix = "RewriteEngine On\nRewriteCond %{HTTP_HOST} ^".str_replace('.', '\\.', $host)."$ [NC]\nRewriteRule ^\\.well-known/acme-challenge/[A-Za-z0-9_-]+$ - [END]\nRewriteCond %{HTTP_HOST} ^".str_replace('.', '\\.', $host)."$ [NC]\nRewriteCond %{HTTPS} !=on\nRewriteRule ^ https://$host%{REQUEST_URI} [R=307,END]\n";
                $bytes = $prefix.$bytes;
            }
            $target = $webRoot.'/'.$relative;
            if (is_link($target) || !is_file($target) || !hash_equals(hash('sha256', str_replace("\r\n", "\n", $bytes)), hash('sha256', str_replace("\r\n", "\n", file_get_contents($target))))) {
                throw new RuntimeException('PUBLISHED_FILE_REJECTED');
            }
            $published++;
        }
    }
    return ['passed' => true,'filesVerified' => $count,'publishedFilesVerified' => $published,'patchSha256' => hash_file('sha256', $patchPath)];
}
function recovery85(string $s, PDO $source): array
{
    $e = json_decode(file_get_contents($s.'/runtime/recovery84-evidence.json'), true, 32, JSON_THROW_ON_ERROR);
    if (($e['verified'] ?? false) !== true || ($e['sourceSchema'] ?? '') !== 'upms_v1' || ($e['tables'] ?? 0) !== 20 || !str_starts_with($e['backupFile'], $s.'/runtime/') || !hash_equals($e['backupSha256'], hash_file('sha256', $e['backupFile']))) {
        throw new RuntimeException('GENUINE_RECOVERY_EVIDENCE_REQUIRED');
    }
    $snapshot = json_decode(file_get_contents($e['backupFile']), true, 128, JSON_THROW_ON_ERROR);
    $norm = static function ($rows) {
        $result = [];
        foreach ($rows as $row) {
            ksort($row);
            $result[] = json_encode(array_map(fn ($v) => $v === null ? null : (string)$v, $row), JSON_THROW_ON_ERROR);
        }sort($result);
        return $result;
    };
    foreach ($snapshot['tables'] as $t => $data) {
        if (!preg_match('/^[a-z0-9_]+$/D', $t) || $norm($data['rows']) !== $norm($source->query('SELECT * FROM `'.$t.'`')->fetchAll(PDO::FETCH_ASSOC))) {
            throw new RuntimeException('PRODUCTION_CHANGED_SINCE_VERIFIED_BACKUP');
        }
    }
    return ['passed' => true,'backupSha256' => $e['backupSha256'],'restoreReference' => $e['restoreReference'],'tables' => 20,'recoveryIncludesGuardRestoreProcedure' => true];
}
function readiness85(string $s): array
{
    [$c,$p] = runtime85($s);
    $grants = App\Upms\RuntimePrivileges::verify($p, $c, App\Upms\RuntimePrivileges::GODADDY);
    if (!$grants['passed']) {
        throw new RuntimeException('EXACT_CRUD_GRANTS_REQUIRED');
    }
    [$gc,$g] = connect85($s.'/runtime/guard85-profile.json');
    $guards = App\Upms\CrudGuards::verify($g);
    $guards['targetHash'] = App\Upms\CleanInitialization::target($g);
    $accounts = App\Upms\CleanSqlImport::accounts($p, $c['reference']);
    $receiptState = $p->query('SELECT state FROM upms_production_migrations WHERE id=1')->fetchColumn();
    $control = $p->query('SELECT state,operator_id,entry_version FROM v1_control WHERE id=1')->fetch(PDO::FETCH_ASSOC);
    if ($receiptState !== 'BOUND' || ($control['state'] ?? null) !== 'PENDING' || (string)($control['operator_id'] ?? '') !== '1' || (int)($control['entry_version'] ?? 0) !== 2) {
        throw new RuntimeException('BOUND_PENDING_BUSINESS_STATE_REQUIRED');
    }

    $recovery = recovery85($s, $p);
    $release = release85($s);
    $tests = json_decode(file_get_contents($s.'/runtime/security85-api-evidence.json'), true, 32, JSON_THROW_ON_ERROR);
    if (($tests['passed'] ?? false) !== true || ($tests['allGuardEventsExecuted'] ?? 0) !== 45 || ($tests['guardHash'] ?? '') !== App\Upms\CrudGuards::hash() || ($tests['cookieFlagsVerified'] ?? false) !== true || ($tests['syntheticPositiveWorkflows'] ?? []) !== ['stock-opening','client-opening','challan','client-payment','expense']) {
        throw new RuntimeException('NEGATIVE_SECURITY_TESTS_REQUIRED');
    }
    $checks = [];
    foreach (['unique-plastic.com','app.unique-plastic.com'] as $host) {
        $ch = curl_init('https://'.$host.'/');
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true,CURLOPT_TIMEOUT => 20,CURLOPT_SSL_VERIFYPEER => true,CURLOPT_SSL_VERIFYHOST => 2]);
        $body = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($body === false || $status !== 200) {
            throw new RuntimeException('TRUSTED_HOSTED_PAGE_REQUIRED');
        }$checks[$host] = true;
    }
    $hosted = json_decode(file_get_contents($s.'/runtime/hosted85-report.json'), true, 32, JSON_THROW_ON_ERROR);
    if (($hosted['passed'] ?? false) !== true || ($hosted['checkCount'] ?? 0) !== 30) {
        throw new RuntimeException('HOSTED_BOUNDARY_CHECKS_REQUIRED');
    }
    if (!str_contains(file_get_contents($s.'/php84-release/private/backend/.env'), "UPMS_ENABLED=false\n") || !str_contains(file_get_contents($s.'/php84-release/private/backend/.env'), "INQUIRY_MODE=Disabled\n")) {
        throw new RuntimeException('DISABLED_RUNTIME_AND_SMTP_REQUIRED');
    }
    $live = json_decode(file_get_contents($s.'/runtime/live85-probes.json'), true, 32, JSON_THROW_ON_ERROR);
    if (($live['passed'] ?? false) !== true || ($live['liveRejections'] ?? 0) !== 28 || ($live['guardHash'] ?? '') !== App\Upms\CrudGuards::hash()) {
        throw new RuntimeException('LIVE_PROTECTION_CHECKS_REQUIRED');
    }
    $stable = ['targetHash' => App\Upms\CleanInitialization::target($p),'reference' => $c['reference'],'riskDigest' => App\Upms\CrudRiskApproval::digest(),'guardHash' => App\Upms\CrudGuards::hash(),'releasePatchSha256' => $release['patchSha256'],'backupSha256' => $recovery['backupSha256']];
    return ['passed' => true,'readinessDigest' => hash('sha256', json_encode($stable, JSON_THROW_ON_ERROR)),'bindings' => $stable,'grants' => $grants,'guards' => $guards,'accounts' => $accounts,'recovery' => $recovery,'release' => $release,'https' => $checks,'negativeTests' => $tests,'hostedChecks' => 30,'liveProtection' => $live,'databaseReceiptState' => $receiptState,'businessControlState' => $control['state'],'productionState' => 'BOUND_PENDING_DISABLED','activationApproved' => false,'residualRisks' => App\Upms\CrudRiskApproval::RISKS,'verifiedUtc' => gmdate('c')];
}
