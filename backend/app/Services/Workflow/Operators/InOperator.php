<?php

namespace App\Services\Workflow\Operators;

use App\Services\Workflow\Contracts\ConditionOperator;

class InOperator implements ConditionOperator
{
    public function evaluate(mixed $actual, mixed $expected): bool
    {
        $haystack = is_array($expected) ? $expected : [$expected];

        return in_array(mb_strtolower((string) $actual), array_map(fn ($v) => mb_strtolower((string) $v), $haystack), true);
    }
}
