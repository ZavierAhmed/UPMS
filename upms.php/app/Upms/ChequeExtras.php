<?php
declare(strict_types=1);
namespace App\Upms;

/** Additive isolated UAT directory and encrypted evidence extension. */
final class ChequeExtras
{
    public const VERSION='uat2a-v1';
    public static function enabled(): bool { return \Illuminate\Container\Container::getInstance()->bound('config')&&(bool)config('upms.cheque_extras_enabled',false); }
    public static function plan(): array
    {
        return [
            'cheque_extra_receipts'=>"CREATE TABLE cheque_extra_receipts (id tinyint unsigned NOT NULL,version varchar(32) NOT NULL,plan_hash char(64) NOT NULL,created_at datetime(6) NOT NULL,PRIMARY KEY(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            'cheque_bank_creations'=>"CREATE TABLE cheque_bank_creations (id bigint unsigned NOT NULL,code varchar(32) NOT NULL,name varchar(150) NOT NULL,description varchar(500) NOT NULL,actor_id bigint unsigned NOT NULL,created_at datetime(6) NOT NULL,PRIMARY KEY(id),UNIQUE KEY cq_new_bank_code(code),CONSTRAINT cq_new_bank_actor FOREIGN KEY(actor_id) REFERENCES users(id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
            'cheque_attachments'=>"CREATE TABLE cheque_attachments (id char(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,event_id bigint unsigned NOT NULL,cheque_id bigint unsigned NOT NULL,filename varchar(150) NOT NULL,mime varchar(32) NOT NULL,bytes int unsigned NOT NULL,sha256 char(64) NOT NULL,ciphertext longtext NOT NULL,actor_id bigint unsigned NOT NULL,created_at datetime(6) NOT NULL,PRIMARY KEY(id),KEY cq_attachment_event(event_id),CONSTRAINT cq_attachment_event FOREIGN KEY(event_id) REFERENCES cheque_events(id),CONSTRAINT cq_attachment_instrument FOREIGN KEY(cheque_id) REFERENCES cheque_instruments(id),CONSTRAINT cq_attachment_actor FOREIGN KEY(actor_id) REFERENCES users(id),CONSTRAINT cq_attachment_size CHECK(bytes>0 AND bytes<=262144)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
        ];
    }
    public static function hash(): string { return hash('sha256',BusinessCommand::json(self::plan())); }
    public static function runtimePrivileges(\PDO $pdo): void
    {
        $schema=(string)$pdo->query('SELECT DATABASE()')->fetchColumn();
        [$account,$host]=explode('@',(string)$pdo->query('SELECT CURRENT_USER()')->fetchColumn(),2);
        $grantee='`'.$account.'`@`'.$host.'`';
        $expected='GRANT SELECT, INSERT, UPDATE, DELETE ON `'.str_replace('_','\\_',$schema).'`.*';
        $scoped=false;
        // The authenticated connection's SHOW GRANTS also includes PUBLIC grants.
        foreach($pdo->query('SHOW GRANTS')->fetchAll(\PDO::FETCH_COLUMN) as $grant) {
            if(str_contains($grant,'WITH GRANT OPTION')) { throw new ApiError(503,'CHEQUE_RUNTIME_PRIVILEGES_REJECTED',entry:false); }
            [$head,$to]=array_pad(explode(' TO ',$grant,2),2,'');
            if($head==='GRANT USAGE ON *.*') { continue; }
            if($scoped||$head!==$expected||!str_starts_with($to,$grantee)) { throw new ApiError(503,'CHEQUE_RUNTIME_PRIVILEGES_REJECTED',entry:false); }
            $scoped=true;
        }
        if(!$scoped) { throw new ApiError(503,'CHEQUE_RUNTIME_PRIVILEGES_REJECTED',entry:false); }
    }
    public static function guards(string $runtime): array
    {
        $rules=[];
        foreach(array_keys(self::plan()) as $table) {
            foreach(['INSERT','UPDATE','DELETE'] as $event) {
                $bad='TRUE';
                if($event==='INSERT'&&$table==='cheque_bank_creations') { $bad="NEW.code NOT REGEXP '^[A-Z0-9][A-Z0-9_-]{1,31}$' OR CHAR_LENGTH(TRIM(NEW.name))<2 OR NOT EXISTS(SELECT 1 FROM users u JOIN user_roles ur ON ur.user_id=u.id WHERE u.id=NEW.actor_id AND u.enabled=1 AND ur.role_code='administrator')"; }
                if($event==='INSERT'&&$table==='cheque_attachments') { $bad="NEW.id NOT REGEXP '^[a-f0-9]{32}$' OR NEW.sha256 NOT REGEXP '^[a-f0-9]{64}$' OR NEW.bytes>262144 OR NEW.bytes=0 OR NEW.mime NOT IN('application/pdf','image/jpeg','image/png') OR NOT EXISTS(SELECT 1 FROM cheque_events e WHERE e.id=NEW.event_id AND e.cheque_id=NEW.cheque_id AND e.actor_id=NEW.actor_id AND e.type IN('RECEIVED','DEPOSITED','CLEARED')) OR EXISTS(SELECT 1 FROM cheque_audit a WHERE a.event_id=NEW.event_id) OR (SELECT COUNT(*) FROM cheque_attachments a WHERE a.event_id=NEW.event_id)>=2"; }
                $rules['upmscqa_'.$table.'_'.strtolower($event)]=['table'=>$table,'event'=>$event,'body'=>"BEGIN IF SUBSTRING_INDEX(USER(),'@',1)='$runtime' AND ($bad) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='UPMS_CHEQUE_EXTRA_PROTECTED'; END IF; END"];
            }
        }
        return $rules;
    }
    public static function verify(\PDO $pdo): void
    {
        $receipt=$pdo->query('SELECT * FROM cheque_extra_receipts WHERE id=1')->fetch(\PDO::FETCH_ASSOC);
        if(!$receipt||$receipt['version']!==self::VERSION||$receipt['plan_hash']!==self::hash()) { throw new \RuntimeException('CHEQUE_EXTRA_SCHEMA_REJECTED'); }
        $expected=json_decode(file_get_contents(dirname(__DIR__,2).'/resources/cheque-extra-schema-hashes.json'),true,32,JSON_THROW_ON_ERROR);
        foreach(self::plan() as $table=>$ddl) {
            if(($expected[$table]??'')!==hash('sha256',CleanInitialization::normalize($pdo->query('SHOW CREATE TABLE `'.$table.'`')->fetch(\PDO::FETCH_NUM)[1]))) { throw new \RuntimeException('CHEQUE_EXTRA_DDL_REJECTED'); }
        }
    }
    public static function installIsolated(\PDO $pdo,string $runtime): array
    {
        MoneySchema::assertIsolated($pdo);
        if(!self::enabled()) { throw new \RuntimeException('CHEQUE_EXTRA_INSTALL_FLAG_REQUIRED'); }
        foreach(self::plan() as $ddl) { $pdo->exec($ddl); }
        $pdo->prepare('INSERT INTO cheque_extra_receipts VALUES(1,?,?,UTC_TIMESTAMP(6))')->execute([self::VERSION,self::hash()]);
        $pdo->exec('DROP TRIGGER upmscq_cheque_issuing_banks_insert');
        foreach(ChequeGuards::plan($runtime) as $name=>$rule) {
            if(str_starts_with($name,'upmscqa_')||$name==='upmscq_cheque_issuing_banks_insert') { $pdo->exec('CREATE TRIGGER `'.$name.'` BEFORE '.$rule['event'].' ON `'.$rule['table'].'` FOR EACH ROW '.$rule['body']); }
        }
        $hashes=[];foreach(self::plan() as $table=>$ddl) { $hashes[$table]=hash('sha256',CleanInitialization::normalize($pdo->query('SHOW CREATE TABLE `'.$table.'`')->fetch(\PDO::FETCH_NUM)[1])); }
        return $hashes;
    }
    public static function attachmentKey(): string
    {
        if (config('upms.production_profile')) {
            throw new ApiError(403,'CHEQUE_OPERATIONAL_ATTACHMENTS_DISABLED',entry:false);
        }
        $key=(string)config('app.key');
        if(str_starts_with($key,'base64:')) { $key=base64_decode(substr($key,7),true)?:''; }
        if(strlen($key)<32) { throw new ApiError(503,'CHEQUE_ATTACHMENT_KEY_REQUIRED',entry:false); }
        return sodium_crypto_generichash('UPMS cheque evidence '.self::VERSION.$key,'',32);
    }
    public static function files(mixed $files): array
    {
        if (config('upms.production_profile') && $files !== []) {
            throw new ApiError(403,'CHEQUE_OPERATIONAL_ATTACHMENTS_DISABLED',entry:false);
        }
        if(!is_array($files)||count($files)>2) { V1Input::field('attachments','Attach at most two PDF, JPEG or PNG files, each up to 256 KiB.'); }
        $validated=[];
        foreach($files as $file) {
            if(!is_object($file)||array_diff(array_keys(get_object_vars($file)),['filename','content'])||!is_string($file->filename??null)||!is_string($file->content??null)||strlen($file->content)>349528) { V1Input::field('attachments','Invalid attachment metadata or size.'); }
            $name=$file->filename;
            if($name===''||mb_strlen($name)>150||preg_match('/[\\\\\/\x00-\x1f\x7f]/u',$name)) { V1Input::field('attachments','Use a filename without paths or control characters.'); }
            $bytes=base64_decode($file->content,true);
            if($bytes===false||strlen($bytes)===0||strlen($bytes)>262144) { V1Input::field('attachments','Each attachment must contain at most 256 KiB.'); }
            $mime=(new \finfo(FILEINFO_MIME_TYPE))->buffer($bytes);
            $extension=strtolower(pathinfo($name,PATHINFO_EXTENSION));
            $types=['pdf'=>'application/pdf','jpg'=>'image/jpeg','jpeg'=>'image/jpeg','png'=>'image/png'];
            if(($types[$extension]??null)!==$mime||preg_match('/<\?php|<script|\/JavaScript|\/JS\b|\/Launch|\/EmbeddedFile|\/OpenAction|\/AA\b|\/RichMedia/i',$bytes)) { V1Input::field('attachments','Unsupported or potentially active attachment content.'); }
            if($mime==='application/pdf') {
                if(!str_starts_with($bytes,'%PDF-')||!preg_match('/%%EOF\s*$/D',$bytes)) { V1Input::field('attachments','Malformed PDF document.'); }
                self::inspectPdf($bytes);
            } else {
                $image=@getimagesizefromstring($bytes);
                if(!$image||$image[0]<1||$image[1]<1||$image[0]*$image[1]>20000000) { V1Input::field('attachments','Malformed image or excessive image dimensions.'); }
                if(($mime==='image/png'&&!str_ends_with($bytes,"\x00\x00\x00\x00IEND\xae\x42\x60\x82"))||($mime==='image/jpeg'&&!str_ends_with($bytes,"\xff\xd9"))) { V1Input::field('attachments','Incomplete image or unexpected trailing content.'); }
            }
            $validated[]=['id'=>bin2hex(random_bytes(16)),'filename'=>$name,'mime'=>$mime,'bytes'=>strlen($bytes),'sha256'=>hash('sha256',$bytes),'contentBytes'=>$bytes];
        }
        return $validated;
    }
    private static function inspectPdf(string $bytes): void
    {
        $parser=config('upms.cheque_attachment_pdfinfo');
        if(!is_string($parser)||!is_file($parser)||is_link($parser)) { V1Input::field('attachments','PDF inspection is unavailable. Choose a verified image or leave the optional attachment blank.'); }
        $process=proc_open([$parser,'-'],[0=>['pipe','r'],1=>['pipe','w'],2=>['pipe','w']],$pipes,null,null,['bypass_shell'=>true]);
        if(!is_resource($process)) { V1Input::field('attachments','PDF inspection could not start. No entry was posted.'); }
        $out='';$errors='';$exit=-1;
        try {
            if(fwrite($pipes[0],$bytes)!==strlen($bytes)) { V1Input::field('attachments','PDF inspection was interrupted.'); }
            fclose($pipes[0]);unset($pipes[0]);
            stream_set_blocking($pipes[1],false);stream_set_blocking($pipes[2],false);
            $deadline=microtime(true)+5;
            do {
                $out.=stream_get_contents($pipes[1],65536);$errors.=stream_get_contents($pipes[2],8192);
                $status=proc_get_status($process);
                if(!$status['running']) { $exit=$status['exitcode'];break; }
                if(microtime(true)>$deadline||strlen($out)>65536||strlen($errors)>8192) { proc_terminate($process);break; }
                usleep(10000);
            } while(true);
        } finally { foreach($pipes as $pipe) { if(is_resource($pipe)) { fclose($pipe); } }proc_close($process); }
        if($exit!==0||!preg_match('/^Pages:[ \t]+[1-9][0-9]*\r?$/m',$out)||preg_match('/Syntax Error|JavaScript:\s+yes|Encrypted:\s+yes/i',$out.' '.$errors)) { V1Input::field('attachments','The PDF is malformed, encrypted or contains unsupported active content.'); }
    }
    public static function decrypt(array $file): string
    {
        $encrypted=base64_decode($file['ciphertext'],true);
        if($encrypted===false||strlen($encrypted)<41) { throw new ApiError(503,'CHEQUE_ATTACHMENT_INTEGRITY_REQUIRED',entry:false); }
        $bytes=sodium_crypto_aead_xchacha20poly1305_ietf_decrypt(substr($encrypted,24),self::associatedData($file),substr($encrypted,0,24),self::attachmentKey());
        if($bytes===false||strlen($bytes)!==(int)$file['bytes']||!hash_equals($file['sha256'],hash('sha256',$bytes))) { throw new ApiError(503,'CHEQUE_ATTACHMENT_INTEGRITY_REQUIRED',entry:false); }
        return $bytes;
    }
    private static function associatedData(array $file): string
    {
        unset($file['ciphertext']);
        return 'UPMS-CHEQUE-EVIDENCE:'.self::VERSION.':'.Cheques::hash($file);
    }
    public static function seal(array $metadata,string $bytes): string
    {
        $nonce=random_bytes(SODIUM_CRYPTO_AEAD_XCHACHA20POLY1305_IETF_NPUBBYTES);
        return base64_encode($nonce.sodium_crypto_aead_xchacha20poly1305_ietf_encrypt($bytes,self::associatedData($metadata),$nonce,self::attachmentKey()));
    }
}
