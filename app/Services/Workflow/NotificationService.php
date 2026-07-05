<?php

namespace App\Services\Workflow;

use App\Enums\NotificationType;
use App\Models\AppNotification;
use App\Models\User;
use App\Models\WorkflowRequest;

/**
 * In-app notifications only for this submission (see README "Notifications"
 * trade-off) - a NotificationChannel contract would be the natural extension
 * point for adding email/Slack/etc. later without touching call sites.
 */
class NotificationService
{
    public function notify(User $user, WorkflowRequest $request, NotificationType $type, string $message): void
    {
        AppNotification::create([
            'user_id' => $user->id,
            'request_id' => $request->id,
            'type' => $type,
            'message' => $message,
        ]);
    }
}
