<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Upms\ApiError;
use App\Upms\Database;
use App\Upms\Identity;
use App\Upms\SimpleV1;
use Illuminate\Http\Request;

final class SimpleV1Controller
{
    public function __invoke(Request $request, Database $db, Identity $identity, SimpleV1 $service): mixed
    {
        $result = $db->transaction(function () use ($request, $db, $identity, $service): array {
            $user = $identity->authorize($request->attributes->get('upms.session'), 'portal.access');
            $control = $db->one('SELECT * FROM v1_control WHERE id=1');
            if ($user['passwordChangeRequired'] ?? false) {
                throw new ApiError(403, 'PASSWORD_CHANGE_REQUIRED');
            }
            if (!in_array('administrator', $user['roles'], true) || (string) ($control['operator_id'] ?? '') !== $user['id']) {
                throw new ApiError(403, 'V1_OPERATOR_ONLY');
            }
            $path = substr($request->path(), strlen('api/v1/management/simple-v1/'));
            $id = $request->route('id');
            if ($id !== null && !preg_match('/^[1-9][0-9]*$/D', $id)) {
                throw new ApiError(400, 'INVALID_INPUT');
            }
            return match (true) {
                $path === 'state' => $service->state($control, $user),
                $path === 'items' => ['records' => $service->items()],
                $path === 'parties' => ['records' => $service->parties($request->query('kind'))],
                $path === 'documents' => ['records' => $service->documents($request->query('kind'))],
                str_starts_with($path, 'documents/') => $service->detail($id),
                str_starts_with($path, 'ledgers/') => $service->ledger($id, $request->query()),
                $path === 'overview' => $service->overview(),
                $path === 'movements' => ['records' => $service->movements()],
                $path === 'register' => $service->register($request->query()),
                $path === 'reconciliation' => $service->reconciliation(),
                default => throw new ApiError(404, 'NOT_FOUND'),
            };
        });
        return response()->json($result);
    }
}
