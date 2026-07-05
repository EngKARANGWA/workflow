<?php

namespace App\Services\Workflow;

use App\Enums\ApprovalDecision;
use App\Enums\ApprovalType;
use App\Enums\AuditAction;
use App\Enums\NotificationType;
use App\Enums\RequestStatus;
use App\Enums\RequestStepStatus;
use App\Exceptions\WorkflowException;
use App\Models\RequestAuditLog;
use App\Models\RequestStep;
use App\Models\RequestStepApprover;
use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowRequest;
use App\Models\WorkflowVersion;
use Illuminate\Support\Facades\DB;

/**
 * The engine: turns a workflow version's static step definitions into a
 * running state machine for one request. Nothing in here knows about "Leave
 * Request" or "Purchase Request" - it only ever reads step_order, conditions,
 * approval_type and approver definitions, which is what keeps the engine
 * generic across arbitrary workflows.
 */
class RequestEngine
{
    public function __construct(
        private readonly ConditionEvaluator $conditions,
        private readonly ApproverResolver $approverResolver,
        private readonly NotificationService $notifications,
    ) {}

    public function submit(Workflow $workflow, User $requester, string $title, array $data): WorkflowRequest
    {
        return DB::transaction(function () use ($workflow, $requester, $title, $data) {
            $version = $workflow->currentVersion();

            if (! $version) {
                throw new WorkflowException('This workflow has no published version to submit against.');
            }

            $request = WorkflowRequest::create([
                'workflow_version_id' => $version->id,
                'requester_id' => $requester->id,
                'title' => $title,
                'data' => $data,
                'status' => RequestStatus::InProgress,
            ]);

            $this->logAudit($request, $requester, AuditAction::Submitted, null, RequestStatus::InProgress->value, null);
            $this->notifications->notify($requester, $request, NotificationType::RequestSubmitted, "Your request \"{$title}\" has been submitted.");

            $this->advanceToNextMatchingStep($request, $version, fromStepOrder: 1);

            return $request->fresh(['steps.workflowStep', 'steps.approvers.user']);
        });
    }

    public function recordDecision(WorkflowRequest $request, User $actor, ApprovalDecision $decision, ?string $comments): WorkflowRequest
    {
        return DB::transaction(function () use ($request, $actor, $decision, $comments) {
            $step = $request->steps()->where('status', RequestStepStatus::Active)->latest('id')->first();

            if (! $step) {
                throw new WorkflowException('This request has no step currently awaiting approval.');
            }

            $approverRow = $step->approvers()->where('user_id', $actor->id)->first();

            if (! $approverRow) {
                throw new WorkflowException('You are not an approver for this request\'s current step.', 403);
            }

            if ($approverRow->decision !== ApprovalDecision::Pending) {
                throw new WorkflowException('You have already acted on this step.', 409);
            }

            $approverRow->update([
                'decision' => $decision,
                'comments' => $comments,
                'decided_at' => now(),
            ]);

            match ($decision) {
                ApprovalDecision::Rejected => $this->finalizeStep($request, $step, RequestStepStatus::Rejected, RequestStatus::Rejected, $actor, $comments),
                ApprovalDecision::Returned => $this->finalizeStep($request, $step, RequestStepStatus::Returned, RequestStatus::Returned, $actor, $comments),
                ApprovalDecision::Approved => $this->handleApproval($request, $step, $actor, $comments),
                default => throw new WorkflowException('Unsupported decision.'),
            };

            return $request->fresh(['steps.workflowStep', 'steps.approvers.user']);
        });
    }

    public function resubmit(WorkflowRequest $request, array $data): WorkflowRequest
    {
        return DB::transaction(function () use ($request, $data) {
            if ($request->status !== RequestStatus::Returned) {
                throw new WorkflowException('Only requests that were returned for modification can be resubmitted.');
            }

            $step = $request->steps()->where('status', RequestStepStatus::Returned)->latest('id')->first();
            $previous = $request->status->value;

            $request->update(['data' => $data, 'status' => RequestStatus::InProgress]);
            $step->update(['status' => RequestStepStatus::Active, 'completed_at' => null]);
            $step->approvers()->update(['decision' => ApprovalDecision::Pending, 'decided_at' => null, 'comments' => null]);

            $this->logAudit($request, $request->requester, AuditAction::Resubmitted, $previous, RequestStatus::InProgress->value, null);

            foreach ($step->approvers as $approver) {
                $this->notifications->notify($approver->user, $request, NotificationType::ApprovalPending, "A resubmitted request \"{$request->title}\" is awaiting your approval.");
            }

            return $request->fresh(['steps.workflowStep', 'steps.approvers.user']);
        });
    }

