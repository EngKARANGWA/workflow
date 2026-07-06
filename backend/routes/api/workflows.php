<?php

use App\Http\Controllers\Api\WorkflowController;
use Illuminate\Support\Facades\Route;

Route::get('/workflows', [WorkflowController::class, 'index']);
Route::get('/workflows/{workflow}', [WorkflowController::class, 'show']);

Route::middleware('role:system_administrator')->group(function () {
    Route::post('/workflows', [WorkflowController::class, 'store']);
    Route::put('/workflows/{workflow}', [WorkflowController::class, 'update']);
    Route::post('/workflows/{workflow}/versions', [WorkflowController::class, 'storeVersion']);
    Route::get('/workflows/{workflow}/versions', [WorkflowController::class, 'versions']);
});
