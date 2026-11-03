<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Upms\{ApiError,BusinessCommand,Database,MoneyAccounts,MoneySchema};
use Illuminate\Http\Request;

final class MoneyAccountsController
{
    public function __invoke(Request $request, Database $db, BusinessCommand $commands, MoneyAccounts $money): mixed
    {
        if ($request->method() === 'GET') {
            $result = $db->transaction(function () use ($request, $commands, $money, $db) {
                [$user] = $commands->operator($request->attributes->get('upms.session'));
                if (config('upms.employee_hafta_enabled', false)) {
                    \App\Upms\EmployeeHafta::permit($user, 'money.accounts.view');
                }
                MoneySchema::ready($db);
                return $request->route('id') !== null ? $money->statement($request->route('id'), $request->query()) : $money->overview();
            });
            return response()->json($result);
        }
        $operation = match($request->route('operation')) {
            'openings' => 'opening','transfers' => 'transfer','sources' => 'source','reversals' => 'reversal',default => throw new ApiError(404, 'NOT_FOUND')
        };
        $input = json_decode($request->getContent(), false, 512, JSON_THROW_ON_ERROR);
        $r = $commands->run($request->attributes->get('upms.session'), $request->header('idempotency-key'), 'money.'.$operation, $input, function ($user) use ($money, $input, $operation) {
            if (config('upms.employee_hafta_enabled', false)) {
                \App\Upms\EmployeeHafta::permit($user, 'money.accounts.view');
            }
            if (!is_object($input)) {
                throw new ApiError(400, 'INVALID_INPUT');
            }return $money->post($operation, $input, $user);
        }, fn () => MoneySchema::ready($db));
        return response()->json($r, 201);
    }
}
