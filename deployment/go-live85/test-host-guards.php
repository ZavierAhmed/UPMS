<?php

// Separate synthetic MariaDB acceptance on the actual hosting engine. No upms_v1 writes.
declare(strict_types=1);
if (PHP_SAPI !== 'cli' || PHP_OS_FAMILY !== 'Linux') {
    exit(1);
}umask(0077);
$s = '/home/tsn6az96j3v7/upms-php83-staging';
require $s.'/php84-release/private/backend/vendor/autoload.php';
require $s.'/php84-tools/support.php';
try {
    $db = 'upms_security85';
    $guard = 'upms_testguard85';
    $runtime = 'upms_testrun85';
    $secret = bin2hex(random_bytes(32));
    $pw = bin2hex(random_bytes(32));
    api('Mysql', 'create_database', ['name' => $db]);
    foreach ([$guard => $secret,$runtime => $pw] as $u => $p) {
        api('Mysql', 'create_user', ['name' => $u,'password' => $p]);
    }
    api('Mysql', 'set_privileges_on_database', ['user' => $guard,'database' => $db,'privileges' => 'SELECT,INSERT,UPDATE,DELETE,CREATE,TRIGGER']);
    api('Mysql', 'set_privileges_on_database', ['user' => $runtime,'database' => $db,'privileges' => 'SELECT,INSERT,UPDATE,DELETE']);
    privateJson($s.'/runtime/security85-fixture.json', ['schema' => $db,'guard' => $guard,'guardPassword' => $secret,'runtime' => $runtime,'runtimePassword' => $pw]);
    $options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES => false];
    $g = new PDO('mysql:unix_socket=/var/lib/mysql/mysql.sock;dbname='.$db.';charset=utf8mb4', $guard, $secret, $options);
    foreach (App\Upms\CleanInitialization::plan()['tables'] as $t) {
        $g->exec($t['sql']);
    }$g->exec(App\Upms\CleanInitialization::receiptDdl());
    // Seed only synthetic rows in this new isolated fixture, never actual administrator credentials.
    $g->exec("INSERT INTO identity_guard VALUES(1)");
    $g->exec("INSERT INTO v1_control(id,version,operator_id,state,next_dc,entry_version,next_item_code,cutover_evidence) VALUES(1,1,NULL,'PENDING',1,2,1,'Synthetic')");
    $g->exec("INSERT INTO upms_production_migrations VALUES(1,'synthetic85','synthetic','synthetic','BOUND','test')");
    $g->exec("INSERT INTO roles VALUES('administrator','Synthetic administrator')");
    $g->exec("INSERT INTO permissions VALUES('portal.access')");
    $g->exec("INSERT INTO role_permissions VALUES('administrator','portal.access')");
    $q = $g->prepare("INSERT INTO users(login_key,display_name,password_hash,enabled,authorization_version,created_at,updated_at) VALUES(?,?,?,1,1,UTC_TIMESTAMP(6),UTC_TIMESTAMP(6))");
    $q->execute(['synthetic','Synthetic',password_hash(bin2hex(random_bytes(32)), PASSWORD_ARGON2ID)]);
    $g->exec("INSERT INTO user_roles VALUES(1,'administrator')");
    $g->exec("INSERT INTO v1_documents(id,kind,date,status,version,payload,actor_id,created_at) VALUES(1,'EXPENSE','2020-01-01','POSTED',1,'{}',1,UTC_TIMESTAMP(6))");
    $g->exec("INSERT INTO v1_items(id,code,description,quality,colour,packing,remarks,active,version) VALUES(1,'000001','Synthetic','A','Graphite','12','',1,1)");
    $g->exec("INSERT INTO v1_stock VALUES(1,0,0)");
    $g->exec("INSERT INTO identity_audit_events(actor_id,target_id,action,correlation,details,created_at) VALUES(NULL,NULL,'synthetic','synthetic','{}',UTC_TIMESTAMP(6))");
    $g->exec("INSERT INTO v1_audit(actor_id,action,reference,reason,created_at) VALUES(1,'synthetic','1','Synthetic',UTC_TIMESTAMP(6))");
    $g->exec("INSERT INTO v1_commands VALUES('synthetic',1,'synthetic','{}')");
    $g->exec("INSERT INTO v1_lines(document_id,line_no,item_id,snapshot,quantity,rate,amount) VALUES(1,1,1,'{}',1,1,1)");
    $g->exec("INSERT INTO v1_stock_journal(document_id,item_id,delta) VALUES(1,1,1)");
    $g->exec("INSERT INTO v1_parties(id,kind,name,phone,address,remarks,active,version,opening_verified) VALUES(1,'CLIENT','Synthetic','','','',1,1,0)");
    $g->exec("INSERT INTO v1_party_journal(document_id,party_id,debit,credit,particulars) VALUES(1,1,1,0,'Synthetic')");
    $installed = App\Upms\CrudGuards::install($g, $runtime);
    // Reduce the definer to SELECT+TRIGGER, the exact intended production definer privileges.
    api('Mysql', 'set_privileges_on_database', ['user' => $guard,'database' => $db,'privileges' => 'SELECT,TRIGGER']);
    $r = new PDO('mysql:unix_socket=/var/lib/mysql/mysql.sock;dbname='.$db.';charset=utf8mb4', $runtime, $pw, $options);
    $checks = 0;
    $deny = static function (string $sql) use ($r, &$checks) {
        $r->beginTransaction();
        try {
            $r->exec($sql);
            throw new RuntimeException('PROTECTED_WRITE_ACCEPTED');
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? null) !== 1644) {
                throw new RuntimeException('WRONG_DATABASE_DENIAL');
            }$checks++;
        } finally {
            if ($r->inTransaction()) {
                $r->rollBack();
            }
        }
    };
    foreach (['identity_guard','roles','permissions','user_roles','role_permissions','upms_production_migrations','users','v1_control','identity_audit_events','v1_audit','v1_commands','v1_lines','v1_stock_journal','v1_party_journal','v1_documents','v1_items','v1_stock','v1_parties'] as $t) {
        $deny('DELETE FROM `'.$t.'`');
    }
    foreach (['identity_guard' => 'id=id','roles' => 'name=name','permissions' => 'code=code','user_roles' => 'role_code=role_code','role_permissions' => 'permission_code=permission_code','upms_production_migrations' => 'state=state','identity_audit_events' => 'details=details','v1_audit' => 'reason=reason','v1_commands' => 'result=result','v1_lines' => 'quantity=quantity','v1_stock_journal' => 'delta=delta','v1_party_journal' => 'debit=debit','v1_documents' => 'payload=payload','v1_control' => "state='READY'",'users' => "enabled=0",'v1_items' => "code='000002'",'v1_parties' => "kind='VENDOR'",'v1_stock' => 'item_id=2'] as $t => $set) {
        $deny('UPDATE `'.$t.'` SET '.$set);
    }
    $deny('UPDATE v1_control SET next_dc=0');
    $deny('INSERT INTO roles VALUES(\'injected\',\'Injected\')');
    $r->beginTransaction();
    $r->exec('UPDATE v1_control SET next_dc=next_dc+1');
    $r->exec('UPDATE users SET authorization_version=authorization_version+1,updated_at=UTC_TIMESTAMP(6)');
    $r->exec("UPDATE v1_items SET description='Allowed'");
    $r->rollBack();
    $checks += 3;
    $report = ['passed' => true,'syntheticSchema' => $db,'checks' => $checks,'triggerCount' => $installed['triggers'],'definerPrivileges' => 'SELECT,TRIGGER','runtimePrivileges' => 'SELECT,INSERT,UPDATE,DELETE','productionWrites' => 0,'verifiedUtc' => gmdate('c')];
    privateJson($s.'/runtime/security85-evidence.json', $report);
    echo json_encode($report, JSON_PRETTY_PRINT)."\n";
} catch (Throwable $e) {
    echo json_encode(['passed' => false,'code' => preg_match('/^[A-Z_]+$/D', $e->getMessage()) ? $e->getMessage() : 'SYNTHETIC_GUARD_CHECK_FAILED','stageSqlState' => $e instanceof PDOException ? $e->getCode() : null,'native' => $e instanceof PDOException ? ($e->errorInfo[1] ?? null) : null])."\n";
    exit(1);
}
