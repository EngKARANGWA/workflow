"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { roles as rolesApi, workflows as workflowsApi } from "@/lib/api";
import { formatError } from "@/lib/format-error";
import type { BusinessRole, Workflow, WorkflowStepInput } from "@/lib/types";
import { WorkflowStepBuilder, emptyStep } from "@/components/WorkflowStepBuilder";
import { btnPrimary, card, errorText, mutedText } from "@/lib/ui";

function coerceConditionValues(steps: WorkflowStepInput[]): WorkflowStepInput[] {
  return steps.map((step) => ({
    ...step,
    conditions: (step.conditions ?? []).map((c) => {
      const num = Number(c.value);
      const value =
        c.operator === "in"
          ? String(c.value).split(",").map((v) => v.trim())
          : !Number.isNaN(num) && String(c.value).trim() !== ""
          ? num
          : c.value;
      return { ...c, value };
    }),
  }));
}

export default function WorkflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const workflowId = Number(id);

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [businessRoles, setBusinessRoles] = useState<BusinessRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVersionForm, setShowVersionForm] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([workflowsApi.get(workflowId), rolesApi.list()])
      .then(([w, r]) => {
        setWorkflow(w);
        setBusinessRoles(r);
      })
      .catch((err) => setError(formatError(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, [workflowId]);

  async function toggleActive() {
    if (!workflow) return;
    setError(null);
    try {
      const updated = await workflowsApi.update(workflow.id, { is_active: !workflow.is_active });
      setWorkflow((w) => (w ? { ...w, is_active: updated.is_active } : w));
    } catch (err) {
      setError(formatError(err));
    }
  }

  if (loading) return <p className={mutedText}>Loading...</p>;
  if (error && !workflow) return <p className={errorText}>{error}</p>;
  if (!workflow) return null;

  const sortedVersions = [...(workflow.versions ?? [])].sort((a, b) => b.version_number - a.version_number);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <Link
          href="/admin/workflows"
          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          &larr; Back to workflows
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-neutral-100">{workflow.name}</h1>
          <p className={`mt-1 ${mutedText}`}>{workflow.description}</p>
        </div>
        <button
          type="button"
          onClick={toggleActive}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            workflow.is_active
              ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-500/15 dark:text-green-400 dark:hover:bg-green-500/25"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          }`}
        >
          {workflow.is_active ? "Active" : "Inactive"} — click to toggle
        </button>
      </div>

      {error && <p className={errorText}>{error}</p>}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700 dark:text-neutral-300">Versions</h2>
          <button
            type="button"
            onClick={() => setShowVersionForm((v) => !v)}
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            {showVersionForm ? "Cancel" : "Publish new version"}
          </button>
        </div>

        {showVersionForm && (
          <NewVersionForm
            workflowId={workflow.id}
            businessRoles={businessRoles}
            onPublished={() => {
              setShowVersionForm(false);
              load();
            }}
          />
        )}

        {sortedVersions.map((version) => (
          <div key={version.id} className={`${card} p-4`}>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-neutral-100">
                Version {version.version_number}{" "}
                {version.is_current && (
                  <span className="ml-1 text-xs font-medium text-green-700 dark:text-green-400">(current)</span>
                )}
              </span>
            </div>
            <div className="space-y-2">
              {(version.steps ?? [])
                .sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0))
                .map((step) => (
                  <div key={step.id} className="rounded-md bg-gray-50 p-3 text-sm dark:bg-neutral-800/50">
                    <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-neutral-100">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-semibold text-white">
                        {step.step_order}
                      </span>
                      {step.approval_type}
                    </div>
                    <div className="mt-1.5 text-gray-600 dark:text-neutral-300">
                      Approvers:{" "}
                      {step.approver_defs
                        .map((a) => (a.approver_type === "role" ? a.role?.name ?? `role #${a.role_id}` : a.user?.name ?? `user #${a.user_id}`))
                        .join(", ")}
                    </div>
                    {step.conditions && step.conditions.length > 0 && (
                      <div className="text-gray-500 dark:text-neutral-400">
                        Conditions:{" "}
                        {step.conditions.map((c) => `${c.field} ${c.operator} ${JSON.stringify(c.value)}`).join(" AND ")}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function NewVersionForm({
  workflowId,
  businessRoles,
  onPublished,
}: {
  workflowId: number;
  businessRoles: BusinessRole[];
  onPublished: () => void;
}) {
  const [steps, setSteps] = useState<WorkflowStepInput[]>([emptyStep()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await workflowsApi.addVersion(workflowId, { steps: coerceConditionValues(steps) });
      onPublished();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10"
    >
      <WorkflowStepBuilder steps={steps} onChange={setSteps} businessRoles={businessRoles} />
      {error && <p className={errorText}>{error}</p>}
      <button type="submit" disabled={submitting} className={btnPrimary}>
        {submitting ? "Publishing..." : "Publish version"}
      </button>
    </form>
  );
}
