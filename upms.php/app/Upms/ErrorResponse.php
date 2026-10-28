<?php

declare(strict_types=1);

namespace App\Upms;

use Illuminate\Http\Request;

final class ErrorResponse
{
    public static function render(\Throwable $error, Request $request, ?string $reference = null): mixed
    {
        $reference ??= (string) \Illuminate\Support\Str::uuid();
        if ($error instanceof \PDOException) {
            $native = (int) ($error->errorInfo[1] ?? 0);
            if ($native === 1062) {
                $error = new ApiError(409, 'IDENTITY_CONFLICT');
            } elseif (in_array($native, [1451, 1452, 3819, 4025], true)) {
                $error = new ApiError(400, 'INVALID_REFERENCE_OR_CONSTRAINT');
            }
        }
        $known = $error instanceof ApiError;
        if (!$known) {
            \Illuminate\Support\Facades\Log::warning('upms.request.failed', ['reference' => $reference, 'type' => get_class($error)]);
        }
        $status = $known ? $error->status : 503;
        $body = ['code' => $known ? $error->apiCode : 'IDENTITY_UNAVAILABLE'];
        if ($known && $error->entry && $request->is('api/v1/management/simple-v1/*') && in_array($status, [400, 409], true) && !in_array($error->apiCode, ['IDENTITY_CONFLICT', 'INVALID_REFERENCE_OR_CONSTRAINT'], true)) {
            $fields = $error->fieldErrors;
            if ($error->apiCode === 'INVALID_INPUT' && $fields === null) {
                $fields = ['form' => 'Field is missing or invalid. Please check this field.'];
            }
            $messages = [
                'PARTY_KIND_MISMATCH' => 'Select a client for a client receipt or a vendor for a vendor payment.',
                'FUTURE_DATE_NOT_ALLOWED' => 'Choose today or an earlier business date.',
                'INVALID_AMOUNT' => 'Enter an amount greater than zero with up to two decimal places.',
                'BOTTLE_CHANGED_REVIEW_DRAFT' => 'This bottle or its price changed. Edit the draft and explicitly refresh its pricing.',
                'PARTY_CHANGED_REVIEW_DRAFT' => 'Client/vendor details changed. Review and save the draft again.',
                'ACTIVE_PARTY_REQUIRED' => 'Please select an active client or vendor.',
                'IMMUTABLE_DOCUMENT' => 'This entry was already posted or cancelled. Refresh its status before continuing.',
                'STALE_DOCUMENT' => 'This draft has changed. Refresh and review before finalizing.',
                'STALE_RECORD' => 'This record changed. Reload before saving.',
            ];
            $body['message'] = $error->publicMessage ?? $messages[$error->apiCode] ?? ($fields ? 'Please correct the highlighted fields.' : 'This entry cannot be saved. Review the values and try again.');
            if ($fields) {
                $body['fieldErrors'] = $fields;
            }
        }
        $body['reference'] = $reference;
        return response()->json(['error' => $body], $status)->withHeaders(['Cache-Control' => 'no-store', 'X-Robots-Tag' => 'noindex, nofollow', 'Vary' => 'Cookie']);
    }
}
