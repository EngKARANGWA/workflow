<?php

namespace App\Models;

use App\Enums\ApprovalType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkflowStep extends Model
{
    protected $fillable = [
        'workflow_version_id',
        'step_order',
        'approval_type',
        'conditions',
    ];

    protected function casts(): array
    {
        return [
            'approval_type' => ApprovalType::class,
            'conditions' => 'array',
        ];
    }

    public function workflowVersion(): BelongsTo
    {
        return $this->belongsTo(WorkflowVersion::class);
    }

    public function approverDefs(): HasMany
    {
        return $this->hasMany(WorkflowStepApproverDef::class);
    }

    public function requestSteps(): HasMany
    {
        return $this->hasMany(RequestStep::class);
    }
}
