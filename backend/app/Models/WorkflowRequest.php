<?php

namespace App\Models;

use App\Enums\RequestStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkflowRequest extends Model
{
    protected $table = 'requests';

    protected $fillable = [
        'workflow_version_id',
        'requester_id',
        'title',
        'data',
        'status',
        'current_step_order',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'status' => RequestStatus::class,
        ];
    }

    public function workflowVersion(): BelongsTo
    {
        return $this->belongsTo(WorkflowVersion::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function steps(): HasMany
    {
        return $this->hasMany(RequestStep::class, 'request_id');
    }

    public function currentStep(): ?RequestStep
    {
        return $this->steps()
            ->whereHas('workflowStep', fn ($q) => $q->where('step_order', $this->current_step_order))
            ->first();
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(RequestAuditLog::class, 'request_id')->latest('created_at');
    }
}
