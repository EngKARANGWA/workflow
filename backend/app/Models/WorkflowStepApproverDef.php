<?php

namespace App\Models;

use App\Enums\ApproverType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkflowStepApproverDef extends Model
{
    protected $fillable = [
        'workflow_step_id',
        'approver_type',
        'role_id',
        'user_id',
    ];

    protected function casts(): array
    {
        return [
            'approver_type' => ApproverType::class,
        ];
    }

    public function workflowStep(): BelongsTo
    {
        return $this->belongsTo(WorkflowStep::class);
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
