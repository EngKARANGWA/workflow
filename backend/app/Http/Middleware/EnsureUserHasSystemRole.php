<?php

namespace App\Http\Middleware;

use App\Enums\SystemRole;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasSystemRole
{
    /**
     * Restrict a route to one or more system roles, e.g. `role:system_administrator,approver`.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! in_array($user->system_role, array_map(SystemRole::from(...), $roles), true)) {
            abort(403, 'You do not have permission to perform this action.');
        }

        return $next($request);
    }
}
