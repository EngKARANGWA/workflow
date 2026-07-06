<?php

namespace App\Services\Workflow\Operators;

use App\Services\Workflow\Contracts\ConditionOperator;

class NotEqualsOperator implements ConditionOperator
{
    public function __construct(private readonly EqualsOperator $equals) {}

    public function evaluate(mixed $actual, mixed $expected): bool
    {
        return ! $this->equals->evaluate($actual, $expected);
    }
}