    private function handleApproval(WorkflowRequest $request, RequestStep $step, User $actor, ?string $comments): void
    {
        $workflowStep = $step->workflowStep;

        $isSatisfied = $workflowStep->approval_type === ApprovalType::Single
            || $step->approvers()->where('decision', '!=', ApprovalDecision::Approved)->doesntExist();

        $this->logAudit($request, $actor, AuditAction::Approved, $request->status->value, $request->status->value, $comments);

        if (! $isSatisfied) {
            // "all" approval type and other approvers still pending: record this
            // individual approval but leave the step and request active.
            return;
        }

        $step->update(['status' => RequestStepStatus::Approved, 'completed_at' => now()]);

        $this->advanceToNextMatchingStep($request, $request->workflowVersion, fromStepOrder: $workflowStep->step_order + 1);
    }

    private function finalizeStep(
        WorkflowRequest $request,
        RequestStep $step,
        RequestStepStatus $stepStatus,
        RequestStatus $requestStatus,
        User $actor,
        ?string $comments,
    ): void {
        $previous = $request->status->value;

        $step->update(['status' => $stepStatus, 'completed_at' => now()]);
        $request->update(['status' => $requestStatus]);

        $auditAction = $requestStatus === RequestStatus::Rejected ? AuditAction::Rejected : AuditAction::Returned;
        $this->logAudit($request, $actor, $auditAction, $previous, $requestStatus->value, $comments);

        $notifType = $requestStatus === RequestStatus::Rejected ? NotificationType::RequestRejected : NotificationType::RequestReturned;
        $verb = $requestStatus === RequestStatus::Rejected ? 'rejected' : 'returned for modification';
        $this->notifications->notify($request->requester, $request, $notifType, "Your request \"{$request->title}\" was {$verb}.");
    }

    /**
     * Walks the workflow's steps from $fromStepOrder onward, skipping any
     * whose conditions don't match the request's data, and activates the
     * first one that does. If none match, the request has cleared every
     * remaining step and is approved.
     */
    private function advanceToNextMatchingStep(WorkflowRequest $request, WorkflowVersion $version, int $fromStepOrder): void
    {
        foreach ($version->steps as $step) {
            if ($step->step_order < $fromStepOrder) {
                continue;
            }

            if (! $this->conditions->evaluate($step->conditions, $request->data)) {
                RequestStep::create([
                    'request_id' => $request->id,
                    'workflow_step_id' => $step->id,
                    'status' => RequestStepStatus::Skipped,
                    'completed_at' => now(),
                ]);

                continue;
            }

            $approvers = $this->approverResolver->resolve($step);

            $requestStep = RequestStep::create([
                'request_id' => $request->id,
                'workflow_step_id' => $step->id,
                'status' => RequestStepStatus::Active,
                'started_at' => now(),
            ]);

            if ($approvers->isEmpty()) {
                // No one is currently eligible to approve this step (e.g. an empty
                // role). Rather than deadlocking the request indefinitely, skip it -
                // this is a workflow configuration gap the admin should fix.
                $requestStep->update(['status' => RequestStepStatus::Skipped, 'completed_at' => now()]);

                continue;
            }

            foreach ($approvers as $approver) {
                RequestStepApprover::create([
                    'request_step_id' => $requestStep->id,
                    'user_id' => $approver['user_id'],
                    'acting_for_user_id' => $approver['acting_for_user_id'],
                    'decision' => ApprovalDecision::Pending,
                ]);

                $this->notifications->notify(
                    User::find($approver['user_id']),
                    $request,
                    NotificationType::ApprovalPending,
                    "A request \"{$request->title}\" is awaiting your approval."
                );
            }

            $request->update(['current_step_order' => $step->step_order]);

            return;
        }

        $previous = $request->status->value;
        $request->update(['status' => RequestStatus::Approved, 'current_step_order' => null]);
        $this->logAudit($request, null, AuditAction::Completed, $previous, RequestStatus::Approved->value, 'All required approvals obtained.');
        $this->notifications->notify($request->requester, $request, NotificationType::RequestApproved, "Your request \"{$request->title}\" has been approved.");
    }

    private function logAudit(WorkflowRequest $request, ?User $actor, AuditAction $action, ?string $previousStatus, ?string $newStatus, ?string $comments): void
    {
        RequestAuditLog::create([
            'request_id' => $request->id,
            'user_id' => $actor?->id,
            'action' => $action,
            'previous_status' => $previousStatus,
            'new_status' => $newStatus,
            'comments' => $comments,
        ]);
    }
}
