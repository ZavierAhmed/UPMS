<?php

declare(strict_types=1);

use App\Http\Controllers\SessionController;
use App\Http\Controllers\SimpleV1Controller;
use App\Http\Middleware\UpmsBoundary;
use App\Upms\Database;
use App\Upms\Schema;
use Illuminate\Support\Facades\Route;

Route::get('/healthz', fn () => response()->json(['status' => 'ok']));
Route::get('/readyz', function () {
    try {
        Schema::verify(app(Database::class));
        return response()->json(['status' => 'ready']);
    } catch (Throwable) {
        return response()->json(['status' => 'unavailable'], 503);
    }
});
Route::prefix('/api/v1/management')->middleware(UpmsBoundary::class)->group(function () {
    Route::get('/session/csrf', [SessionController::class, 'csrf']);
    Route::post('/session/login', [SessionController::class, 'login']);
    Route::get('/session/current', [SessionController::class, 'current']);
    Route::post('/session/logout', [SessionController::class, 'logout']);
    Route::post('/profile/password', [SessionController::class, 'password']);
    foreach (['state', 'items', 'parties', 'documents', 'documents/{id}', 'ledgers/{id}', 'overview', 'movements', 'register', 'reconciliation'] as $path) {
        Route::get('/simple-v1/'.$path, SimpleV1Controller::class);
    }
    foreach (['items', 'parties', 'documents', 'documents/{id}/post', 'documents/{id}/cancel'] as $path) {
        Route::post('/simple-v1/'.$path, fn () => throw new \App\Upms\ApiError(501, 'PHP_WRITE_MODULE_PENDING_REVIEW'));
    }
    foreach (['items/{id}', 'parties/{id}', 'documents/{id}'] as $path) {
        Route::patch('/simple-v1/'.$path, fn () => throw new \App\Upms\ApiError(501, 'PHP_WRITE_MODULE_PENDING_REVIEW'));
    }
    Route::any('/simple-v1/{path?}', fn () => throw new \App\Upms\ApiError(404, 'NOT_FOUND'))->where('path', '.*');
    Route::any('/{path?}', fn () => throw new \App\Upms\ApiError(403, 'LEGACY_DISABLED_IN_V1'))->where('path', '.*');
});
Route::fallback(fn () => response()->json(['error' => ['code' => 'NOT_FOUND']], 404));
