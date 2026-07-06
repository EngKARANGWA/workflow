<?php

use App\Http\Controllers\Api\RequestController;
use Illuminate\Support\Facades\Route;

Route::get('/requests', [RequestController::class, 'index']);
Route::post('/requests', [RequestController::class, 'store']);
Route::get('/requests/{workflowRequest}', [RequestController::class, 'show']);
Route::get('/requests/{workflowRequest}/history', [RequestController::class, 'history']);
Route::post('/requests/{workflowRequest}/decide', [RequestController::class, 'decide']);
Route::post('/requests/{workflowRequest}/resubmit', [RequestController::class, 'resubmit']);
