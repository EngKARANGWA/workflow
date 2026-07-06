<?php

namespace App\Services\Workflow;

use App\Services\Workflow\Contracts\ConditionOperator;
use App\Services\Workflow\Operators\EqualsOperator;
use App\Services\Workflow\Operators\GreaterThanOperator;
use App\Services\Workflow\Operators\GreaterThanOrEqualOperator;
use App\Services\Workflow\Operators\InOperator;
use App\Services\Workflow\Operators\LessThanOperator;
use App\Services\Workflow\Operators\LessThanOrEqualOperator;
use App\Services\Workflow\Operators\NotEqualsOperator;
use Illuminate\Support\Arr;
use InvalidArgumentException;

/**
 * Evaluates a workflow step's stored `conditions` JSON against a request's
 * data payload. Conditions are a flat list of {field, operator, value} rules
 * combined with AND semantics - deliberately simple for now (see README for
 * the OR/nested-group trade-off), but new operators plug in without touching
 * this class, since each one is its own Strategy behind the ConditionOperator
 * contract.
 */
class ConditionEvaluator
{
    /** @var array<string, ConditionOperator> */
    private array $operators;

    public function __construct()
    {
        $equals = new EqualsOperator;

        $this->operators = [
            'equals' => $equals,
            'not_equals' => new NotEqualsOperator($equals),
            'greater_than' => new GreaterThanOperator,
            'greater_than_or_equal' => new GreaterThanOrEqualOperator,
            'less_than' => new LessThanOperator,
            'less_than_or_equal' => new LessThanOrEqualOperator,
            'in' => new InOperator,
        ];
    }

    /**
     * @param  array<int, array{field: string, operator: string, value: mixed}>|null  $conditions
     */
    public function evaluate(?array $conditions, array $context): bool
    {
        if (empty($conditions)) {
            return true;
        }

        foreach ($conditions as $condition) {
            $operator = $this->operators[$condition['operator']]
                ?? throw new InvalidArgumentException("Unknown condition operator [{$condition['operator']}].");

            $actual = Arr::get($context, $condition['field']);

            if (! $operator->evaluate($actual, $condition['value'])) {
                return false;
            }
        }

        return true;
    }

    public function supportedOperators(): array
    {
        return array_keys($this->operators);
    }
}
