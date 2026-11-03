<?php
declare(strict_types=1);
namespace App\Http\Controllers;
use App\Upms\{ApiError,BusinessCommand,Database,EmployeeHafta,LaborExpenseAllocation,LaborExtensionSchema};
use Illuminate\Http\Request;

final class LaborExpenseAllocationController
{
    public function __invoke(Request $request, Database $db, BusinessCommand $commands): mixed
    {
        $session = $request->attributes->get('upms.session');
        $service = new LaborExpenseAllocation($db);
        if ($request->isMethod('GET')) {
            $result = $db->transaction(function () use ($request,$db,$commands,$session,$service) {
                [$user] = $commands->operator($session);
                LaborExtensionSchema::ready($db);
                foreach (['employee_labor.classify','employee_labor.view','money.accounts.view'] as $cap) { EmployeeHafta::permit($user,$cap); }
                if ($request->route('id') !== null) {
                    $id=$request->route('id');
                    if (!preg_match('/^[1-9]\d*$/D',$id)) { throw new ApiError(400,'INVALID_INPUT'); }
                    $row=$db->one('SELECT * FROM labor_expense_allocations WHERE id=?',[$id]);
                    if (!$row) { throw new ApiError(404,'NOT_FOUND'); }
                    return ['allocation'=>$row,'audit'=>$db->one("SELECT * FROM labor_extension_audit WHERE entry_type='EXPENSE_ALLOCATION' AND entry_id=?",[$id]),'source'=>$service->review((string)$row['expense_id'])];
                }
                return $service->candidates($request->query());
            });
            return response()->json($result);
        }
        $input = json_decode($request->getContent(),false,32,JSON_THROW_ON_ERROR);
        if (!$input instanceof \stdClass) { throw new ApiError(400,'INVALID_INPUT'); }
        $r = $commands->run($session,$request->header('idempotency-key'),'employee-hafta.expense-allocation',$input,fn ($user) => $service->apply($input,$user),fn () => LaborExtensionSchema::ready($db));
        return response()->json($r,201);
    }
}
