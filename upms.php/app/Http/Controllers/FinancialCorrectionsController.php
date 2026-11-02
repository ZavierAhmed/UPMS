<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Upms\{ApiError,BusinessCommand,Database,FinancialCorrections};
use Illuminate\Http\Request;

final class FinancialCorrectionsController
{
    public function __invoke(Request $request, Database $db, BusinessCommand $commands): mixed
    {
        $id = $request->route('id');
        if ($id !== null && !preg_match('/^[1-9][0-9]{0,19}$/D', $id)) {
            throw new ApiError(400, 'INVALID_INPUT');
        }
        $service = new FinancialCorrections($db);
        if ($request->isMethod('GET')) {
            if (array_diff(array_keys($request->query()), ['scenario']) || !is_string($request->query('scenario', FinancialCorrections::TYPE))) {
                throw new ApiError(400, 'INVALID_INPUT');
            }
            $result = $db->transaction(function () use ($commands, $request, $db, $service, $id) {
                $commands->operator($request->attributes->get('upms.session'));
                FinancialCorrections::ready($db);
                return $service->review($id, $request->query('scenario', FinancialCorrections::TYPE));
            });
        } else {
            $input = json_decode($request->getContent(), false, 32, JSON_THROW_ON_ERROR);
            if (!is_object($input)) {
                throw new ApiError(400, 'INVALID_INPUT');
            }$op = $request->route('operation') ?? 'draft';
            $result = $commands->run($request->attributes->get('upms.session'), $request->header('idempotency-key'), 'financial-refund.'.$op.':'.($id ?? 'new'), $input, fn ($user) => match($op) {
                'post' => $service->post($id, $input, $user, $commands),'cancel' => $service->cancel($id, $input, $user, $commands),default => $service->draft($input, $user, $commands)
            }, fn () => FinancialCorrections::ready($db));
        }
        return response()->json($result,$request->isMethod('POST') && $id === null ? 201 : 200);
    }
}
