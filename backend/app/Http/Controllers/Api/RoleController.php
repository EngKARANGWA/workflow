<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRoleRequest;
use App\Models\Role;
use Illuminate\Http\JsonResponse;

class RoleController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Role::all());
    }

    public function store(StoreRoleRequest $request): JsonResponse
    {
        return response()->json(Role::create($request->validated()), 201);
    }

    public function destroy(Role $role): JsonResponse
    {
        $role->delete();

        return response()->json(status: 204);
    }
}
