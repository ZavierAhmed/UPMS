<?php

declare(strict_types=1);

namespace App\Upms;

use Brick\Math\BigInteger as N;

final class LaborExpenseAllocation
{
    public function __construct(private readonly Database $db) {}
    public static function source(string $id,array $data,?string $ignoreAllocation=null): array
    {
        $docs=array_column($data['v1_documents'],null,'id');$d=$docs[$id]??null;$p=$d?SimpleV1::payload($d):[];
        $block=static function($code,$message): never { throw new ApiError(409,$code,publicMessage:$message); };
        if (!$d||$d['kind']!=='EXPENSE'||$d['status']!=='POSTED') { $block('H1C_POSTED_EXPENSE_REQUIRED','Choose an existing posted expense. Drafts and other document types are not eligible.'); }
        if (($p['expenseMasterVersion']??'')!=='p32b2'||($p['expensePurpose']??'')!=='BUSINESS_EXPENSE'||empty($p['employeeSnapshot']['id'])||($p['employeeId']??'')!==$p['employeeSnapshot']['id']) { $block('H1C_RETAINED_EMPLOYEE_REQUIRED','This expense has no supported retained employee identity. No legacy employee or payment purpose is inferred.'); }
        if (!ExpenseMasters::documents([$d],$data['expense_master_audit'])['matched']) { $block('H1C_SOURCE_SNAPSHOT_INVALID','Original expense category/employee snapshot evidence is inconsistent.'); }
        if (($p['moneyIntegrationVersion']??'')!==MoneyDocuments::VERSION||!in_array($p['method']??'',['CASH','BANK_TRANSFER'],true)) { $block('H1C_CANONICAL_MONEY_REQUIRED','This source has no supported canonical cash/bank evidence; historical/free-text payments cannot be allocated by inference.'); }
        $batches=array_values(array_filter($data['money_batches'],fn($b)=>$b['source_type']==='DOCUMENT'&&$b['source_ref']==='UPMS-DOC:'.$id));
        if (count($batches)!==1) { $block('H1C_CANONICAL_MONEY_REQUIRED','Exactly one original expense money batch is required.'); }
        $b=$batches[0];$moves=array_values(array_filter($data['money_movements'],fn($m)=>(string)$m['batch_id']===(string)$b['id']));
        $money=MoneyDocuments::reconcile([$d],[$b],$data['money_accounts'],array_values(array_filter($data['v1_audit'],fn($a)=>$a['action']==='document.posted')));
        if (!$money['matched']||$b['kind']!=='SOURCE_DEBIT'||$b['amount']!==$d['total']||$b['from_account_id']===null||$b['to_account_id']!==null||count($moves)!==1||(string)$moves[0]['account_id']!==(string)$b['from_account_id']||Exact::cents($moves[0]['delta'],signed:true)->compareTo(Exact::cents($d['total'])->negated())!==0) { $block('H1C_SOURCE_MONEY_MISMATCH','The original cash/bank movement and full expense amount must match exactly.'); }
        foreach($data['v1_documents'] as $r){if($r['kind']===FinancialCorrections::KIND&&$r['status']==='POSTED'&&(string)$r['corrects_id']===$id){$block('H1C_REFUNDED_EXPENSE','This expense has already been refunded and cannot be applied to labor.');}}
        foreach($data['money_batches'] as $r){if((string)($r['corrects_id']??'')===(string)$b['id']){$block('H1C_REVERSED_SOURCE','The original money batch has already been reversed.');}}
        foreach($data['labor_payments'] as $r){if((string)$r['money_batch_id']===(string)$b['id']){$block('H1C_CONSUMED_SOURCE','This cash movement is already claimed by a labor settlement.');}}
        foreach($data['labor_expense_allocations']??[] as $r){if((string)$r['id']!==$ignoreAllocation&&((string)$r['expense_id']===$id||(string)$r['source_batch_id']===(string)$b['id']||(string)$r['source_movement_id']===(string)$moves[0]['id'])){$block('H1C_SOURCE_ALREADY_APPLIED','This expense/money movement already has an immutable Hafta allocation.');}}
        return ['document'=>$d,'payload'=>$p,'batch'=>$b,'movement'=>$moves[0]];
    }
    public static function balance(array $data,string $employeeId): array
    {
        $open=array_values(array_filter($data['labor_openings'],fn($r)=>(string)$r['employee_id']===$employeeId))[0]??null;
        $n=$open?Exact::cents($open['amount'],zero:true):N::zero();$latest=$open['date']??'';
        foreach(['labor_earnings'=>1,'labor_payments'=>-1,'labor_expense_allocations'=>-1] as $table=>$sign){foreach($data[$table]??[] as $r){if((string)$r['employee_id']!==$employeeId)continue;$n=$n->plus(Exact::cents($r['amount'],zero:true)->multipliedBy($sign));$latest=max($latest,$r['date']);}}
        return ['opening'=>$open,'available'=>$open?Exact::money($n):null,'latest'=>$latest];
    }
    public function review(string $id,?string $employeeId=null): array
    {
        LaborExtensionSchema::ready($this->db);
        return $this->inspect($id,$employeeId,(new EmployeeHafta($this->db))->data());
    }
    private function inspect(string $id,?string $employeeId,array $data): array
    {
        $d=array_column($data['v1_documents'],null,'id')[$id]??null;$p=$d?SimpleV1::payload($d):[];$actual=$p['employeeSnapshot']['id']??null;$balance=$actual?self::balance($data,(string)$actual):['opening'=>null,'available'=>null,'latest'=>''];$reason='';$code='';$source=null;
        try{
            $source=self::source($id,$data);
            if($employeeId!==null&&$employeeId!==$actual)throw new ApiError(409,'H1C_EMPLOYEE_MISMATCH',publicMessage:'The selected employee does not match the original retained expense identity.');
            $current=$this->db->one('SELECT * FROM employees WHERE id=? AND active=1',[$actual]);if(!$current)throw new ApiError(409,'H1C_ACTIVE_EMPLOYEE_REQUIRED',publicMessage:'The original employee must be active for a new allocation; identity is never substituted.');
            if(!$balance['opening']||$d['date']<$balance['opening']['date'])throw new ApiError(409,'H1C_LABOR_COVERAGE_UNVERIFIED',publicMessage:'Verify reviewed labor opening coverage on or before the original cash date. Missing history is not zero. An existing later opening cannot be silently rewritten.');
            if(Exact::cents($d['total'])->compareTo(Exact::cents($balance['available'],zero:true))>0)throw new ApiError(409,'H1C_ALLOCATION_EXCEEDS_PAYABLE',publicMessage:'The full original expense exceeds current verified earned payable. Partial allocations and advances are not enabled.');
        }catch(ApiError $e){$reason=$e->publicMessage??$e->apiCode;$code=$e->apiCode;}
        $batch=$source['batch']??array_values(array_filter($data['money_batches'],fn($b)=>$b['source_type']==='DOCUMENT'&&$b['source_ref']==='UPMS-DOC:'.$id))[0]??null;$account=$batch?$this->db->one('SELECT id,name FROM money_accounts WHERE id=?',[$batch['from_account_id']]):null;
        return ['allocationId'=>array_values(array_filter($data['labor_expense_allocations']??[],fn($r)=>(string)$r['expense_id']===$id))[0]['id']??null,'expenseId'=>$id,'employeeId'=>$actual,'employeeName'=>$p['employeeSnapshot']['name']??null,'sourceDate'=>$d['date']??null,'amount'=>$d['total']??null,'reference'=>$p['reference']??'','description'=>$p['description']??'','purpose'=>$p['expensePurpose']??null,'method'=>$p['method']??null,'moneyAccount'=>$account,'sourceBatchId'=>$batch?(string)$batch['id']:null,'verifiedPayable'=>$balance['available'],'coverageDate'=>$balance['opening']['date']??null,'minimumDate'=>max($balance['latest'],$d['date']??''),'eligible'=>$reason==='','blockedReason'=>$reason,'code'=>$code,'allocationType'=>'HAFTA_SETTLEMENT','cashEffect'=>'No new cash movement. Original expense and paying-account movement retained.','datePolicy'=>'Selected effective classification date must be on/after source and latest employee activity. Prior-period source expense remains historical; a signed noncash adjustment is recorded on this date.','advancesSupported'=>false];
    }
    public function candidates(array $filters): array
    {
        LaborExtensionSchema::ready($this->db);
        if(array_diff(array_keys($filters),['employeeId','expenseId']))throw new ApiError(400,'INVALID_INPUT');foreach($filters as $v){if(!is_string($v)||!preg_match('/^[1-9]\d*$/D',$v))throw new ApiError(400,'INVALID_INPUT');}
        $data=(new EmployeeHafta($this->db))->data();$records=[];foreach($data['v1_documents'] as $d){if($d['kind']!=='EXPENSE'||$d['status']!=='POSTED')continue;$p=SimpleV1::payload($d);if(isset($filters['expenseId'])&&(string)$d['id']!==$filters['expenseId'])continue;if(!isset($filters['expenseId'])&&isset($filters['employeeId'])&&($p['employeeSnapshot']['id']??'')!==$filters['employeeId'])continue;$records[]=$this->inspect((string)$d['id'],$filters['employeeId']??null,$data);}return ['records'=>$records,'policy'=>'Full-source, explicitly approved allocation against verified earned payable. No advances, inferred purpose, refund or additional cash deduction.'];
    }
    public function apply(object $input,array $user): array
    {
        LaborExtensionSchema::ready($this->db);foreach(['employee_labor.classify','employee_labor.view','money.accounts.view'] as $cap)EmployeeHafta::permit($user,$cap);
        if(array_diff(array_keys(get_object_vars($input)),['expenseId','employeeId','date','reason','approved'])||($input->approved??false)!==true)throw new ApiError(400,'H1C_AUTHORIZED_CONFIRMATION_REQUIRED');
        foreach(['expenseId','employeeId','date','reason'] as $field){if(!is_string($input->$field??null))throw new ApiError(400,'INVALID_INPUT');}
        if(!preg_match('/^[1-9]\d*$/D',$input->expenseId)||!preg_match('/^[1-9]\d*$/D',$input->employeeId)||mb_strlen(V1Input::trim($input->reason))<10||mb_strlen($input->reason)>500)throw new ApiError(400,'H1C_MEANINGFUL_EVIDENCE_REQUIRED');
        V1Input::reportFilters(['from'=>$input->date]);if($input->date>SimpleV1::today())throw new ApiError(400,'FUTURE_DATE_NOT_ALLOWED');
        if(!(new Reconciliation($this->db))->run()['matched'])throw new ApiError(409,'H1C_FINANCIAL_RECONCILIATION_REQUIRED');
        $review=$this->review($input->expenseId,$input->employeeId);if(!$review['eligible'])throw new ApiError(409,$review['code'],publicMessage:$review['blockedReason']);if($input->date<$review['minimumDate'])throw new ApiError(409,'H1C_CLASSIFICATION_BACKDATE_NOT_ALLOWED',publicMessage:'The effective classification date precedes the original payment or later employee activity.');
        $source=self::source($input->expenseId,(new EmployeeHafta($this->db))->data());$d=$source['document'];$b=$source['batch'];$m=$source['movement'];
        $id=LaborExtensionReceipts::insert($this->db,'labor_expense_allocations',['expense_id'=>$d['id'],'source_batch_id'=>$b['id'],'source_movement_id'=>$m['id'],'employee_id'=>$input->employeeId,'employee_snapshot'=>BusinessCommand::json($source['payload']['employeeSnapshot']),'source_date'=>$d['date'],'date'=>$input->date,'amount'=>$d['total'],'source_hash'=>EmployeeHafta::rowHash($d),'batch_hash'=>EmployeeHafta::rowHash($b),'movement_hash'=>EmployeeHafta::rowHash($m),'reference'=>$source['payload']['reference'],'reason'=>V1Input::trim($input->reason),'actor_id'=>$user['id'],'created_at'=>BusinessCommand::timestamp()]);
        $row=LaborExtensionReceipts::audit($this->db,'labor_expense_allocations',$id,'EXPENSE_ALLOCATION');$data=(new EmployeeHafta($this->db))->data();if(!LaborExtensionReconciliation::run($data)['matched']||!EmployeeHaftaReconciliation::run($data)['matched'])throw new ApiError(409,'H1C_ALLOCATION_RECONCILIATION_FAILED');
        return LaborExtensionReceipts::allocation($row);
    }
}
