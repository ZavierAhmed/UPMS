<?php
declare(strict_types=1);
namespace App\Http\Controllers;
use App\Upms\{ApiError,BusinessCommand,ChequeSchema,Cheques,Database};
use Illuminate\Http\Request;

final class ChequeController
{
    public function __invoke(Request $request,Database $db,BusinessCommand $commands): mixed
    {
        $session=$request->attributes->get('upms.session');$service=new Cheques($db);
        if($request->isMethod('GET')) {
            return response()->json($db->transaction(function() use($commands,$session,$db,$service,$request) {
                [$user]=$commands->operator($session);ChequeSchema::ready($db);$query=$request->query();
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
