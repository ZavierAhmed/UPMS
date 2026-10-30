<?php

// Private isolated kernel fixture; refuses production and never returns credentials/cookies.
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux') {
    exit(1);
}umask(0077);
$s = '/home/tsn6az96j3v7/upms-php83-staging';
require $s.'/php84-release/private/backend/vendor/autoload.php';
require $s.'/php84-tools/support.php';
$phase = 'guard-reinstall';
$lastFailure = [];
try {
    $f = json_decode(file_get_contents($s.'/runtime/security85-fixture.json'), true, 32, JSON_THROW_ON_ERROR);
    if ($f['schema'] !== 'upms_security85') {
        throw new RuntimeException('SYNTHETIC_SCHEMA_REQUIRED');
    }
    $options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES => false];
    $dsn = 'mysql:unix_socket=/var/lib/mysql/mysql.sock;dbname=upms_security85;charset=utf8mb4';
    $g = new PDO($dsn, $f['guard'], $f['guardPassword'], $options);
    foreach (App\Upms\CrudGuards::plan($f['runtime']) as $name => $rule) {
        $g->exec('DROP TRIGGER `'.$name.'`');
    }
    App\Upms\CrudGuards::install($g, $f['runtime']);
    $r = new PDO($dsn, $f['runtime'], $f['runtimePassword'], $options);
    $r->exec("SET SESSION sql_mode='STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION', time_zone='+00:00'");
    $checks = 0;
    $events = [];
    $deny = static function ($sql, $label) use ($r, &$checks, &$events) {
        $r->beginTransaction();
        try {
            $r->exec($sql);
            throw new RuntimeException('PROTECTED_WRITE_ACCEPTED');
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? null) !== 1644) {
                throw new RuntimeException('WRONG_DATABASE_DENIAL');
            }$events[] = $label;
            $checks++;
        } finally {
            if ($r->inTransaction()) {
                $r->rollBack();
            }
        }
    };
    foreach (App\Upms\CrudGuards::plan($f['runtime']) as $name => $rule) {
        $t = $rule['table'];
        $event = $rule['event'];
        if ($event === 'DELETE') {
            $sql = 'DELETE FROM `'.$t.'`';
        } elseif ($event === 'INSERT') {
            $sql = 'INSERT INTO `'.$t.'` SELECT * FROM `'.$t.'` LIMIT 1';
        } else {
            $column = match($t) {
                'v1_control' => 'state','users' => 'enabled','v1_items' => 'code','v1_parties' => 'kind','v1_stock' => 'item_id',default => $g->query('SHOW COLUMNS FROM `'.$t.'`')->fetch(PDO::FETCH_ASSOC)['Field']
            };
            $value = match($t) {
                'v1_control' => "CASE WHEN state='READY' THEN 'PENDING' ELSE 'READY' END",'users' => '0','v1_items' => "'changed'",'v1_parties' => "'VENDOR'",'v1_stock' => '2',default => '`'.$column.'`'
            };
            $sql = 'UPDATE `'.$t.'` SET `'.$column.'`='.$value;
        }
        $phase = $name;
        $deny($sql, $name);
    }
    api('Mysql', 'set_privileges_on_database', ['user' => $f['guard'],'database' => $f['schema'],'privileges' => 'SELECT,INSERT,UPDATE,DELETE,TRIGGER']);
    $phase = 'synthetic-fixture';
    $g = new PDO($dsn, $f['guard'], $f['guardPassword'], $options);
    $password = bin2hex(random_bytes(24));
    $hash = password_hash($password, PASSWORD_ARGON2ID, ['memory_cost' => 19456,'time_cost' => 2,'threads' => 1]);
    $g->prepare('UPDATE users SET password_hash=? WHERE id=1')->execute([$hash]);
    foreach (App\Upms\CleanInitialization::plan()['permissions'] as $permission) {
        $g->prepare('INSERT IGNORE INTO permissions VALUES(?)')->execute([$permission]);
        $g->prepare("INSERT IGNORE INTO role_permissions VALUES('administrator',?)")->execute([$permission]);
    }
    $g->exec("UPDATE v1_control SET state='READY',operator_id=1,entry_version=2,next_item_code=GREATEST(next_item_code,1) WHERE id=1");
    $g->exec("INSERT INTO identity_audit_events(actor_id,target_id,action,correlation,details,created_at) VALUES(NULL,1,'administrator.bootstrap','synthetic85','{\"requirePasswordChange\":true}',UTC_TIMESTAMP(6))");
    api('Mysql', 'set_privileges_on_database', ['user' => $f['guard'],'database' => $f['schema'],'privileges' => 'SELECT,TRIGGER']);
    $phase = 'kernel';
    putenv('APP_ENV=testing');
    putenv('APP_DEBUG=false');
    $app = require $s.'/php84-release/private/backend/bootstrap/app.php';
    $kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
    $kernel->bootstrap();
    config(['app.key' => 'base64:'.base64_encode(random_bytes(32)),'upms.production_profile' => null,'upms.enabled' => true,'upms.database' => 'upms_security85','upms.origin' => 'https://app.unique-plastic.com','upms.enforce_host_boundary' => true,'upms.designated_operators' => null]);
    $db = new App\Upms\Database();
    (new ReflectionProperty($db, 'connection'))->setValue($db, $r);
    $app->instance(App\Upms\Database::class, $db);
    $cookies = [];
    $cookieChecks = 0;
    $csrf = '';
    $base = '/api/v1/management';
    $call = static function ($method, $path, $body = [], array $extra = []) use ($kernel, &$cookies, &$csrf, &$cookieChecks) {
        $headers = ['HTTPS' => 'on','HTTP_HOST' => 'app.unique-plastic.com','HTTP_ORIGIN' => 'https://app.unique-plastic.com','HTTP_ACCEPT' => 'application/json','CONTENT_TYPE' => 'application/json','HTTP_X_CSRF_TOKEN' => $csrf,'HTTP_IDEMPOTENCY_KEY' => Illuminate\Support\Str::uuid()->toString(),...$extra];
        $req = Illuminate\Http\Request::create('https://app.unique-plastic.com'.$path, $method, [], $cookies, [], $headers, $method === 'GET' ? null : json_encode((object)$body));
        $res = $kernel->handle($req);
        foreach ($res->headers->getCookies() as $cookie) {
            if (!$cookie->isSecure() || !$cookie->isHttpOnly() || $cookie->getSameSite() !== 'strict' || $cookie->getPath() !== '/' || $cookie->getDomain() !== null) {
                throw new RuntimeException('COOKIE_FLAGS_REJECTED');
            }
            $cookieChecks++;
            $cookies[$cookie->getName()] = $cookie->getValue();
        }$data = json_decode($res->getContent(), true);
        if (isset($data['csrfToken'])) {
            $csrf = $data['csrfToken'];
        }return [$res->getStatusCode(),$data];
    };
    $expect = static function ($result, $status, $code = null) use (&$checks, &$lastFailure) {
        if ($result[0] !== $status || ($code !== null && ($result[1]['error']['code'] ?? null) !== $code)) {
            $lastFailure = ['expectedStatus' => $status,'actualStatus' => $result[0],'actualCode' => $result[1]['error']['code'] ?? null,'fields' => array_keys($result[1]['error']['fieldErrors'] ?? [])];
            throw new RuntimeException('KERNEL_EXPECTATION_FAILED_'.$status.'_GOT_'.$result[0].'_'.($result[1]['error']['code'] ?? 'NONE').'_FIELDS_'.implode('_', array_keys($result[1]['error']['fieldErrors'] ?? [])));
        }$checks++;
    };
    $prefix = $base.'/simple-v1/';
    $expect($call('POST', $prefix.'items', []), 401, 'AUTH_REQUIRED');
    $expect($call('GET', $prefix.'state'), 401, 'AUTH_REQUIRED');
    $expect($call('GET', $base.'/session/csrf'), 200);
    $expect($call('POST', $base.'/session/login', ['username' => 'synthetic','password' => $password]), 200);
    $expect($call('POST', $prefix.'items', []), 403, 'PASSWORD_CHANGE_REQUIRED');
    $expect($call('POST', $prefix.'items', [], ['HTTP_X_CSRF_TOKEN' => 'invalid']), 403, 'CSRF_REJECTED');
    $expect($call('POST', $prefix.'items', [], ['HTTP_ORIGIN' => 'https://untrusted.invalid']), 403, 'ORIGIN_REJECTED');
    $new = bin2hex(random_bytes(24));
    $expect($call('POST', $base.'/profile/password', ['currentPassword' => $password,'newPassword' => $new]), 204);
    $expect($call('GET', $base.'/session/current'), 401);
    $cookies = [];
    $csrf = '';
    $expect($call('GET', $base.'/session/csrf'), 200);
    $expect($call('POST', $base.'/session/login', ['username' => 'synthetic','password' => $new]), 200);
    $before = [];
    foreach (App\Upms\CleanInitialization::BUSINESS as $table) {
        $before[$table] = $r->query('SELECT * FROM `'.$table.'`')->fetchAll(PDO::FETCH_ASSOC);
    }
    $expect($call('POST', $prefix.'documents/1/post', ['version' => 1]), 409, 'IMMUTABLE_DOCUMENT');
    $expect($call('POST', $prefix.'documents/1/cancel', ['version' => 1,'reason' => 'Synthetic denial']), 409, 'IMMUTABLE_OR_STALE_DOCUMENT');
    $expect($call('PATCH', $prefix.'items/1', ['description' => 'x','quality' => 'A','colour' => 'Graphite','packing' => '12','version' => 1,'code' => 'changed']), 400, 'ITEM_CODE_IMMUTABLE');
    $expect($call('POST', $prefix.'items', ['description' => 'x','quality' => 'A','colour' => 'Graphite','packing' => '12','state' => 'READY']), 400, 'INVALID_INPUT');
    $expect($call('DELETE', $prefix.'documents/1'), 404, 'NOT_FOUND');
    $expect($call('POST', $base.'/users', ['username' => 'intruder']), 403, 'LEGACY_DISABLED_IN_V1');
    foreach ($before as $table => $rows) {
        if ($rows !== $r->query('SELECT * FROM `'.$table.'`')->fetchAll(PDO::FETCH_ASSOC)) {
            throw new RuntimeException('NEGATIVE_TEST_CHANGED_BUSINESS_ROWS');
        }$checks++;
    }
    // Re-read authorization after a maintenance-only role change in the isolated schema.
    api('Mysql', 'set_privileges_on_database', ['user' => $f['guard'],'database' => $f['schema'],'privileges' => 'SELECT,INSERT,UPDATE,DELETE,TRIGGER']);
    $mg = new PDO($dsn, $f['guard'], $f['guardPassword'], $options);
    try {
        $mg->exec('DELETE FROM user_roles WHERE user_id=1');
        $expect($call('GET', $prefix.'state'), 403, 'ACCESS_DENIED');
        $mg->exec("INSERT IGNORE INTO roles VALUES('inventory','Synthetic inventory')");
        $mg->exec("INSERT IGNORE INTO role_permissions VALUES('inventory','portal.access')");
        $mg->exec("INSERT INTO user_roles VALUES(1,'inventory')");
        $expect($call('GET', $prefix.'state'), 403, 'V1_OPERATOR_ONLY');
    } finally {
        $mg->exec('DELETE FROM user_roles WHERE user_id=1');
        $mg->exec("INSERT INTO user_roles VALUES(1,'administrator')");
        api('Mysql', 'set_privileges_on_database', ['user' => $f['guard'],'database' => $f['schema'],'privileges' => 'SELECT,TRIGGER']);
        $mg = null;
    }
    // Positive business regressions exist ONLY in upms_security85, never upms_v1.
    $label = bin2hex(random_bytes(4));
    $phase = 'positive_item';
    $itemBody = ['description' => 'Synthetic '.$label,'quality' => 'A','colour' => 'Graphite','packing' => '12','sellingPrice' => '10.00'];
    $itemKey = Illuminate\Support\Str::uuid()->toString();
    $item = $call('POST', $prefix.'items', $itemBody, ['HTTP_IDEMPOTENCY_KEY' => $itemKey]);
    $expect($item, 201);
    $replay = $call('POST', $prefix.'items', $itemBody, ['HTTP_IDEMPOTENCY_KEY' => $itemKey]);
    $expect($replay, 201);
    if ($replay[1] !== $item[1]) {
        throw new RuntimeException('IDEMPOTENCY_REPLAY_CHANGED');
    }
    $expect($call('POST', $prefix.'items', [...$itemBody,'description' => 'Changed fingerprint'], ['HTTP_IDEMPOTENCY_KEY' => $itemKey]), 409, 'IDEMPOTENCY_CONFLICT');
    $phase = 'positive_party';
    $party = $call('POST', $prefix.'parties', ['kind' => 'CLIENT','name' => 'Synthetic '.$label]);
    $expect($party, 201);
    $itemId = $item[1]['id'];
    $partyId = $party[1]['id'];
    $post = static function (array $body) use ($call, $expect, $prefix, &$phase) {
        $phase = 'positive_'.$body['kind'].'_draft';
        $draft = $call('POST', $prefix.'documents', ['date' => '2020-01-01',...$body]);
        $expect($draft, 201);
        $phase = 'positive_'.$body['kind'].'_post';
        $posted = $call('POST', $prefix.'documents/'.$draft[1]['id'].'/post', ['version' => 1]);
        $expect($posted, 200);
        return $posted;
    };
    $post(['kind' => 'STOCK_OPENING','lines' => [['itemId' => $itemId,'quantity' => '5']]]);
    $post(['kind' => 'CLIENT_OPENING','partyId' => $partyId,'amount' => '0','direction' => 'OWED_TO_COMPANY']);
    $post(['kind' => 'CHALLAN','partyId' => $partyId,'lines' => [['itemId' => $itemId,'quantity' => '1','rate' => '10.00']]]);
    $post(['kind' => 'CLIENT_PAYMENT','partyId' => $partyId,'amount' => '1','method' => 'CASH']);
    $post(['kind' => 'EXPENSE','amount' => '1','category' => 'Synthetic','description' => 'Synthetic regression','payee' => 'Synthetic','reference' => $label,'paymentStatus' => 'PAID','method' => 'CASH']);
    $q = $r->prepare('SELECT quantity FROM v1_stock WHERE item_id=?');
    $q->execute([$itemId]);
    if ((string)$q->fetchColumn() !== '4') {
        throw new RuntimeException('SYNTHETIC_STOCK_REGRESSION');
    }$checks++;
    $q = $r->prepare('SELECT SUM(debit)-SUM(credit) FROM v1_party_journal WHERE party_id=?');
    $q->execute([$partyId]);
    if ((string)$q->fetchColumn() !== '9.00') {
        throw new RuntimeException('SYNTHETIC_LEDGER_REGRESSION');
    }$checks++;
    $expect($call('POST', $base.'/session/logout'), 204);
    $expect($call('GET', $base.'/session/current'), 401);
    $report = ['passed' => true,'checks' => $checks,'guardHash' => App\Upms\CrudGuards::hash(),'allGuardEventsExecuted' => count(array_unique($events)),'cookieFlagsVerified' => $cookieChecks > 0,'syntheticSchema' => $f['schema'],'kernel' => 'Laravel CLI HTTP kernel, not Apache','syntheticPositiveWorkflows' => ['stock-opening','client-opening','challan','client-payment','expense'],'productionWrites' => 0,'negativeApiBusinessChanges' => 0,'verifiedUtc' => gmdate('c')];
    $evidence = $s.'/runtime/security85-api-evidence-'.bin2hex(random_bytes(8)).'.json';
    privateJson($evidence, $report);
    copy($evidence, $s.'/runtime/security85-api-evidence.json');
    chmod($s.'/runtime/security85-api-evidence.json', 0600);
    echo json_encode($report, JSON_PRETTY_PRINT)."\n";
} catch (Throwable $e) {
    echo json_encode(['passed' => false,'phase' => $phase,'lastFailure' => $lastFailure,'code' => preg_match('/^[A-Z0-9_]+$/D', $e->getMessage()) ? $e->getMessage() : 'ISOLATED_SECURITY_TEST_FAILED','native' => $e instanceof PDOException ? ($e->errorInfo[1] ?? null) : null])."\n";
    exit(1);
}
