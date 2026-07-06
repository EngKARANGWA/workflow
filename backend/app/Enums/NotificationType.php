<?php

namespace App\Enums;

enum NotificationType: string
{
    case RequestSubmitted = 'request_submitted';
    case RequestApproved = 'request_approved';
    case RequestRejected = 'request_rejected';
    case RequestReturned = 'request_returned';
    case ApprovalPending = 'approval_pending';
}
