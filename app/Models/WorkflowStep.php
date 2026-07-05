<?php

namespace App\Models;

use App\Enums\ApprovalType;
use App\Enums\ApproverType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkflowStep extends Model
{
    protected $fillable = [
        'workflow_version_id',
        'step_order',
        'approver_type',
        'approver_role_id',
        'approver_user_id',
        'approval_type',
        'conditions',
    ];

    protected function casts(): array
    {
        return [
            'approver_type' => ApproverType::class,
            'approval_type' => ApprovalType::class,
            'conditions' => 'array',
        ];
    }

    public function workflowVersion(): BelongsTo
    {
        return $this->belongsTo(WorkflowVersion::class);
    }

    public function approverRole(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'approver_role_id');
    }

    public function approverUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_user_id');
    }

    public function requestSteps(): HasMany
    {
        return $this->hasMany(RequestStep::class);
    }
}
