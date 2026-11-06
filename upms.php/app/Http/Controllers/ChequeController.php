<?php
declare(strict_types=1);
namespace App\Http\Controllers;
use App\Upms\{ApiError,BusinessCommand,ChequeSchema,Cheques,Database};
use Illuminate\Http\Request;

final class ChequeController
{
    public function bank(Request $request,Database $db,BusinessCommand $commands): mixed
    {
        $input=json_decode($request->getContent(),false,32,JSON_THROW_ON_ERROR);
        if(!is_object($input)) { throw new ApiError(400,'CHEQUE_INPUT_INVALID'); }
        $service=new Cheques($db);
        $result=$commands->run($request->attributes->get('upms.session'),$request->header('idempotency-key'),'cheque.bank.create',$input,fn($user)=>$service->createBank($input,$user),fn()=>ChequeSchema::ready($db),fn()=>$service->requireReconciled());
        return response()->json($result,201);
    }
    public function attachment(Request $request,Database $db,BusinessCommand $commands): mixed
    {
        return $db->readTransaction(function() use($request,$db,$commands) {
            [$user]=$commands->operator($request->attributes->get('upms.session'));ChequeSchema::ready($db);Cheques::permit($user,'view');
            $id=$request->route('id');
            if(!\App\Upms\ChequeExtras::enabled()||!is_string($id)||!preg_match('/^[a-f0-9]{32}$/D',$id)) { throw new ApiError(404,'CHEQUE_NOT_FOUND'); }
            $file=$db->one('SELECT * FROM cheque_attachments WHERE id=?',[$id])??throw new ApiError(404,'CHEQUE_NOT_FOUND');
            $bytes=\App\Upms\ChequeExtras::decrypt($file);
            (new Cheques($db))->requireReconciled();
            return response($bytes,200,['Content-Type'=>'application/octet-stream','Content-Disposition'=>\Symfony\Component\HttpFoundation\HeaderUtils::makeDisposition('attachment',$file['filename'],'cheque-evidence'),'X-Content-Type-Options'=>'nosniff','Content-Security-Policy'=>"default-src 'none'; sandbox",'Cache-Control'=>'no-store']);
        });
    }
    public function identity(Request $request,Database $db,BusinessCommand $commands): mixed
    {
        $input=json_decode($request->getContent(),false,32,JSON_THROW_ON_ERROR);
        if(!is_object($input)) { throw new ApiError(400,'CHEQUE_INPUT_INVALID'); }
        return response()->json($db->transaction(function() use($request,$db,$commands,$input) {
            [$user]=$commands->operator($request->attributes->get('upms.session'));ChequeSchema::ready($db);
            return (new Cheques($db))->identity(get_object_vars($input),$user);
        }));
    }
    public function __invoke(Request $request,Database $db,BusinessCommand $commands): mixed
    {
        $session=$request->attributes->get('upms.session');$service=new Cheques($db);
        if($request->isMethod('GET')) {
            return response()->json($db->readTransaction(function() use($commands,$session,$db,$service,$request) {
                [$user]=$commands->operator($session);ChequeSchema::ready($db);$query=$request->query();
                if(isset($query['readiness'])) {
                    if(array_diff(array_keys($query),['readiness','date'])||!is_string($query['readiness'])||!preg_match('/^[1-9][0-9]{0,19}$/D',$query['readiness'])||!is_string($query['date']??null)) { throw new ApiError(400,'CHEQUE_FILTER_INVALID'); }
                    return $service->clearanceReadiness($query['readiness'],$query['date'],$user);
                }
                if(isset($query['report'])) { if($query['report']!=='1') { throw new ApiError(400,'CHEQUE_FILTER_INVALID'); }Cheques::permit($user,'reports');unset($query['report']); }
                return $service->report($query,$user);
            }));
        }
        $input=json_decode($request->getContent(),false,32,JSON_THROW_ON_ERROR);if(!is_object($input)) { throw new ApiError(400,'INVALID_INPUT'); }
        $id=$request->route('id');if($id!==null&&!preg_match('/^[1-9][0-9]{0,19}$/D',$id)) { throw new ApiError(400,'INVALID_INPUT'); }
        $type=strtoupper($request->route('operation')??'RECEIVED');
        try {
            $result=$commands->run($session,$request->header('idempotency-key'),'cheque.'.$type.'.'.($id??'new'),$input,fn($user,$control)=>$id===null?$service->receive($input,$user):$service->transition($id,$type,$input,$user,$control,$commands),function() use($db,$commands,$session,$type) {
                ChequeSchema::ready($db);[$user]=$commands->operator($session);
                Cheques::permit($user,Cheques::CAPABILITIES[$type]??throw new ApiError(400,'CHEQUE_ACTION_INVALID'));
            },fn()=>$service->requireReconciled());
        } catch (\PDOException $e) {
            if(in_array((int)($e->errorInfo[1]??0),[1205,1213],true)) { throw new ApiError(409,'CHEQUE_CONCURRENT_RETRY',publicMessage:'Another command is being verified. Refresh and retry with the same idempotency key. No partial clearance was committed.'); }
            throw $e;
        }
        return response()->json($result,201);
    }
}
