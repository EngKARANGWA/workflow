<?php

use App\Http\Controllers\Api\DelegationController;
use Illuminate\Support\Facades\Route;

Route::middleware('role:approver,system_administrator')->group(function () {
    Route::get('/delegations', [DelegationController::class, 'index']);
    Route::post('/delegations', [DelegationController::class, 'store']);
    Route::delete('/delegations/{delegation}', [DelegationController::class, 'destroy']);
});
