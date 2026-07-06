"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { requests as requestsApi, workflows as workflowsApi } from "@/lib/api";
import { formatError } from "@/lib/format-error";
import type { Workflow } from "@/lib/types";
import { btnPrimary, card, errorText, input, label, mutedText } from "@/lib/ui";

type DataRow = { key: string; value: string };

export default function NewRequestPage() {
  const router = useRouter();
  const [workflowList, setWorkflowList] = useState<Workflow[]>([]);
  const [workflowId, setWorkflowId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [rows, setRows] = useState<DataRow[]>([{ key: "", value: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    workflowsApi
      .list({ is_active: true, per_page: 100 })
      .then((res) => setWorkflowList(res.data))
      .catch((err) => {
        const message = formatError(err);
        setError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, []);

  function updateRow(index: number, field: keyof DataRow, value: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function addRow() {
    setRows((prev) => [...prev, { key: "", value: "" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function parseValue(raw: string): unknown {
    if (raw.trim() === "") return raw;
    const num = Number(raw);
    if (!Number.isNaN(num) && raw.trim() !== "") return num;
    if (raw === "true") return true;
    if (raw === "false") return false;
    return raw;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (workflowId === "") {
      setError("Choose a workflow.");
      toast.warning("Choose a workflow before submitting.");
      return;
    }

    const data: Record<string, unknown> = {};
    for (const row of rows) {
      if (row.key.trim()) data[row.key.trim()] = parseValue(row.value);
    }

    setSubmitting(true);
    try {
      const created = await requestsApi.create({ workflow_id: Number(workflowId), title, data });
      toast.success("Request submitted");
      router.push(`/requests/${created.id}`);
    } catch (err) {
      const message = formatError(err);
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href="/requests" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
          &larr; Back to requests
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-gray-900 dark:text-neutral-100">Submit a request</h1>
      </div>

      {loading ? (
        <p className={mutedText}>Loading workflows...</p>
      ) : (
        <form onSubmit={handleSubmit} className={`space-y-5 ${card} p-6`}>
          <div>
            <label className={label} htmlFor="workflow_id">
              Workflow
            </label>
            <select
              id="workflow_id"
              value={workflowId}
              onChange={(e) => setWorkflowId(e.target.value ? Number(e.target.value) : "")}
              required
              className={`w-full ${input}`}
            >
              <option value="">Select a workflow...</option>
              {workflowList.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={label} htmlFor="title">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={`w-full ${input}`}
            />
          </div>

          <div>
            <label className={label}>
              Data{" "}
              <span className="font-normal text-gray-400 dark:text-neutral-500">
                (fields used by workflow conditions, e.g. amount, department)
              </span>
            </label>
            <div className="space-y-2">
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
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="px-2 text-sm text-gray-400 hover:text-red-600 dark:text-neutral-500 dark:hover:text-red-400"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addRow}
              className="mt-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              + Add field
            </button>
          </div>

          {error && <p className={errorText}>{error}</p>}

          <button type="submit" disabled={submitting} className={btnPrimary}>
            {submitting ? "Submitting..." : "Submit request"}
          </button>
        </form>
      )}
    </div>
  );
}
