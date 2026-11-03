<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Upms\{ApiError,BusinessCommand,Database,ExpenseMasters,ExpenseReports,ExpenseSchema};
use Illuminate\Http\Request;

final class ExpenseController
{
    public function __invoke(Request $request, Database $db, BusinessCommand $commands): mixed
    {
        $service = new ExpenseMasters($db);
        if ($request->isMethod('GET')) {
            $result = $db->transaction(function () use ($request, $db, $commands, $service) {
                [$user] = $commands->operator($request->attributes->get('upms.session'));
                ExpenseSchema::ready($db);
                $answer = str_ends_with($request->path(), 'expense-reports') ? (new ExpenseReports($db))->generate($request->query()) : $service->directory();
                if (config('upms.employee_hafta_enabled', false) && !in_array('money.accounts.view', $user['permissions'], true)) {
                    $redact = function ($value) use (&$redact) {
                        if (!is_array($value)) {
                            return $value;
                        }unset($value['moneyAccountId'],$value['moneyAccountName']);
                        return array_map($redact, $value);
                    };
                    $answer = $redact($answer);
                }
                return $answer;
            });
        } else {
            $id = $request->route('id');
            if ($id !== null && !preg_match('/^[1-9][0-9]{0,19}$/D', $id)) {
                throw new ApiError(400, 'INVALID_INPUT');
            }
            $entity = $request->route('entity') === 'categories' ? 'CATEGORY' : 'EMPLOYEE';
            $input = json_decode($request->getContent(), false, 32, JSON_THROW_ON_ERROR);
            if (!is_object($input)) {
                throw new ApiError(400, 'INVALID_INPUT');
            }
            $result = $commands->run($request->attributes->get('upms.session'), $request->header('idempotency-key'), 'expense-master.'.$entity.':'.($id ?? 'new'), $input, fn ($user) => $service->save($entity, $id, $input, $user), fn () => ExpenseSchema::ready($db));
        }
        return response()->json($result, $request->isMethod('POST') ? 201 : 200);
    }
}
