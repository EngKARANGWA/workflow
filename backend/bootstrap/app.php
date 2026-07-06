<?php

use App\Exceptions\WorkflowException;
use App\Http\Middleware\EnsureUserHasSystemRole;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => EnsureUserHasSystemRole::class,
        ]);

        // This is an API-only app with no 'login' route, so skip Laravel's default
        // guest redirect (which otherwise crashes resolving route('login')) and let
        // the render() callback below turn it into a clean 401 instead.
        $middleware->redirectGuestsTo(fn () => null);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // This is an API-only backend, so every /api/* request should get a JSON
        // error body regardless of the client's Accept header (many HTTP clients
        // don't send one), instead of Laravel's default HTML/redirect-to-login page.
        $exceptions->shouldRenderJsonWhen(fn ($request) => $request->is('api/*'));

        // Laravel's default unauthenticated handler falls back to route('login')
        // for non-JSON requests, which doesn't exist in this API-only app. Handle
        // it explicitly so a missing/expired token is always a clean 401.
        $exceptions->render(function (AuthenticationException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }
        });

        $exceptions->render(function (WorkflowException $e, $request) {
            if ($request->is('api/*')) {
                return response()->json(['message' => $e->getMessage()], $e->status);
            }
        });
    })->create();
