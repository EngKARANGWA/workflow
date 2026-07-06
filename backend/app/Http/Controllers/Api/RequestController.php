<?php

namespace App\Http\Controllers\Api;

use App\Enums\ApprovalDecision;
use App\Enums\RequestStepStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\RecordDecisionRequest;
use App\Http\Requests\ResubmitRequestRequest;
use App\Http\Requests\StoreWorkflowRequestRequest;
use App\Models\Workflow;
use App\Models\WorkflowRequest;
use App\Services\Workflow\RequestEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RequestController extends Controller
{
    public function __construct(private readonly RequestEngine $engine) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $scope = $request->query('scope', 'mine');

        $query = WorkflowRequest::with(['requester', 'workflowVersion.workflow']);

        $query = match ($scope) {
            'pending_my_approval' => $query->whereHas(
                'steps',
                fn ($q) => $q->where('status', RequestStepStatus::Active)
                    ->whereHas('approvers', fn ($a) => $a->where('user_id', $user->id)->where('decision', ApprovalDecision::Pending))
            ),
            'all' => $user->isAdmin()
                ? $query
                : abort(403, 'Only administrators can view all requests.'),
            default => $query->where('requester_id', $user->id),
        };

        return response()->json($query->latest('id')->paginate($request->integer('per_page', 20)));
    }

    public function store(StoreWorkflowRequestRequest $request): JsonResponse
    {
        $workflow = Workflow::findOrFail($request->integer('workflow_id'));

        $created = $this->engine->submit($workflow, $request->user(), $request->string('title'), $request->input('data'));

        return response()->json($created, 201);
    }

    public function show(Request $request, WorkflowRequest $workflowRequest): JsonResponse
    {
        $this->authorizeAccess($request, $workflowRequest);

        return response()->json(
            $workflowRequest->load(['requester', 'workflowVersion.workflow', 'steps.workflowStep', 'steps.approvers.user'])
        );
    }

    public function history(Request $request, WorkflowRequest $workflowRequest): JsonResponse
    {
        $this->authorizeAccess($request, $workflowRequest);

        return response()->json($workflowRequest->auditLogs()->with('user')->get());
    }

    public function decide(RecordDecisionRequest $request, WorkflowRequest $workflowRequest): JsonResponse
    {
        $updated = $this->engine->recordDecision(
            $workflowRequest,
            $request->user(),
            ApprovalDecision::from($request->string('decision')->toString()),
            $request->input('comments'),
        );

        return response()->json($updated);
    }

    public function resubmit(ResubmitRequestRequest $request, WorkflowRequest $workflowRequest): JsonResponse
    {
        if ($workflowRequest->requester_id !== $request->user()->id) {
            abort(403, 'Only the original requester can resubmit this request.');
        }

        return response()->json($this->engine->resubmit($workflowRequest, $request->input('data')));
    }

    private function authorizeAccess(Request $request, WorkflowRequest $workflowRequest): void
    {
        $user = $request->user();

        $isOwner = $workflowRequest->requester_id === $user->id;
        $isApprover = $workflowRequest->steps()->whereHas('approvers', fn ($q) => $q->where('user_id', $user->id))->exists();

        if (! $user->isAdmin() && ! $isOwner && ! $isApprover) {
            abort(403, 'You do not have access to this request.');
        }
    }
}
