<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreWorkflowRequest;
use App\Http\Requests\StoreWorkflowVersionRequest;
use App\Http\Requests\UpdateWorkflowRequest;
use App\Models\Workflow;
use App\Services\Workflow\WorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkflowController extends Controller
{
    public function __construct(private readonly WorkflowService $workflows) {}

    public function index(Request $request): JsonResponse
    {
        $workflows = Workflow::with('currentVersion')
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->paginate($request->integer('per_page', 20));

        return response()->json($workflows);
    }

    public function store(StoreWorkflowRequest $request): JsonResponse
    {
        $workflow = $this->workflows->create($request->validated(), $request->user());

        return response()->json($workflow, 201);
    }

    public function show(Workflow $workflow): JsonResponse
    {
        return response()->json(
            $workflow->load(['creator', 'versions.steps.approverDefs.role', 'versions.steps.approverDefs.user'])
        );
    }

    public function update(UpdateWorkflowRequest $request, Workflow $workflow): JsonResponse
    {
        return response()->json($this->workflows->updateMeta($workflow, $request->validated()));
    }

    public function storeVersion(StoreWorkflowVersionRequest $request, Workflow $workflow): JsonResponse
    {
        $version = $this->workflows->publishNewVersion($workflow, $request->validated()['steps'], $request->user());

        return response()->json($version, 201);
    }

    public function versions(Workflow $workflow): JsonResponse
    {
        return response()->json($workflow->versions()->with('steps.approverDefs')->get());
    }
}
