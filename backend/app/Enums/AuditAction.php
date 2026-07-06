<?php

namespace App\Enums;

enum AuditAction: string
{
    case Submitted = 'submitted';
    case Resubmitted = 'resubmitted';
    case StepAdvanced = 'step_advanced';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Returned = 'returned';
    case Completed = 'completed';
}
