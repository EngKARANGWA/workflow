<?php

namespace App\Enums;

enum SystemRole: string
{
    case Admin = 'system_administrator';
    case Approver = 'approver';
    case Requester = 'requester';
}
