<?php

namespace App\Services\Workflow\Contracts;

interface ConditionOperator
{
    public function evaluate(mixed $actual, mixed $expected): bool;
}
