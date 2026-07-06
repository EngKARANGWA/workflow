<?php

namespace Tests\Feature;

use App\Enums\ApprovalDecision;
use App\Enums\RequestStatus;
use App\Exceptions\WorkflowException;
use App\Models\Delegation;
use App\Models\Role;
use App\Models\User;
use App\Models\Workflow;
use App\Services\Workflow\RequestEngine;
use App\Services\Workflow\WorkflowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class RequestApprovalFlowTest extends TestCase
{
    use RefreshDatabase;

    private function makeWorkflow(array $steps): Workflow
    {
        $admin = User::factory()->admin()->create();

        return app(WorkflowService::class)->create([
            'name' => 'Test Workflow',
            'description' => null,
            'steps' => $steps,
        ], $admin);
    }

    #[Test]
    public function a_sequential_two_step_workflow_progresses_through_both_approvers(): void
    {
        $manager = Role::factory()->create(['name' => 'Manager']);
        $finance = Role::factory()->create(['name' => 'Finance']);
        $managerUser = User::factory()->approver()->create();
        $financeUser = User::factory()->approver()->create();
        $managerUser->roles()->attach($manager);
        $financeUser->roles()->attach($finance);
        $requester = User::factory()->create();

        $workflow = $this->makeWorkflow([
            ['approval_type' => 'single', 'approvers' => [['approver_type' => 'role', 'role_id' => $manager->id]]],
            ['approval_type' => 'single', 'approvers' => [['approver_type' => 'role', 'role_id' => $finance->id]]],
        ]);

        $engine = app(RequestEngine::class);
        $request = $engine->submit($workflow, $requester, 'Laptop', ['amount' => 500]);

        $this->assertSame(RequestStatus::InProgress, $request->status);
        $this->assertSame(1, $request->current_step_order);

        $request = $engine->recordDecision($request, $managerUser, ApprovalDecision::Approved, null);
        $this->assertSame(2, $request->current_step_order);
        $this->assertSame(RequestStatus::InProgress, $request->status);

        $request = $engine->recordDecision($request, $financeUser, ApprovalDecision::Approved, null);
        $this->assertSame(RequestStatus::Approved, $request->status);
        $this->assertNull($request->current_step_order);
    }

    #[Test]
    public function a_step_with_an_unmet_condition_is_skipped(): void
    {
        $manager = Role::factory()->create(['name' => 'Manager']);
        $finance = Role::factory()->create(['name' => 'Finance']);
        $managerUser = User::factory()->approver()->create();
        User::factory()->approver()->create()->roles()->attach($finance);
        $managerUser->roles()->attach($manager);
        $requester = User::factory()->create();

        $workflow = $this->makeWorkflow([
            ['approval_type' => 'single', 'approvers' => [['approver_type' => 'role', 'role_id' => $manager->id]]],
            [
                'approval_type' => 'single',
                'conditions' => [['field' => 'amount', 'operator' => 'greater_than', 'value' => 10000]],
                'approvers' => [['approver_type' => 'role', 'role_id' => $finance->id]],
            ],
        ]);

        $engine = app(RequestEngine::class);
        // Amount below the Finance step's threshold - that step should be skipped entirely.
        $request = $engine->submit($workflow, $requester, 'Pens', ['amount' => 50]);
        $request = $engine->recordDecision($request, $managerUser, ApprovalDecision::Approved, null);

        $this->assertSame(RequestStatus::Approved, $request->status);
        $this->assertSame('skipped', $request->steps()->latest('id')->first()->status->value);
    }

    #[Test]
    public function a_parallel_all_approval_step_requires_every_assigned_approver(): void
    {
        $finance = Role::factory()->create(['name' => 'Finance']);
        $legal = Role::factory()->create(['name' => 'Legal']);
        $financeUser = User::factory()->approver()->create();
        $legalUser = User::factory()->approver()->create();
        $financeUser->roles()->attach($finance);
        $legalUser->roles()->attach($legal);
        $requester = User::factory()->create();

        $workflow = $this->makeWorkflow([
            [
                'approval_type' => 'all',
                'approvers' => [
                    ['approver_type' => 'role', 'role_id' => $finance->id],
                    ['approver_type' => 'role', 'role_id' => $legal->id],
                ],
            ],
        ]);

        $engine = app(RequestEngine::class);
        $request = $engine->submit($workflow, $requester, 'Contract', ['amount' => 20000]);

        $request = $engine->recordDecision($request, $financeUser, ApprovalDecision::Approved, null);
        $this->assertSame(RequestStatus::InProgress, $request->status, 'Request should still be waiting on Legal.');

        $request = $engine->recordDecision($request, $legalUser, ApprovalDecision::Approved, null);
        $this->assertSame(RequestStatus::Approved, $request->status);
    }

    #[Test]
    public function a_single_rejection_rejects_the_whole_request_even_under_all_approval(): void
    {
        $finance = Role::factory()->create(['name' => 'Finance']);
        $legal = Role::factory()->create(['name' => 'Legal']);
        $financeUser = User::factory()->approver()->create();
        $legalUser = User::factory()->approver()->create();
        $financeUser->roles()->attach($finance);
        $legalUser->roles()->attach($legal);
        $requester = User::factory()->create();

        $workflow = $this->makeWorkflow([
            [
                'approval_type' => 'all',
                'approvers' => [
                    ['approver_type' => 'role', 'role_id' => $finance->id],
                    ['approver_type' => 'role', 'role_id' => $legal->id],
                ],
            ],
        ]);

        $engine = app(RequestEngine::class);
        $request = $engine->submit($workflow, $requester, 'Contract', ['amount' => 20000]);
        $request = $engine->recordDecision($request, $legalUser, ApprovalDecision::Rejected, 'No budget');

        $this->assertSame(RequestStatus::Rejected, $request->status);
    }

    #[Test]
    public function returning_a_request_lets_the_requester_resubmit_it_to_the_same_step(): void
    {
        $manager = Role::factory()->create(['name' => 'Manager']);
        $managerUser = User::factory()->approver()->create();
        $managerUser->roles()->attach($manager);
        $requester = User::factory()->create();

        $workflow = $this->makeWorkflow([
            ['approval_type' => 'single', 'approvers' => [['approver_type' => 'role', 'role_id' => $manager->id]]],
        ]);

        $engine = app(RequestEngine::class);
        $request = $engine->submit($workflow, $requester, 'Chair', ['amount' => 100]);
        $request = $engine->recordDecision($request, $managerUser, ApprovalDecision::Returned, 'Add a quote');

        $this->assertSame(RequestStatus::Returned, $request->status);

        $request = $engine->resubmit($request, ['amount' => 100, 'quote_url' => 'http://example.com']);

        $this->assertSame(RequestStatus::InProgress, $request->status);
        $this->assertSame('active', $request->steps()->latest('id')->first()->status->value);
    }

    #[Test]
    public function an_active_delegation_routes_the_approval_to_the_delegate_with_full_traceability(): void
    {
        $manager = Role::factory()->create(['name' => 'Manager']);
        $managerUser = User::factory()->approver()->create();
        $delegateUser = User::factory()->approver()->create();
        $managerUser->roles()->attach($manager);
        $requester = User::factory()->create();

        Delegation::create([
            'delegator_id' => $managerUser->id,
            'delegate_id' => $delegateUser->id,
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addDay(),
        ]);

        $workflow = $this->makeWorkflow([
            ['approval_type' => 'single', 'approvers' => [['approver_type' => 'role', 'role_id' => $manager->id]]],
        ]);

        $engine = app(RequestEngine::class);
        $request = $engine->submit($workflow, $requester, 'Chair', ['amount' => 100]);

        $approverRow = $request->steps->first()->approvers->first();
        $this->assertSame($delegateUser->id, $approverRow->user_id);
        $this->assertSame($managerUser->id, $approverRow->acting_for_user_id);

        // The original approver (who delegated their authority away) can no longer act.
        $this->expectException(WorkflowException::class);
        $engine->recordDecision($request, $managerUser, ApprovalDecision::Approved, null);
    }

    #[Test]
    public function a_user_who_is_not_the_assigned_approver_cannot_act_on_a_step(): void
    {
        $manager = Role::factory()->create(['name' => 'Manager']);
        $managerUser = User::factory()->approver()->create();
        $managerUser->roles()->attach($manager);
        $stranger = User::factory()->approver()->create();
        $requester = User::factory()->create();

        $workflow = $this->makeWorkflow([
            ['approval_type' => 'single', 'approvers' => [['approver_type' => 'role', 'role_id' => $manager->id]]],
        ]);

        $engine = app(RequestEngine::class);
        $request = $engine->submit($workflow, $requester, 'Chair', ['amount' => 100]);

        $this->expectException(WorkflowException::class);
        $engine->recordDecision($request, $stranger, ApprovalDecision::Approved, null);
    }

    #[Test]
    public function an_approver_cannot_act_twice_on_the_same_step(): void
    {
        // An "all" step with two approvers keeps the step active after only one
        // of them has acted, which is what lets us exercise the "already acted"
        // guard directly instead of the separate "no active step" guard.
        $finance = Role::factory()->create(['name' => 'Finance']);
        $legal = Role::factory()->create(['name' => 'Legal']);
        $financeUser = User::factory()->approver()->create();
        $legalUser = User::factory()->approver()->create();
        $financeUser->roles()->attach($finance);
        $legalUser->roles()->attach($legal);
        $requester = User::factory()->create();

        $workflow = $this->makeWorkflow([
            [
                'approval_type' => 'all',
                'approvers' => [
                    ['approver_type' => 'role', 'role_id' => $finance->id],
                    ['approver_type' => 'role', 'role_id' => $legal->id],
                ],
            ],
        ]);

        $engine = app(RequestEngine::class);
        $request = $engine->submit($workflow, $requester, 'Contract', ['amount' => 20000]);
        $request = $engine->recordDecision($request, $financeUser, ApprovalDecision::Approved, null);

        $this->expectException(WorkflowException::class);
        $engine->recordDecision($request, $financeUser, ApprovalDecision::Approved, null);
    }
}
