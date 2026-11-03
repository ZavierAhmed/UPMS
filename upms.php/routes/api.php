<?php

declare(strict_types=1);

use App\Http\Controllers\SessionController;
use App\Http\Controllers\SimpleV1Controller;
use App\Http\Controllers\SimpleV1WriteController;
use App\Http\Middleware\UpmsBoundary;
use App\Upms\Database;
use App\Upms\Schema;
use Illuminate\Support\Facades\Route;

Route::get('/healthz', fn () => response()->json(['status' => 'ok']));
Route::get('/readyz', function () {
    try {
        Schema::verify(app(Database::class));
        if (config('upms.employee_hafta_enabled', false)) {
            \App\Upms\EmployeeHaftaSchema::ready(app(Database::class));
        }
        if (config('upms.money_accounts_enabled', false)) {
            \App\Upms\MoneySchema::ready(app(Database::class));
        }
        if (config('upms.expense_masters_enabled', false)) {
            \App\Upms\ExpenseSchema::ready(app(Database::class));
        }
        if (config('upms.financial_refunds_enabled', false)) {
            \App\Upms\FinancialCorrections::ready(app(Database::class));
        }
        return response()->json(['status' => 'ready']);
    } catch (Throwable) {
        return response()->json(['status' => 'unavailable'], 503);
    }
});
Route::prefix('/api/v1/management')->middleware(UpmsBoundary::class)->group(function () {
    Route::get('/simple-v1/stock-readiness', SimpleV1Controller::class);
    Route::get('/session/csrf', [SessionController::class, 'csrf']);
    Route::get('/simple-v1/employee-hafta/expense-allocations', \App\Http\Controllers\LaborExpenseAllocationController::class);
    Route::get('/simple-v1/employee-hafta/expense-allocations/{id}', \App\Http\Controllers\LaborExpenseAllocationController::class);
    Route::post('/simple-v1/employee-hafta/expense-allocations', \App\Http\Controllers\LaborExpenseAllocationController::class);
    Route::get('/simple-v1/employee-hafta', \App\Http\Controllers\EmployeeHaftaController::class);
    Route::get('/simple-v1/employee-hafta/payments/{id}', \App\Http\Controllers\EmployeeHaftaController::class);
    Route::post('/simple-v1/employee-hafta/{operation}', \App\Http\Controllers\EmployeeHaftaController::class)->whereIn('operation', ['openings','payments']);
    Route::post('/session/login', [SessionController::class, 'login']);
    Route::get('/session/current', [SessionController::class, 'current']);
    Route::post('/session/logout', [SessionController::class, 'logout']);
    Route::post('/profile/password', [SessionController::class, 'password']);
    Route::get('/simple-v1/financial-refunds/review/{id}', \App\Http\Controllers\FinancialCorrectionsController::class);
    Route::post('/simple-v1/financial-refunds', \App\Http\Controllers\FinancialCorrectionsController::class);
    Route::post('/simple-v1/financial-refunds/{id}/{operation}', \App\Http\Controllers\FinancialCorrectionsController::class)->whereIn('operation', ['post','cancel']);
    Route::get('/simple-v1/expense-directory', \App\Http\Controllers\ExpenseController::class);
    Route::get('/simple-v1/expense-reports', \App\Http\Controllers\ExpenseController::class);
    Route::post('/simple-v1/expense-masters/{entity}', \App\Http\Controllers\ExpenseController::class)->whereIn('entity', ['categories','employees']);
    Route::patch('/simple-v1/expense-masters/{entity}/{id}', \App\Http\Controllers\ExpenseController::class)->whereIn('entity', ['categories','employees']);
    Route::get('/simple-v1/money', \App\Http\Controllers\MoneyAccountsController::class);
    Route::get('/simple-v1/money/accounts/{id}', \App\Http\Controllers\MoneyAccountsController::class);
    Route::post('/simple-v1/money/{operation}', \App\Http\Controllers\MoneyAccountsController::class)->whereIn('operation', ['openings','transfers','sources','reversals']);
    foreach (['state', 'items', 'parties', 'documents', 'documents/{id}', 'ledgers/{id}', 'overview', 'movements', 'register', 'reconciliation', 'hafta'] as $path) {
        Route::get('/simple-v1/'.$path, SimpleV1Controller::class);
    }
    foreach (['items', 'parties', 'documents', 'documents/{id}/post', 'documents/{id}/cancel'] as $path) {
        Route::post('/simple-v1/'.$path, SimpleV1WriteController::class);
    }
    foreach (['items/{id}', 'parties/{id}', 'documents/{id}'] as $path) {
        Route::patch('/simple-v1/'.$path, SimpleV1WriteController::class);
    }
    Route::any('/simple-v1/{path?}', fn () => throw new \App\Upms\ApiError(404, 'NOT_FOUND'))->where('path', '.*');
    Route::any('/{path?}', fn () => throw new \App\Upms\ApiError(403, 'LEGACY_DISABLED_IN_V1'))->where('path', '.*');
});
Route::fallback(fn () => response()->json(['error' => ['code' => 'NOT_FOUND']], 404));
