"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { roles as rolesApi, workflows as workflowsApi } from "@/lib/api";
import { formatError } from "@/lib/format-error";
import type { BusinessRole, WorkflowStepInput } from "@/lib/types";
import { WorkflowStepBuilder, emptyStep } from "@/components/WorkflowStepBuilder";
import { btnPrimary, card, errorText, input, label } from "@/lib/ui";

function coerceConditionValues(steps: WorkflowStepInput[]): WorkflowStepInput[] {
  return steps.map((step) => ({
    ...step,
    conditions: (step.conditions ?? []).map((c) => {
      const num = Number(c.value);
      const value = c.operator === "in" ? String(c.value).split(",").map((v) => v.trim()) : !Number.isNaN(num) && String(c.value).trim() !== "" ? num : c.value;
      return { ...c, value };
    }),
  }));
}

export default function NewWorkflowPage() {
  const router = useRouter();
  const [businessRoles, setBusinessRoles] = useState<BusinessRole[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<WorkflowStepInput[]>([emptyStep()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    rolesApi.list().then(setBusinessRoles).catch((err) => {
      const message = formatError(err);
      setError(message);
      toast.error(message);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await workflowsApi.create({
        name,
        description: description || undefined,
        steps: coerceConditionValues(steps),
      });
      toast.success("Workflow created");
      router.push(`/admin/workflows/${created.id}`);
    } catch (err) {
      const message = formatError(err);
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          href="/admin/workflows"
          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          &larr; Back to workflows
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-gray-900 dark:text-neutral-100">New workflow</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className={`space-y-4 ${card} p-5`}>
          <div>
            <label className={label} htmlFor="workflow-name">
              Name
            </label>
            <input
              id="workflow-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className={`w-full ${input}`}
            />
          </div>
          <div>
            <label className={label} htmlFor="workflow-description">
              Description
            </label>
            <textarea
              id="workflow-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={`w-full ${input}`}
            />
          </div>
        </div>

        <WorkflowStepBuilder steps={steps} onChange={setSteps} businessRoles={businessRoles} />

        {error && <p className={errorText}>{error}</p>}

        <button type="submit" disabled={submitting} className={btnPrimary}>
          {submitting ? "Creating..." : "Create workflow"}
        </button>
      </form>
    </div>
  );
}
