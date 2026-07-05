<?php

namespace Tests\Unit;

use App\Services\Workflow\ConditionEvaluator;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

class ConditionEvaluatorTest extends TestCase
{
    private ConditionEvaluator $evaluator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->evaluator = new ConditionEvaluator;
    }

    #[Test]
    public function no_conditions_always_matches(): void
    {
        $this->assertTrue($this->evaluator->evaluate(null, []));
        $this->assertTrue($this->evaluator->evaluate([], ['amount' => 5]));
    }

    #[Test]
    public function greater_than_matches_numeric_values(): void
    {
        $conditions = [['field' => 'amount', 'operator' => 'greater_than', 'value' => 10000]];

        $this->assertTrue($this->evaluator->evaluate($conditions, ['amount' => 15000]));
        $this->assertFalse($this->evaluator->evaluate($conditions, ['amount' => 5000]));
        $this->assertFalse($this->evaluator->evaluate($conditions, ['amount' => 10000]));
    }

    #[Test]
    public function equals_is_case_insensitive_for_strings(): void
    {
        $conditions = [['field' => 'department', 'operator' => 'equals', 'value' => 'Finance']];

        $this->assertTrue($this->evaluator->evaluate($conditions, ['department' => 'finance']));
        $this->assertTrue($this->evaluator->evaluate($conditions, ['department' => 'FINANCE']));
        $this->assertFalse($this->evaluator->evaluate($conditions, ['department' => 'Legal']));
    }

    #[Test]
    public function multiple_conditions_are_combined_with_and(): void
    {
        $conditions = [
            ['field' => 'amount', 'operator' => 'greater_than', 'value' => 10000],
            ['field' => 'department', 'operator' => 'equals', 'value' => 'Finance'],
        ];

        $this->assertTrue($this->evaluator->evaluate($conditions, ['amount' => 15000, 'department' => 'Finance']));
        $this->assertFalse($this->evaluator->evaluate($conditions, ['amount' => 15000, 'department' => 'Legal']));
        $this->assertFalse($this->evaluator->evaluate($conditions, ['amount' => 5000, 'department' => 'Finance']));
    }

    #[Test]
    public function in_operator_matches_any_value_in_list(): void
    {
        $conditions = [['field' => 'country', 'operator' => 'in', 'value' => ['Rwanda', 'Kenya']]];

        $this->assertTrue($this->evaluator->evaluate($conditions, ['country' => 'rwanda']));
        $this->assertFalse($this->evaluator->evaluate($conditions, ['country' => 'Uganda']));
    }

    #[Test]
    public function missing_field_in_context_does_not_match_comparison_operators(): void
    {
        $conditions = [['field' => 'amount', 'operator' => 'greater_than', 'value' => 100]];

        $this->assertFalse($this->evaluator->evaluate($conditions, []));
    }

    #[Test]
    public function unknown_operator_throws(): void
    {
        $this->expectException(\InvalidArgumentException::class);

        $this->evaluator->evaluate([['field' => 'x', 'operator' => 'bogus', 'value' => 1]], ['x' => 1]);
    }
}
