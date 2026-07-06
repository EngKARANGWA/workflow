<?php

namespace App\Services\Workflow;

use App\Enums\ApproverType;
use App\Models\WorkflowStep;
use Illuminate\Support\Collection;

/**
 * Turns a step's abstract approver definitions (a role, or a specific user)
 * into the concrete set of people who must act on it, substituting an active
 * delegate for anyone who has delegated their approval authority away.
 *
 * Keeping this as its own class - rather than inlining it into the engine -
 * is what lets "role" and "specific user" (and any future approver type)
 * plug in without the request-processing logic ever branching on them.
 */
class ApproverResolver
{
    /**
     * @return Collection<int, array{user_id: int, acting_for_user_id: ?int}>
     *         keyed by the acting user's id, so the same person is never
     *         listed twice even if they cover multiple approver definitions.
     */
    public function resolve(WorkflowStep $step): Collection
    {
        $resolved = collect();

        foreach ($step->approverDefs as $def) {
            $candidates = match ($def->approver_type) {
                ApproverType::User => collect([$def->user])->filter(),
                ApproverType::Role => $def->role->users,
            };

            foreach ($candidates as $candidate) {
                $delegate = $candidate->activeDelegate();
                $actingUser = $delegate ?? $candidate;

                $resolved->put($actingUser->id, [
                    'user_id' => $actingUser->id,
                    'acting_for_user_id' => $delegate ? $candidate->id : null,
                ]);
            }
        }

        return $resolved->values();
    }
}
