"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { requests as requestsApi } from "@/lib/api";
import { formatError } from "@/lib/format-error";
import type { AuditLogEntry, DecisionValue, WorkflowRequest } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { btnPrimary, card, errorText, input, mutedText } from "@/lib/ui";

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const requestId = Number(id);
  const { user } = useAuth();

  const [request, setRequest] = useState<WorkflowRequest | null>(null);
  const [history, setHistory] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const [req, hist] = await Promise.all([
        requestsApi.get(requestId),
        requestsApi.history(requestId),
      ]);
      setRequest(req);
      setHistory(hist);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  if (loading) return <p className={mutedText}>Loading...</p>;
  if (error && !request) return <p className={errorText}>{error}</p>;
  if (!request) return null;

  const activeStep = request.steps?.find((s) => s.status === "active");
  const myPendingApproval = activeStep?.approvers?.find(
    (a) => a.user_id === user?.id && a.decision === "pending"
  );
  const canResubmit = request.status === "returned" && request.requester?.id === user?.id;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <Link
          href="/requests"
          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          &larr; Back to requests
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-neutral-100">{request.title}</h1>
          <p className={`mt-1 ${mutedText}`}>
            {request.workflow_version?.workflow?.name} &middot; submitted by{" "}
            {request.requester?.name} &middot; {new Date(request.created_at).toLocaleString()}
          </p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <Section title="Request data">
        <div className={`${card} p-4`}>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {Object.entries(request.data ?? {}).map(([key, value]) => (
              <div key={key} className="contents">
                <dt className="text-gray-500 dark:text-neutral-400">{key}</dt>
                <dd className="text-gray-900 dark:text-neutral-100">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <Section title="Steps">
        <div className="space-y-3">
          {request.steps?.map((step) => (
            <div key={step.id} className={`${card} p-4`}>
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-neutral-100">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-semibold text-white">
                    {step.workflow_step?.step_order}
                  </span>
                  {step.workflow_step?.approval_type}
                </span>
                <StatusBadge status={step.status} />
              </div>
              <ul className="space-y-1.5 text-sm">
                {step.approvers?.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-gray-600 dark:text-neutral-300">
                    <span>
                      {a.user?.name ?? `User #${a.user_id}`}
                      {a.acting_for_user && (
                        <span className="text-gray-400 dark:text-neutral-500">
                          {" "}
                          (for {a.acting_for_user.name})
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      {a.comments && (
                        <span className="italic text-gray-400 dark:text-neutral-500">&ldquo;{a.comments}&rdquo;</span>
                      )}
                      <StatusBadge status={a.decision} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {myPendingApproval && <DecideForm requestId={request.id} onDecided={load} />}

      {canResubmit && (
        <ResubmitForm requestId={request.id} initialData={request.data} onResubmitted={load} />
      )}

      <Section title="History">
        <ul className="space-y-2 text-sm">
          {history.map((h) => (
            <li key={h.id} className={`${card} p-4`}>
              <div className="flex items-center justify-between">
                <span className="font-medium capitalize text-gray-900 dark:text-neutral-100">
                  {h.action.replace(/_/g, " ")}
                </span>
                <span className="text-gray-400 dark:text-neutral-500">
                  {new Date(h.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-gray-500 dark:text-neutral-400">
                {h.user?.name ?? "System"}
                {h.previous_status && h.new_status && (
                  <span>
                    {" "}
                    &middot; {h.previous_status} &rarr; {h.new_status}
                  </span>
                )}
              </p>
              {h.comments && <p className="mt-1 text-gray-600 dark:text-neutral-300">&ldquo;{h.comments}&rdquo;</p>}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium text-gray-700 dark:text-neutral-300">{title}</h2>
      {children}
    </section>
  );
}

function DecideForm({ requestId, onDecided }: { requestId: number; onDecided: () => void }) {
  const [decision, setDecision] = useState<DecisionValue>("approved");
  const [comments, setComments] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await requestsApi.decide(requestId, { decision, comments: comments || undefined });
      setComments("");
      onDecided();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
      <h2 className="mb-3 text-sm font-medium text-gray-700 dark:text-neutral-200">Your decision</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-4">
          {(["approved", "rejected", "returned"] as DecisionValue[]).map((value) => (
            <label
              key={value}
              className="flex items-center gap-1.5 text-sm capitalize text-gray-700 dark:text-neutral-200"
            >
              <input
                type="radio"
                name="decision"
                value={value}
                checked={decision === value}
                onChange={() => setDecision(value)}
              />
              {value}
            </label>
          ))}
        </div>
        <textarea
          placeholder="Comments (optional)"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          className={`w-full ${input}`}
          rows={2}
        />
        {error && <p className={errorText}>{error}</p>}
        <button type="submit" disabled={submitting} className={btnPrimary}>
          {submitting ? "Submitting..." : "Submit decision"}
        </button>
      </form>
    </section>
  );
}

function ResubmitForm({
  requestId,
  initialData,
  onResubmitted,
}: {
  requestId: number;
  initialData: Record<string, unknown>;
  onResubmitted: () => void;
}) {
  const [rows, setRows] = useState(
    Object.entries(initialData ?? {}).map(([key, value]) => ({ key, value: String(value) }))
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateRow(index: number, field: "key" | "value", value: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, { key: "", value: "" }]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const data: Record<string, unknown> = {};
    for (const row of rows) {
      if (row.key.trim()) {
        const num = Number(row.value);
        data[row.key.trim()] = row.value.trim() !== "" && !Number.isNaN(num) ? num : row.value;
      }
    }
    setSubmitting(true);
    try {
      await requestsApi.resubmit(requestId, { data });
      onResubmitted();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-500/30 dark:bg-orange-500/10">
      <h2 className="mb-3 text-sm font-medium text-gray-700 dark:text-neutral-200">
        This request was returned. Update the data and resubmit.
      </h2>
      <form onSubmit={handleSubmit} className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2">
            <input
              placeholder="field"
              value={row.key}
              onChange={(e) => updateRow(i, "key", e.target.value)}
              className={`w-1/3 ${input}`}
            />
            <input
              placeholder="value"
              value={row.value}
              onChange={(e) => updateRow(i, "value", e.target.value)}
              className={`flex-1 ${input}`}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={addRow}
          className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          + Add field
        </button>
        {error && <p className={errorText}>{error}</p>}
        <div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700 disabled:opacity-50"
          >
            {submitting ? "Resubmitting..." : "Resubmit"}
          </button>
        </div>
      </form>
    </section>
  );
}
