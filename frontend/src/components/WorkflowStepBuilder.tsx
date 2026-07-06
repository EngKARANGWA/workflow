"use client";

import type { BusinessRole, WorkflowStepInput } from "@/lib/types";
import { card, inputSm, label } from "@/lib/ui";

const OPERATORS = [
  "equals",
  "not_equals",
  "greater_than",
  "greater_than_or_equal",
  "less_than",
  "less_than_or_equal",
  "in",
] as const;

export function emptyStep(): WorkflowStepInput {
  return { approval_type: "single", conditions: [], approvers: [{ approver_type: "role" }] };
}

export function WorkflowStepBuilder({
  steps,
  onChange,
  businessRoles,
}: {
  steps: WorkflowStepInput[];
  onChange: (steps: WorkflowStepInput[]) => void;
  businessRoles: BusinessRole[];
}) {
  function updateStep(index: number, patch: Partial<WorkflowStepInput>) {
    onChange(steps.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function removeStep(index: number) {
    onChange(steps.filter((_, i) => i !== index));
  }

  function addStep() {
    onChange([...steps, emptyStep()]);
  }

  function addApprover(stepIndex: number) {
    const step = steps[stepIndex];
    updateStep(stepIndex, { approvers: [...step.approvers, { approver_type: "role" }] });
  }

  function updateApprover(stepIndex: number, approverIndex: number, patch: Partial<WorkflowStepInput["approvers"][number]>) {
    const step = steps[stepIndex];
    updateStep(stepIndex, {
      approvers: step.approvers.map((a, i) => (i === approverIndex ? { ...a, ...patch } : a)),
    });
  }

  function removeApprover(stepIndex: number, approverIndex: number) {
    const step = steps[stepIndex];
    updateStep(stepIndex, { approvers: step.approvers.filter((_, i) => i !== approverIndex) });
  }

  function addCondition(stepIndex: number) {
    const step = steps[stepIndex];
    updateStep(stepIndex, {
      conditions: [...(step.conditions ?? []), { field: "", operator: "equals", value: "" }],
    });
  }

  function updateCondition(
    stepIndex: number,
    conditionIndex: number,
    patch: Partial<WorkflowStepInput["conditions"] extends (infer C)[] | undefined ? C : never>
  ) {
    const step = steps[stepIndex];
    updateStep(stepIndex, {
      conditions: (step.conditions ?? []).map((c, i) => (i === conditionIndex ? { ...c, ...patch } : c)),
    });
  }

  function removeCondition(stepIndex: number, conditionIndex: number) {
    const step = steps[stepIndex];
    updateStep(stepIndex, { conditions: (step.conditions ?? []).filter((_, i) => i !== conditionIndex) });
  }

  return (
    <div className="space-y-4">
      {steps.map((step, stepIndex) => (
        <div key={stepIndex} className={`space-y-4 ${card} p-4`}>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-neutral-100">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                {stepIndex + 1}
              </span>
              Step {stepIndex + 1}
            </span>
            <button
              type="button"
              onClick={() => removeStep(stepIndex)}
              className="text-sm text-gray-400 hover:text-red-600 dark:text-neutral-500 dark:hover:text-red-400"
            >
              Remove step
            </button>
          </div>

          <div>
            <label className={label}>Approval type</label>
            <select
              value={step.approval_type}
              onChange={(e) => updateStep(stepIndex, { approval_type: e.target.value as "single" | "all" })}
              className={inputSm}
            >
              <option value="single">single (first approval settles the step)</option>
              <option value="all">all (every resolved approver must approve)</option>
            </select>
          </div>

          <div>
            <label className={label}>Approvers</label>
            <div className="space-y-2">
              {step.approvers.map((approver, approverIndex) => (
                <div key={approverIndex} className="flex items-center gap-2">
                  <select
                    value={approver.approver_type}
                    onChange={(e) =>
                      updateApprover(stepIndex, approverIndex, {
                        approver_type: e.target.value as "role" | "user",
                        role_id: undefined,
                        user_id: undefined,
                      })
                    }
                    className={inputSm}
                  >
                    <option value="role">role</option>
                    <option value="user">user</option>
                  </select>
                  {approver.approver_type === "role" ? (
                    <select
                      value={approver.role_id ?? ""}
                      onChange={(e) => updateApprover(stepIndex, approverIndex, { role_id: Number(e.target.value) })}
                      className={`flex-1 ${inputSm}`}
                    >
                      <option value="">Select role...</option>
                      {businessRoles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      placeholder="user id"
                      value={approver.user_id ?? ""}
                      onChange={(e) => updateApprover(stepIndex, approverIndex, { user_id: Number(e.target.value) })}
                      className={`flex-1 ${inputSm}`}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removeApprover(stepIndex, approverIndex)}
                    className="px-1 text-gray-400 hover:text-red-600 dark:text-neutral-500 dark:hover:text-red-400"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => addApprover(stepIndex)}
              className="mt-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              + Add approver
            </button>
          </div>

          <div>
            <label className={label}>
              Conditions{" "}
              <span className="font-normal text-gray-400 dark:text-neutral-500">(optional, AND-combined)</span>
            </label>
            <div className="space-y-2">
              {(step.conditions ?? []).map((condition, conditionIndex) => (
                <div key={conditionIndex} className="flex items-center gap-2">
                  <input
                    placeholder="field"
                    value={condition.field}
                    onChange={(e) => updateCondition(stepIndex, conditionIndex, { field: e.target.value })}
                    className={`w-1/4 ${inputSm}`}
                  />
                  <select
                    value={condition.operator}
                    onChange={(e) =>
                      updateCondition(stepIndex, conditionIndex, {
                        operator: e.target.value as (typeof OPERATORS)[number],
                      })
                    }
                    className={inputSm}
                  >
                    {OPERATORS.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="value"
                    value={String(condition.value ?? "")}
                    onChange={(e) => updateCondition(stepIndex, conditionIndex, { value: e.target.value })}
                    className={`flex-1 ${inputSm}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeCondition(stepIndex, conditionIndex)}
                    className="px-1 text-gray-400 hover:text-red-600 dark:text-neutral-500 dark:hover:text-red-400"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => addCondition(stepIndex)}
              className="mt-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              + Add condition
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addStep}
        className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
      >
        + Add step
      </button>
    </div>
  );
}
