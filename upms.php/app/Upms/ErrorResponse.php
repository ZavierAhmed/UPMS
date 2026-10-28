<?php

declare(strict_types=1);

namespace App\Upms;

use Illuminate\Http\Request;

final class ErrorResponse
{
    public static function render(\Throwable $error, Request $request, ?string $reference = null): mixed
    {
        $reference ??= (string) \Illuminate\Support\Str::uuid();
        $known = $error instanceof ApiError;
        if (!$known) {
            \Illuminate\Support\Facades\Log::warning('upms.request.failed', ['reference' => $reference, 'type' => get_class($error)]);
        }
        $status = $known ? $error->status : 503;
        $body = ['code' => $known ? $error->apiCode : 'IDENTITY_UNAVAILABLE'];
        if ($known && $request->is('api/v1/management/simple-v1/*') && in_array($status, [400, 409], true)) {
            $fields = $error->fieldErrors;
            if ($error->apiCode === 'INVALID_INPUT' && $fields === null) {
                $fields = ['form' => 'Field is missing or invalid. Please check this field.'];
            }
            $body['message'] = $fields ? 'Please correct the highlighted fields.' : 'This entry cannot be saved. Review the values and try again.';
            if ($fields) {
                $body['fieldErrors'] = $fields;
            }
        }
        $body['reference'] = $reference;
        return response()->json(['error' => $body], $status)->withHeaders(['Cache-Control' => 'no-store', 'X-Robots-Tag' => 'noindex, nofollow', 'Vary' => 'Cookie']);
    }
}
