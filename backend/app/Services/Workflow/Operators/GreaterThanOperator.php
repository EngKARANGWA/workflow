<?php

namespace App\Services\Workflow\Operators;

use App\Services\Workflow\Contracts\ConditionOperator;

class GreaterThanOperator implements ConditionOperator
{
    public function evaluate(mixed $actual, mixed $expected): bool
    {
        return is_numeric($actual) && is_numeric($expected) && (float) $actual > (float) $expected;
    }
}
