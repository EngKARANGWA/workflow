<?php

namespace App\Services\Workflow;

use App\Models\User;
use App\Models\Workflow;
use App\Models\WorkflowVersion;
use Illuminate\Support\Facades\DB;

/**
 * Owns workflow lifecycle and versioning. The versioning rule this exists to
 * enforce: a workflow's steps are never mutated in place. Every edit produces
 * a brand new WorkflowVersion snapshot, and requests keep pointing at the
 * exact version they started under - so editing a workflow can never change
 * the rules underneath a request that's already in flight.
 */
class WorkflowService
{
    public function create(array $data, User $creator): Workflow
    {
        return DB::transaction(function () use ($data, $creator) {
            $workflow = Workflow::create([
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'is_active' => true,
                'created_by' => $creator->id,
            ]);

            $this->publishVersion($workflow, $data['steps'], $creator, versionNumber: 1);

            return $workflow->load('versions.steps.approverDefs');
        }, 3);
    }

    public function updateMeta(Workflow $workflow, array $data): Workflow
    {
        $workflow->update($data);

        return $workflow->fresh();
    }

    /**
     * Publishes a new version with a fresh step definition, superseding
     * whichever version was previously current. The old version and every
     * request tied to it are left completely untouched.
     */
    public function publishNewVersion(Workflow $workflow, array $steps, User $editor): WorkflowVersion
    {
        return DB::transaction(function () use ($workflow, $steps, $editor) {
            $nextVersionNumber = ($workflow->versions()->max('version_number') ?? 0) + 1;

            $workflow->versions()->where('is_current', true)->update(['is_current' => false]);

            return $this->publishVersion($workflow, $steps, $editor, $nextVersionNumber);
        }, 3);
    }

    private function publishVersion(Workflow $workflow, array $steps, User $editor, int $versionNumber): WorkflowVersion
    {
        $version = $workflow->versions()->create([
            'version_number' => $versionNumber,
            'is_current' => true,
            'created_by' => $editor->id,
        ]);

        foreach (array_values($steps) as $index => $stepData) {
            $step = $version->steps()->create([
                'step_order' => $index + 1,
                'approval_type' => $stepData['approval_type'],
                'conditions' => $stepData['conditions'] ?? null,
            ]);

            foreach ($stepData['approvers'] as $approver) {
                $step->approverDefs()->create([
                    'approver_type' => $approver['approver_type'],
                    'role_id' => $approver['role_id'] ?? null,
                    'user_id' => $approver['user_id'] ?? null,
                ]);
            }
        }

        return $version->load('steps.approverDefs');
    }
}
