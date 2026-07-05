<?php

use Illuminate\Support\Facades\Route;

// This is an API-only backend - no frontend build step is needed, so the
// root route just confirms the app is up rather than rendering a Vite-built view.
Route::get('/', fn () => response()->json(['name' => config('app.name'), 'status' => 'ok', 'docs' => url('/docs')]));

// Interactive API documentation (Swagger UI), reading docs/openapi.yaml.
Route::get('/docs', fn () => view('docs'));
Route::get('/docs/openapi.yaml', function () {
    return response()->file(base_path('docs/openapi.yaml'), ['Content-Type' => 'application/yaml']);
});
