<?php

use Illuminate\Support\Facades\Route;

require __DIR__.'/api/auth.php';

Route::middleware('auth:sanctum')->group(function () {
    require __DIR__.'/api/users.php';
    require __DIR__.'/api/workflows.php';
    require __DIR__.'/api/requests.php';
    require __DIR__.'/api/delegations.php';
    require __DIR__.'/api/notifications.php';
});
