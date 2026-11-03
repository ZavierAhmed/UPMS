<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Upms\{ApiError,BusinessCommand,Database,EmployeeHafta,EmployeeHaftaSchema};
use Illuminate\Http\Request;

final class EmployeeHaftaController
{
    public function __invoke(Request $request, Database $db, BusinessCommand $commands): mixed
    {
        $service = new EmployeeHafta($db);
        $session = $request->attributes->get('upms.session');
        if ($request->isMethod('GET')) {
            $result = $db->transaction(function () use ($request, $db, $commands, $service, $session) {
                [$user] = $commands->operator($session);
                EmployeeHaftaSchema::ready($db);
                EmployeeHafta::permit($user, 'employee_labor.view');
                if ($request->route('id') !== null) {
                    if (!preg_match('/^[a-f0-9-]{36}$/D', $request->route('id'))) {
                        throw new ApiError(400, 'INVALID_INPUT');
                    }
                    $row = $db->one('SELECT * FROM labor_payments WHERE id=?', [$request->route('id')]);
                    if (!$row) {
                        throw new ApiError(404, 'NOT_FOUND');
                    }
                    if (!in_array('money.accounts.view', $user['permissions'], true)) {
                        unset($row['money_account_id'], $row['money_batch_id']);
                    }
                    return ['payment' => $row,'audit' => $db->one("SELECT * FROM labor_audit WHERE entry_type='PAYMENT' AND entry_id=?", [$row['id']])];
                }
                return $service->report($request->query());
            });
            return response()->json($result);
        }
        $input = json_decode($request->getContent(), false, 32, JSON_THROW_ON_ERROR);
        if (!is_object($input)) {
            throw new ApiError(400, 'INVALID_INPUT');
        }
        $opening = $request->route('operation') === 'openings';
        $r = $commands->run($session, $request->header('idempotency-key'), 'employee-hafta.'.($opening ? 'opening' : 'payment'), $input, fn ($user) => $opening ? $service->opening($input, $user) : $service->pay($input, $user), fn () => EmployeeHaftaSchema::ready($db));
        return response()->json($r, 201);
    }
}
