<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Services\Workflow\RequestEngine;
use App\Services\Workflow\WorkflowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class WorkflowManagementTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function an_admin_can_create_a_workflow_with_multiple_steps_via_the_api(): void
    {
        $admin = User::factory()->admin()->create();
        $role = Role::factory()->create(['name' => 'Manager']);

        $response = $this->actingAs($admin, 'sanctum')->postJson('/api/workflows', [
            'name' => 'Leave Request',
            'description' => 'Time off approval',
            'steps' => [
                [
                    'approval_type' => 'single',
                    'approvers' => [['approver_type' => 'role', 'role_id' => $role->id]],
                ],
            ],
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('workflows', ['name' => 'Leave Request', 'is_active' => true]);
        $this->assertDatabaseHas('workflow_versions', ['workflow_id' => $response->json('id'), 'version_number' => 1, 'is_current' => true]);
    }

    #[Test]
    public function editing_a_workflow_creates_a_new_version_without_touching_requests_already_in_flight(): void
    {
        $admin = User::factory()->admin()->create();
        $requester = User::factory()->create();
        $roleV1 = Role::factory()->create(['name' => 'Manager']);
        $roleV2 = Role::factory()->create(['name' => 'Director']);

        $workflowService = app(WorkflowService::class);

        $workflow = $workflowService->create([
            'name' => 'Purchase Request',
            'description' => null,
            'steps' => [
                ['approval_type' => 'single', 'approvers' => [['approver_type' => 'role', 'role_id' => $roleV1->id]]],
            ],
        ], $admin);

        // A request is submitted against version 1 while it is current.
        $request = app(RequestEngine::class)->submit($workflow, $requester, 'Chairs', ['amount' => 100]);
        $originalVersionId = $request->workflow_version_id;

        // Admin now edits the workflow, publishing version 2 with a different approver.
        $workflowService->publishNewVersion($workflow->fresh(), [
            ['approval_type' => 'single', 'approvers' => [['approver_type' => 'role', 'role_id' => $roleV2->id]]],
        ], $admin);

        $request->refresh();

        $this->assertSame($originalVersionId, $request->workflow_version_id);
        $this->assertSame(2, $workflow->fresh()->versions()->count());
        $this->assertSame(2, $workflow->fresh()->currentVersion()->version_number);
        $this->assertSame($roleV1->id, $request->steps->first()->workflowStep->approverDefs->first()->role_id);
    }
}
