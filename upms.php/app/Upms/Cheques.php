<?php
declare(strict_types=1);
namespace App\Upms;

/** Incoming custody only until an evidenced, complete-instrument bank clearance. */
final class Cheques
{
    public const STATES=['RECEIVED','DEPOSITED','CLEARED','DISHONOURED','RETURNED','CANCELLED'];
    public const CAPABILITIES=['RECEIVED'=>'receive','DEPOSITED'=>'deposit','CLEARED'=>'clear','DISHONOURED'=>'dishonour','RETURNED'=>'dispose','CANCELLED'=>'dispose'];
    public function __construct(private readonly Database $db) {}
    public static function hash(array $row): string { ksort($row);return hash('sha256',BusinessCommand::json(array_map(static fn($v)=>$v===null?null:(string)$v,$row))); }
    public static function permit(array $user,string $cap): void { if(!in_array('cheques.'.$cap,$user['permissions'],true)) { throw new ApiError(403,'CHEQUE_PERMISSION_REQUIRED'); } }
    private static function fields(object $input,array $required,array $optional=[]): array
    {
        $a=get_object_vars($input);
        if(array_diff(array_keys($a),[...$required,...$optional])||array_diff($required,array_keys($a))) { throw new ApiError(400,'CHEQUE_INPUT_INVALID'); }
        return $a;
    }
    private static function text(mixed $s,string $field,int $min=3,int $max=150): string
    {
        if(!is_string($s)||mb_strlen(V1Input::trim($s))<$min||mb_strlen(V1Input::trim($s))>$max||preg_match('/[\x00-\x1F\x7F]/u',$s)) { V1Input::field($field,'Enter a valid '.$field.'.'); }
        return V1Input::trim($s);
    }
    private static function id(mixed $id,string $field): string { if(!is_string($id)||!preg_match('/^[1-9][0-9]{0,19}$/D',$id)) { V1Input::field($field,'Select a valid record.'); }return $id; }
    private static function number(mixed $value): string
    {
        $number=self::text($value,'number',1,30);
        if(!preg_match('/^[0-9]{1,30}$/D',$number)||($number=ltrim($number,'0'))==='') { V1Input::field('number','Enter the nonzero numeric cheque number. Leading zeros are normalized.'); }
        return $number;
    }
    private static function account(mixed $value): string
    {
        $account=strtoupper(preg_replace('/[ -]/','',self::text($value,'drawerAccount',6,60)));
        if(!preg_match('/^[A-Z0-9]{6,34}$/D',$account)) { V1Input::field('drawerAccount','A full issuing-bank drawer account identity (6–34 letters/digits) is required.'); }
        return $account;
    }
    public function identity(array $query,array $user): array
    {
        self::permit($user,'receive');
        $a=self::fields((object)$query,['number','issuingBankId','drawerAccount']);
        $bank=self::id($a['issuingBankId'],'issuingBankId');
        if(!$this->db->one('SELECT id FROM cheque_issuing_banks WHERE id=?',[$bank])) { V1Input::field('issuingBankId','Select a registered issuing bank.'); }
        $record=$this->db->one('SELECT id FROM cheque_instruments WHERE issuing_bank_id=? AND drawer_account_key=? AND number=?',[$bank,self::account($a['drawerAccount']),self::number($a['number'])]);
        return ['available'=>$record===null,'existingId'=>$record&&in_array('cheques.view',$user['permissions'],true)?(string)$record['id']:null];
    }
    public static function referenceBase(string $number,string $clientName,string $amount): string
    {
        $name=strtoupper(preg_replace('/[^A-Za-z0-9]+/','-',V1Input::trim($clientName)));
        $name=trim($name,'-')?:'CLIENT';
        $money=str_replace('.','-',Exact::money(Exact::cents($amount)));
        $nameLimit=min(25,100-strlen($number)-strlen($money)-3-32);
        $name=rtrim(substr($name,0,$nameLimit),'-');
        return $number.'-'.$name.'-'.$money;
    }
    private static function date(mixed $s,string $field,bool $future=false): string
    {
        if(!is_string($s)||!preg_match('/^\d{4}-\d{2}-\d{2}$/D',$s)||!checkdate((int)substr($s,5,2),(int)substr($s,8,2),(int)substr($s,0,4))||(!$future&&$s>SimpleV1::today())) { V1Input::field($field,'Choose a valid date; future accounting events are not allowed.'); }return $s;
    }
    private function insert(string $table,array $r): string
    {
        if(!isset(ChequeSchema::plan()['tables'][$table])||!$this->db->pdo()->inTransaction()) { throw new \LogicException('CHEQUE_TRANSACTION_REQUIRED'); }
        $this->db->execute('INSERT INTO `'.$table.'` (`'.implode('`,`',array_keys($r)).'`) VALUES('.implode(',',array_fill(0,count($r),'?')).')',array_values($r));
        return (string)$this->db->pdo()->lastInsertId();
    }
    public function data(): array
    {
        $d=(new EmployeeHafta($this->db))->data();
        foreach(['v1_party_journal','money_movements','money_audit',...array_keys(ChequeSchema::plan()['tables']),...(ChequeExtras::enabled()?array_keys(ChequeExtras::plan()):[])] as $t) { $d[$t]=$this->db->rows('SELECT * FROM `'.$t.'`'); }return $d;
    }
    public function requireReconciled(): void
    {
        if(!ChequeReconciliation::run($this->data())['matched']||!(new Reconciliation($this->db))->run()['matched']||!(new MoneyAccounts($this->db))->reconciliation()['matched']) { throw new ApiError(409,'CHEQUE_RECONCILIATION_REQUIRED'); }
    }
    public function createBank(object $input,array $user): array
    {
        self::permit($user,'receive');
        if(!ChequeExtras::enabled()||!in_array('administrator',$user['roles'],true)) { throw new ApiError(403,'CHEQUE_PERMISSION_REQUIRED'); }
        $a=self::fields($input,['name','code'],['description']);
        $name=preg_replace('/\s+/u',' ',self::text($a['name'],'name',2));
        $code=strtoupper(preg_replace('/\s+/u','',self::text($a['code'],'code',2,32)));
        if(!preg_match('/^[A-Z0-9][A-Z0-9_-]{1,31}$/D',$code)) { V1Input::field('code','Use 2–32 letters, digits, hyphens or underscores.'); }
        if($this->db->one('SELECT id FROM cheque_issuing_banks WHERE code=? OR name=?',[$code,$name])) { throw new ApiError(409,'CHEQUE_BANK_DUPLICATE',publicMessage:'An issuing bank with this code or name already exists. Select the existing bank.'); }
        // Identity authorization serializes BusinessCommand on identity_guard.
        $id=(string)$this->db->one('SELECT COALESCE(MAX(id),0)+1 next_id FROM cheque_issuing_banks')['next_id'];
        $r=['id'=>$id,'code'=>$code,'name'=>$name,'description'=>self::text($a['description']??'','description',0,500),'actor_id'=>$user['id'],'created_at'=>BusinessCommand::timestamp()];
        $this->db->execute('INSERT INTO cheque_bank_creations(id,code,name,description,actor_id,created_at) VALUES(?,?,?,?,?,?)',array_values($r));
        $this->db->execute('INSERT INTO cheque_issuing_banks(id,code,name) VALUES(?,?,?)',[$id,$code,$name]);
        return ['chequeVersion'=>ChequeSchema::VERSION,'directoryVersion'=>ChequeExtras::VERSION,'id'=>$id,'eventId'=>'bank:'.$id,'bankHash'=>self::hash($r)];
    }
    public function receive(object $input,array $user): array
    {
        self::permit($user,'receive');$this->requireReconciled();
        $a=self::fields($input,['clientId','issuingBankId','drawerName','drawerAccount','number','chequeDate','receivedDate','amount'],['reference',...(ChequeExtras::enabled()?['attachments']:[])]);
        if(ChequeExtras::enabled()&&isset($a['reference'])) { V1Input::field('reference','The business reference is generated by the server during registration.'); }
        $files=ChequeExtras::enabled()?ChequeExtras::files($a['attachments']??[]):[];
        $number=self::number($a['number']);$account=self::account($a['drawerAccount']);
        $clientId=self::id($a['clientId'],'clientId');$bankId=self::id($a['issuingBankId'],'issuingBankId');
        $client=$this->db->one("SELECT * FROM v1_parties WHERE id=? AND kind='CLIENT' AND active=1",[$clientId]);
        if(!$client||!$this->db->one('SELECT id FROM cheque_issuing_banks WHERE id=?',[$bankId])) { throw new ApiError(400,'CHEQUE_CLIENT_OR_ISSUER_INVALID'); }
        $amount=Exact::money(Exact::cents(self::text($a['amount'],'amount',1,20)));
        // Existing integrations may retain explicit references. New forms omit this field.
        $reference=isset($a['reference'])?strtoupper(self::text($a['reference'],'reference',3,100)):self::referenceBase($number,$client['name'],$amount).'-'.strtoupper(bin2hex(random_bytes(16)));
        if(!preg_match('/^[A-Z0-9][A-Z0-9_-]{2,99}$/D',$reference)) { V1Input::field('reference','Use letters, digits, hyphens or underscores.'); }
        if($this->db->one('SELECT id FROM cheque_instruments WHERE reference=? OR (issuing_bank_id=? AND drawer_account_key=? AND number=?)',[$reference,$bankId,$account,$number])) { throw new ApiError(409,'CHEQUE_DUPLICATE_INSTRUMENT'); }
        foreach($this->db->rows("SELECT * FROM v1_documents WHERE kind='CLIENT_PAYMENT' AND status='POSTED'") as $d) {
            $p=SimpleV1::payload($d);
            if(($p['method']??'')==='CHEQUE_RECEIVED') {
                foreach([$p['reference']??'',$p['chequeReference']??''] as $old) {
                    preg_match_all('/[0-9]+/',$old,$tokens);
                    if(strtoupper(V1Input::trim($old))===$reference||in_array($number,array_map(static fn($n)=>ltrim($n,'0'),$tokens[0]),true)) { throw new ApiError(409,'CHEQUE_LEGACY_COLLISION_REVIEW_REQUIRED'); }
                }
                if(!preg_match('/[0-9]/',$p['chequeReference']??'')) { throw new ApiError(409,'CHEQUE_LEGACY_IDENTITY_REVIEW_REQUIRED',publicMessage:'A legacy instrument has no usable numeric identity. Keep its original accounting; a separately reviewed identity resolution is required before registering new instruments.'); }
            }
        }
        if($this->db->one("SELECT id FROM money_batches WHERE source_type='EXTERNAL' AND source_key=?",[MoneyAccounts::sourceKey($reference)])) { throw new ApiError(409,'CHEQUE_EXTERNAL_SOURCE_CONFLICT'); }
        if($this->db->one("SELECT id FROM v1_documents WHERE status='POSTED' AND (official_number=? OR JSON_UNQUOTE(JSON_EXTRACT(payload,'$.reference'))=?)",[$reference,$reference])) { throw new ApiError(409,'CHEQUE_EXISTING_FINANCIAL_REFERENCE'); }
        $r=['reference'=>$reference,'client_id'=>$clientId,'client_snapshot'=>BusinessCommand::json(['id'=>$clientId,'name'=>$client['name'],'address'=>$client['address'],'version'=>$client['version']]),'issuing_bank_id'=>$bankId,'drawer_name'=>self::text($a['drawerName'],'drawerName',2),'drawer_account_key'=>$account,'number'=>$number,'cheque_date'=>self::date($a['chequeDate'],'chequeDate',true),'received_date'=>self::date($a['receivedDate'],'receivedDate'),'amount'=>Exact::money(Exact::cents(self::text($a['amount'],'amount',1,20))),'actor_id'=>$user['id'],'created_at'=>BusinessCommand::timestamp()];
        $id=$this->insert('cheque_instruments',$r);
        return $this->event($this->instrument($id),null,'RECEIVED',['date'=>$r['received_date'],'reference'=>$reference,'reason'=>'Instrument received in custody; no financial recognition','evidence'=>'','selfApprovalReason'=>'','files'=>$files],$user);
    }
    public function instrument(string $id): array { return $this->db->one('SELECT * FROM cheque_instruments WHERE id=?',[$id])??throw new ApiError(404,'CHEQUE_NOT_FOUND'); }
    private function latest(string $id): ?array { return $this->db->one('SELECT * FROM cheque_events WHERE cheque_id=? ORDER BY ordinal DESC LIMIT 1',[$id]); }
    private function bank(string $id,string $date): void
    {
        if(!$this->db->one("SELECT a.id FROM money_accounts a JOIN money_batches b ON b.to_account_id=a.id AND b.kind='OPENING' WHERE a.id=? AND a.type='BANK' AND b.date<=?",[$id,$date])) { V1Input::field('bankId','Select a BANK with a verified opening covering this date.','CHEQUE_BANK_OPENING_REQUIRED'); }
    }
    public function clearanceReadiness(string $id,string $date,array $user): array
    {
        self::permit($user,'clear');
        $c=$this->instrument($id);$last=$this->latest($id);
        $bankId=(string)($last['bank_id']??'');
        $balance=Exact::money(Exact::cents((string)$this->db->one('SELECT COALESCE(SUM(debit-credit),0) balance FROM v1_party_journal WHERE party_id=?',[$c['client_id']])['balance'],signed:true,zero:true));
        $bank=$bankId!==''?$this->db->one('SELECT id,name FROM money_accounts WHERE id=?',[$bankId]):null;
        $opening=$bank!==null&&(bool)$this->db->one("SELECT id FROM money_batches WHERE to_account_id=? AND kind='OPENING' AND date<=?",[$bankId,$date]);
        $blocker=null;
        try {
            self::date($date,'date');
            $this->requireReconciled();
            if(!$last||$last['type']!=='DEPOSITED') { throw new ApiError(409,'CHEQUE_INVALID_TRANSITION'); }
            $this->validatePayment(['kind'=>'CLIENT_PAYMENT','chequeRecognitionVersion'=>ChequeSchema::VERSION,'chequeSource'=>['id'=>$id,'depositEventId'=>(string)$last['id']],'moneyAccountId'=>$bankId,'partyId'=>(string)$c['client_id'],'amount'=>$c['amount'],'reference'=>'UPMS-CHEQUE:'.$id,'method'=>'CHEQUE_CLEARED','date'=>$date]);
        } catch(ApiError $error) {
            $message=$error->publicMessage??match($error->apiCode) {
                'CHEQUE_CLIENT_OPENING_REQUIRED'=>'Verify an opening for the active customer covering this clearance date.',
                'CHEQUE_RECEIVABLE_INSUFFICIENT'=>'The customer receivable does not cover the complete cheque amount. Partial clearance and overpayment are unavailable.',
                'CHEQUE_BACKDATED_RECOGNITION'=>'Later customer or receiving-bank activity exists. This clearance would be backdated.',
                'CHEQUE_INVALID_TRANSITION'=>'Only a deposited cheque can be cleared.',
                'CHEQUE_RECONCILIATION_REQUIRED'=>'Financial reconciliation must pass before clearance.',
                default=>implode(' ',array_values($error->fieldErrors??[]))?:'Review the clearance date, verified openings and current bank and customer history.',
            };
            $blocker=['code'=>$error->apiCode,'message'=>$message,'fields'=>$error->fieldErrors];
        }
        return ['status'=>$last['type']??null,'chequeDate'=>$c['cheque_date'],'clearanceDate'=>$date,'bank'=>$bank,'bankOpeningVerified'=>$opening,'receivable'=>$balance,'amount'=>$c['amount'],'selfApprovalRequired'=>(bool)$this->db->one('SELECT id FROM cheque_events WHERE cheque_id=? AND actor_id=?',[$id,$user['id']]),'blocker'=>$blocker,'postingRevalidates'=>true];
    }
    public function transition(string $id,string $type,object $input,array $user,array $control,BusinessCommand $commands): array
    {
        if(!isset(self::CAPABILITIES[$type])||$type==='RECEIVED') { throw new ApiError(400,'CHEQUE_ACTION_INVALID'); }
        self::permit($user,self::CAPABILITIES[$type]);$this->requireReconciled();
        $a=self::fields($input,['date','reference','reason','evidence'],[...($type==='DEPOSITED'?['bankId']:($type==='CLEARED'?['approved','selfApprovalReason']:[])),...(ChequeExtras::enabled()&&in_array($type,['DEPOSITED','CLEARED'],true)?['attachments']:[])]);
        $a['files']=ChequeExtras::enabled()?ChequeExtras::files($a['attachments']??[]):[];
        $a['date']=self::date($a['date'],'date');$a['reference']=self::text($a['reference'],'reference');$a['reason']=self::text($a['reason'],'reason',10,500);$a['evidence']=self::text($a['evidence'],'evidence',10,1000);$a['selfApprovalReason']=isset($a['selfApprovalReason'])?self::text($a['selfApprovalReason'],'selfApprovalReason',0,500):'';
        $c=$this->instrument($id);$last=$this->latest($id);$allowed=['DEPOSITED'=>['RECEIVED'],'CLEARED'=>['DEPOSITED'],'DISHONOURED'=>['DEPOSITED'],'RETURNED'=>['RECEIVED','DEPOSITED','DISHONOURED'],'CANCELLED'=>['RECEIVED']];
        if(!$last||!in_array($last['type'],$allowed[$type],true)) { throw new ApiError(409,'CHEQUE_INVALID_TRANSITION'); }
        if($a['date']<$last['date']||$a['date']<$c['received_date']) { throw new ApiError(409,'CHEQUE_BACKDATED_EVENT'); }
        $a['bankId']=$type==='DEPOSITED'?self::id($a['bankId']??null,'bankId'):(in_array($type,['CLEARED','DISHONOURED'],true)?(string)$last['bank_id']:null);
        if($a['bankId']!==null) { $this->bank($a['bankId'],$a['date']); }
        $payment=null;
        if($type==='CLEARED') {
            if(($a['approved']??false)!==true) { V1Input::field('approved','Explicit bank clearance approval is required.'); }
            if($this->db->one('SELECT id FROM cheque_events WHERE cheque_id=? AND actor_id=?',[$id,$user['id']])&&(!in_array('administrator',$user['roles'],true)||mb_strlen($a['selfApprovalReason'])<10)) { throw new ApiError(403,'CHEQUE_SEPARATE_APPROVAL_REQUIRED'); }
            $source=['id'=>$id,'depositEventId'=>(string)$last['id']];
            $p=(object)['kind'=>'CLIENT_PAYMENT','date'=>$a['date'],'partyId'=>(string)$c['client_id'],'amount'=>$c['amount'],'method'=>'CHEQUE_CLEARED','moneyAccountId'=>$a['bankId'],'reference'=>'UPMS-CHEQUE:'.$id,'reason'=>'Bank-cleared cheque '.$c['reference'].'; '.$a['reason'],'remarks'=>'Cleared cheque '.$c['number']];
            $documents=new Documents($this->db,new BusinessRecords($this->db),$commands);
            $d=$documents->draft($user,$control,$p,null,$source);
            $payment=$documents->post($user,$control,(object)['version'=>1],$d['id'],true);
        }
        return $this->event($c,$last,$type,$a,$user,$payment);
    }
    public function validatePayment(array $p): void
    {
        ChequeSchema::ready($this->db);
        if(!MoneyDocuments::cheque($p)) { throw new ApiError(403,'CHEQUE_CANONICAL_SOURCE_REQUIRED'); }
        $c=$this->instrument(self::id($p['chequeSource']['id'],'chequeId'));$e=$this->latest((string)$c['id']);
        if(!$e||$e['type']!=='DEPOSITED'||(string)$e['id']!==$p['chequeSource']['depositEventId']||(string)$e['bank_id']!==$p['moneyAccountId']||(string)$c['client_id']!==$p['partyId']||$c['amount']!==Exact::money(Exact::cents($p['amount']))||$p['reference']!=='UPMS-CHEQUE:'.$c['id']) { throw new ApiError(409,'CHEQUE_SOURCE_MISMATCH'); }
        if($p['date']<$c['cheque_date']) {
            $dateLabel=(new \DateTimeImmutable($c['cheque_date']))->format('F j, Y');
            throw new ApiError(409,'CHEQUE_CLEARANCE_DATE_INVALID',fieldErrors:['date'=>'Clearance cannot be recorded before '.$dateLabel.'.'],publicMessage:'Cheque date is '.$dateLabel.'. Clearance cannot be recorded before this date. No clearance was committed.');
        }
        if($p['date']<$e['date']||$p['date']>SimpleV1::today()) { throw new ApiError(409,'CHEQUE_CLEARANCE_DATE_INVALID'); }
        $this->bank($p['moneyAccountId'],$p['date']);
        $opening=$this->db->one("SELECT id FROM v1_documents WHERE party_id=? AND kind='CLIENT_OPENING' AND status='POSTED' AND date<=?",[$c['client_id'],$p['date']]);
        $party=$this->db->one("SELECT id FROM v1_parties WHERE id=? AND kind='CLIENT' AND active=1",[$c['client_id']]);
        if(!$opening||!$party) { throw new ApiError(409,'CHEQUE_CLIENT_OPENING_REQUIRED'); }
        if($this->db->one("SELECT id FROM v1_documents WHERE party_id=? AND status='POSTED' AND date>?",[$c['client_id'],$p['date']])||$this->db->one('SELECT m.id FROM money_movements m JOIN money_batches b ON b.id=m.batch_id WHERE m.account_id=? AND b.date>?',[$p['moneyAccountId'],$p['date']])) { throw new ApiError(409,'CHEQUE_BACKDATED_RECOGNITION'); }
        $balance=Exact::cents((string)$this->db->one('SELECT COALESCE(SUM(debit-credit),0) balance FROM v1_party_journal WHERE party_id=?',[$c['client_id']])['balance'],signed:true,zero:true);
        if($balance->compareTo(Exact::cents($c['amount']))<0) { throw new ApiError(409,'CHEQUE_RECEIVABLE_INSUFFICIENT'); }
    }
    private function event(array $c,?array $last,string $type,array $a,array $user,?array $payment=null): array
    {
        $timestamp=BusinessCommand::timestamp();$bank=in_array($type,['DEPOSITED','CLEARED','DISHONOURED'],true)?$a['bankId']:null;
        $batch=$payment?$this->db->one("SELECT * FROM money_batches WHERE source_type='DOCUMENT' AND source_ref=?",['UPMS-DOC:'.$payment['id']]):null;
        $e=['cheque_id'=>(string)$c['id'],'ordinal'=>$last?(int)$last['ordinal']+1:1,'type'=>$type,'date'=>$a['date'],'bank_id'=>$bank,'reference'=>$a['reference'],'reason'=>$a['reason'],'evidence'=>$a['evidence'],'self_approval_reason'=>$a['selfApprovalReason'],'previous_hash'=>$last?$this->db->one('SELECT payload_hash FROM cheque_audit WHERE event_id=?',[$last['id']])['payload_hash']:str_repeat('0',64),'document_id'=>$payment['id']??null,'batch_id'=>$batch['id']??null,'actor_id'=>$user['id'],'created_at'=>$timestamp];
        $eventId=$this->insert('cheque_events',$e);$e=$this->db->one('SELECT * FROM cheque_events WHERE id=?',[$eventId]);$hash=hash('sha256',self::hash($c).self::hash($e));
        $attachmentHashes=[];
        foreach($a['files']??[] as $file) {
            $bytes=$file['contentBytes'];unset($file['contentBytes']);
            $record=[...$file,'event_id'=>$eventId,'cheque_id'=>(string)$c['id'],'actor_id'=>$user['id'],'created_at'=>$timestamp];
            $record['ciphertext']=ChequeExtras::seal($record,$bytes);sodium_memzero($bytes);
            $columns=array_keys($record);
            $this->db->execute('INSERT INTO cheque_attachments (`'.implode('`,`',$columns).'`) VALUES('.implode(',',array_fill(0,count($columns),'?')).')',array_values($record));
            $attachmentHashes[]=['id'=>$record['id'],'hash'=>self::hash($record)];
        }
        $this->insert('cheque_audit',['event_id'=>$eventId,'payload_hash'=>$hash,'actor_id'=>$user['id'],'created_at'=>$timestamp]);
        if($payment) {
            $doc=$this->db->one('SELECT * FROM v1_documents WHERE id=?',[$payment['id']]);$movement=$this->db->one('SELECT * FROM money_movements WHERE batch_id=?',[$batch['id']]);
            $this->insert('cheque_clearances',['cheque_id'=>(string)$c['id'],'event_id'=>$eventId,'document_id'=>$payment['id'],'batch_id'=>(string)$batch['id'],'movement_id'=>(string)$movement['id'],'instrument_hash'=>self::hash($c),'event_hash'=>$hash,'document_hash'=>self::hash($doc),'batch_hash'=>self::hash($batch),'movement_hash'=>self::hash($movement),'actor_id'=>$user['id'],'created_at'=>$timestamp]);
        }
        return ['chequeVersion'=>ChequeSchema::VERSION,'id'=>(string)$c['id'],'eventId'=>$eventId,'status'=>$type,'instrumentHash'=>self::hash($c),'eventHash'=>$hash,'payment'=>$payment,...($attachmentHashes?['attachments'=>$attachmentHashes]:[])];
    }
    public static function validReceipt(object $r,string $actor,array $data): bool
    {
        if(isset($r->directoryVersion)) {
            $keys=array_keys(get_object_vars($r));sort($keys);
            $rows=array_values(array_filter($data['cheque_bank_creations']??[],fn($b)=>(string)$b['id']===$r->id));
            return implode(',',$keys)==='bankHash,chequeVersion,directoryVersion,eventId,id'&&$r->directoryVersion===ChequeExtras::VERSION&&$r->chequeVersion===ChequeSchema::VERSION&&$r->eventId==='bank:'.$r->id&&count($rows)===1&&(string)$rows[0]['actor_id']===$actor&&self::hash($rows[0])===$r->bankHash;
        }
        $names=array_keys(get_object_vars($r));sort($names);
        $expected=isset($r->attachments)?'attachments,chequeVersion,eventHash,eventId,id,instrumentHash,payment,status':'chequeVersion,eventHash,eventId,id,instrumentHash,payment,status';
        if(implode(',',$names)!==$expected||$r->chequeVersion!==ChequeSchema::VERSION) { return false; }
        $find=static fn($t,$id)=>array_values(array_filter($data[$t]??[],fn($x)=>(string)$x['id']===$id));
        $cs=$find('cheque_instruments',$r->id);$es=$find('cheque_events',$r->eventId);
        if(count($cs)!==1||count($es)!==1) { return false; }$c=$cs[0];$e=$es[0];
        $files=array_values(array_filter($data['cheque_attachments']??[],fn($file)=>(string)$file['event_id']===$r->eventId));
        $claims=$r->attachments??[];
        if(!is_array($claims)||count($claims)!==count($files)||count($claims)>2) { return false; }
        foreach($files as $file) {
            $matches=array_values(array_filter($claims,static fn($claim)=>is_object($claim)&&($claim->id??null)===$file['id']&&($claim->hash??null)===self::hash($file)&&count(get_object_vars($claim))===2));
            if(count($matches)!==1) { return false; }
        }
        if((string)$e['cheque_id']!==$r->id||(string)$e['actor_id']!==$actor||$e['type']!==$r->status||self::hash($c)!==$r->instrumentHash||hash('sha256',self::hash($c).self::hash($e))!==$r->eventHash) { return false; }
        if($e['type']!=='CLEARED') { return $r->payment===null; }
        if(!is_object($r->payment)) { return false; }
        $ds=$find('v1_documents',(string)$e['document_id']);$bs=$find('money_batches',(string)$e['batch_id']);
        if(count($ds)!==1||count($bs)!==1) { return false; }$d=$ds[0];$b=$bs[0];
        $expected=(object)['moneyMovement'=>(object)MoneyAccounts::receipt($b),'id'=>(string)$d['id'],'status'=>'POSTED','official_number'=>$d['official_number'],'total'=>$d['total']];
        return BusinessCommand::canonical($expected)===BusinessCommand::canonical($r->payment)&&(string)$b['actor_id']===$actor;
    }
    public function report(array $query,array $user): array
    {
        self::permit($user,'view');$d=$this->data();$reconciliation=ChequeReconciliation::run($d);
        if(!$reconciliation['matched']) { throw new ApiError(409,'CHEQUE_RECONCILIATION_REQUIRED'); }
        $allowed=['id','from','to','clientId','number','reference','issuingBankId','bankId','status'];if(array_diff(array_keys($query),$allowed)) { throw new ApiError(400,'CHEQUE_FILTER_INVALID'); }
        foreach($query as $key=>$value) {
            if(!is_string($value)||strlen($value)>100) { throw new ApiError(400,'CHEQUE_FILTER_INVALID'); }
            if($value==='') { continue; }
            if(in_array($key,['id','clientId','issuingBankId','bankId'],true)) { self::id($value,$key); }
            if($key==='number'&&!preg_match('/^[0-9]{1,30}$/D',$value)) { V1Input::field('number','Search using a numeric cheque number.'); }
            if($key==='status'&&!in_array($value,self::STATES,true)) { V1Input::field('status','Choose a supported cheque state.'); }
        }
        foreach(['from','to'] as $key) { if(isset($query[$key])&&$query[$key]!=='') { self::date($query[$key],$key,true); } }
        if(isset($query['from'],$query['to'])&&$query['from']>$query['to']) { throw new ApiError(400,'CHEQUE_DATE_RANGE_INVALID'); }
        $rows=[];$totals=array_fill_keys(self::STATES,\Brick\Math\BigInteger::zero());
        foreach($d['cheque_instruments'] as $c) {
            $events=array_values(array_filter($d['cheque_events'],fn($e)=>(string)$e['cheque_id']===(string)$c['id']));usort($events,fn($a,$b)=>(int)$a['ordinal']<=>(int)$b['ordinal']);$latest=end($events);
            $deposits=array_values(array_filter($events,fn($e)=>$e['type']==='DEPOSITED'));
            $row=[...$c,'id'=>(string)$c['id'],'status'=>$latest['type'],'bank_id'=>$latest['bank_id']??($deposits[0]['bank_id']??null),'events'=>$events,'client'=>json_decode($c['client_snapshot'],true),'issuer'=>array_values(array_filter($d['cheque_issuing_banks'],fn($b)=>(string)$b['id']===(string)$c['issuing_bank_id']))[0],'paymentId'=>$latest['document_id'],'batchId'=>$latest['batch_id']];
            unset($row['drawer_account_key']);$row['drawer_account_masked']='••••'.substr($c['drawer_account_key'],-4);
            $row['attachments']=array_map(static function($file) { unset($file['ciphertext']);return $file; },array_values(array_filter($d['cheque_attachments']??[],fn($file)=>(string)$file['cheque_id']===(string)$c['id'])));
            $include=true;
            foreach(['id'=>'id','clientId'=>'client_id','issuingBankId'=>'issuing_bank_id','bankId'=>'bank_id','status'=>'status'] as $q=>$key) { if(($query[$q]??'')!==''&&(string)$row[$key]!==$query[$q]) { $include=false; } }
            if(($query['from']??'')!==''&&$c['received_date']<$query['from']||($query['to']??'')!==''&&$c['received_date']>$query['to']||($query['number']??'')!==''&&!str_contains($c['number'],ltrim($query['number'],'0'))) { $include=false; }
            if(($query['reference']??'')!==''&&!str_contains(strtoupper($c['reference']),strtoupper(V1Input::trim($query['reference'])))) { $include=false; }
            if($include) { $rows[]=$row;$totals[$row['status']]=$totals[$row['status']]->plus(Exact::cents($row['amount'])); }
        }
        $legacy=[];foreach($d['v1_documents'] as $doc) { $p=SimpleV1::payload($doc);if($doc['status']==='POSTED'&&$doc['kind']==='CLIENT_PAYMENT'&&($p['method']??'')==='CHEQUE_RECEIVED') { $legacy[]=['id'=>(string)$doc['id'],'number'=>$doc['official_number'],'date'=>$doc['date'],'amount'=>$doc['total'],'reference'=>$p['chequeReference']??'','policy'=>'Legacy receipt-recognized; read-only; no automatic bank credit']; } }
        return ['extrasEnabled'=>ChequeExtras::enabled(),'attachmentsEnabled'=>ChequeExtras::enabled()&&!config('upms.production_profile'),'policy'=>config('upms.production_profile')?'Clearance-only accounting — full bank clearance required':'Proposed isolated UAT policy — operational owner/accountant approval pending','records'=>$rows,'totals'=>array_map(Exact::money(...),$totals),'legacy'=>$legacy,'issuers'=>$d['cheque_issuing_banks'],'banks'=>array_values(array_filter($d['money_accounts'],fn($a)=>$a['type']==='BANK')),'clients'=>array_values(array_filter($d['v1_parties'],fn($p)=>$p['kind']==='CLIENT'&&$p['active'])),'reconciliation'=>$reconciliation];
    }
}
