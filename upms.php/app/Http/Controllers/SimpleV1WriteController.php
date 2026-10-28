<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Upms\ApiError;
use App\Upms\BusinessCommand;
use App\Upms\MasterData;
use App\Upms\Documents;
use Illuminate\Http\Request;

final class SimpleV1WriteController
{
    public function __invoke(Request $request, BusinessCommand $commands, MasterData $masters, Documents $documents): mixed
    {
        $id = $request->route('id');
        if ($id !== null && !preg_match('/^[1-9][0-9]*$/D', $id)) {
            throw new ApiError(400, 'INVALID_INPUT');
        }
        $input = json_decode($request->getContent(), false, 512, JSON_THROW_ON_ERROR);
        $path = substr($request->path(), strlen('api/v1/management/simple-v1/'));
        $operation = match (true) {
            $path === 'items' || str_starts_with($path, 'items/') => 'item.save:'.($id ?? 'undefined'),
            $path === 'parties' || str_starts_with($path, 'parties/') => 'party.save:'.($id ?? 'undefined'),
            str_ends_with($path, '/post') => 'document.post:'.$id,
            str_ends_with($path, '/cancel') => 'document.cancel:'.$id,
            default => 'document.draft:'.($id ?? 'undefined'),
        };
        $result = $commands->run($request->attributes->get('upms.session'), $request->header('idempotency-key'), $operation, $input, function ($user, $control) use ($operation, $input, $id, $masters, $documents): array {
            if (!is_object($input)) {
                throw new ApiError(400, 'INVALID_INPUT', ['form' => 'Field is missing or invalid. Please check this field.']);
            }
            return match (true) {
                str_starts_with($operation, 'item.save:') => $masters->saveItem($user, $control, $input, $id),
                str_starts_with($operation, 'party.save:') => $masters->saveParty($user, $input, $id),
                str_starts_with($operation, 'document.post:') => $documents->post($user, $control, $input, $id),
                str_starts_with($operation, 'document.cancel:') => $documents->cancel($user, $input, $id),
                default => $documents->draft($user, $control, $input, $id),
            };
        }, str_starts_with($operation, 'document.') && is_object($input) ? fn () => $documents->scope($input, $id) : null);
        return response()->json($result, $request->method() === 'POST' && $id === null ? 201 : 200);
    }
}
