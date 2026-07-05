<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDelegationRequest;
use App\Models\Delegation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DelegationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $delegations = Delegation::with(['delegator', 'delegate'])
            ->where('delegator_id', $user->id)
            ->orWhere('delegate_id', $user->id)
            ->latest('starts_at')
            ->get();

        return response()->json($delegations);
    }

    public function store(StoreDelegationRequest $request): JsonResponse
    {
        $delegation = Delegation::create([
            'delegator_id' => $request->user()->id,
            'delegate_id' => $request->integer('delegate_id'),
            'starts_at' => $request->date('starts_at'),
            'ends_at' => $request->date('ends_at'),
        ]);

        return response()->json($delegation->load(['delegator', 'delegate']), 201);
    }

    public function destroy(Request $request, Delegation $delegation): JsonResponse
    {
        if ($delegation->delegator_id !== $request->user()->id && ! $request->user()->isAdmin()) {
            abort(403, 'Only the delegator or an administrator can revoke this delegation.');
        }

        $delegation->delete();

        return response()->json(status: 204);
    }
}
