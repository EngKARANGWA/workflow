<?php

namespace App\Http\Requests\Concerns;

use App\Enums\ApprovalType;
use App\Enums\ApproverType;
use App\Services\Workflow\ConditionEvaluator;
use Illuminate\Validation\Rule;

/**
 * Shared step/approver/condition validation rules for both "define a
 * workflow" and "publish a new version" requests, so the two payloads
 * (which share the exact same step shape) can't drift apart over time.
 */
trait ValidatesWorkflowSteps
{
    protected function stepRules(): array
    {
        $operators = app(ConditionEvaluator::class)->supportedOperators();

        return [
            'steps' => ['required', 'array', 'min:1'],
            'steps.*.approval_type' => ['required', Rule::enum(ApprovalType::class)],
            'steps.*.conditions' => ['sometimes', 'nullable', 'array'],
            'steps.*.conditions.*.field' => ['required_with:steps.*.conditions', 'string'],
            'steps.*.conditions.*.operator' => ['required_with:steps.*.conditions', Rule::in($operators)],
            'steps.*.conditions.*.value' => ['required_with:steps.*.conditions'],
            'steps.*.approvers' => ['required', 'array', 'min:1'],
            'steps.*.approvers.*.approver_type' => ['required', Rule::enum(ApproverType::class)],
            'steps.*.approvers.*.role_id' => ['required_if:steps.*.approvers.*.approver_type,role', 'nullable', 'integer', 'exists:roles,id'],
            'steps.*.approvers.*.user_id' => ['required_if:steps.*.approvers.*.approver_type,user', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
