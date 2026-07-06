<?php

use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::middleware('role:system_administrator')->group(function () {
    Route::apiResource('users', UserController::class);
    Route::apiResource('roles', RoleController::class)->only(['index', 'store', 'destroy']);
});
