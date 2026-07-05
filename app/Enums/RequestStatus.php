<?php

namespace App\Enums;

enum RequestStatus: string
{
    case InProgress = 'in_progress';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Returned = 'returned';
}
