<?php

namespace App\Models;

use App\Enums\AuditAction;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RequestAuditLog extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'request_id',
        'user_id',
        'action',
        'previous_status',
        'new_status',
        'comments',
    ];

    protected function casts(): array
    {
        return [
            'action' => AuditAction::class,
            'created_at' => 'datetime',
        ];
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(WorkflowRequest::class, 'request_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Audit records are append-only: once written, they must never change or
     * disappear, so updates/deletes are refused at the model layer regardless
     * of how they're attempted.
     */
    protected static function booted(): void
    {
        static::updating(fn () => throw new \LogicException('Audit log records are immutable.'));
        static::deleting(fn () => throw new \LogicException('Audit log records cannot be deleted.'));
    }
}
