"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { requests as requestsApi, workflows as workflowsApi } from "@/lib/api";
import { formatError } from "@/lib/format-error";
import type { Workflow, WorkflowRequest } from "@/lib/types";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/status-colors";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { UserSelect } from "@/components/UserSelect";
import { IconDocument } from "@/components/icons";
import { card, errorText, input, label, mutedText, tableDivide, tableHead, tableHeadCell, tableWrap } from "@/lib/ui";

type ColumnKey = "id" | "title" | "workflow" | "requester_name" | "requester_email" | "status" | "submitted_at";

const COLUMNS: { key: ColumnKey; label: string; get: (r: WorkflowRequest) => string }[] = [
  { key: "id", label: "ID", get: (r) => String(r.id) },
  { key: "title", label: "Title", get: (r) => r.title },
  { key: "workflow", label: "Workflow", get: (r) => r.workflow_version?.workflow?.name ?? "" },
  { key: "requester_name", label: "Requester", get: (r) => r.requester?.name ?? "" },
  { key: "requester_email", label: "Requester email", get: (r) => r.requester?.email ?? "" },
  { key: "status", label: "Status", get: (r) => STATUS_LABEL[r.status as keyof typeof STATUS_LABEL] ?? r.status },
  { key: "submitted_at", label: "Submitted", get: (r) => new Date(r.created_at).toLocaleString() },
];

const DEFAULT_COLUMNS: ColumnKey[] = ["title", "workflow", "requester_name", "status", "submitted_at"];

const PAGE_SIZE = 20;

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [allRequests, setAllRequests] = useState<WorkflowRequest[]>([]);
  const [workflowList, setWorkflowList] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statuses, setStatuses] = useState<Set<string>>(new Set(STATUS_ORDER));
  const [workflowId, setWorkflowId] = useState<number | "">("");
  const [requesterId, setRequesterId] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [columns, setColumns] = useState<Set<ColumnKey>>(new Set(DEFAULT_COLUMNS));
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    Promise.all([requestsApi.list({ scope: "all", per_page: 500 }), workflowsApi.list({ per_page: 100 })])
      .then(([reqRes, wfRes]) => {
        setAllRequests(reqRes.data);
        setWorkflowList(wfRes.data);
      })
      .catch((err) => {
        const message = formatError(err);
        setError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }, []);

  function toggleStatus(status: string) {
    setStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  function toggleColumn(col: ColumnKey) {
    setColumns((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom).getTime() : null;
    const to = dateTo ? new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1 : null;

    return allRequests.filter((r) => {
      if (statuses.size > 0 && !statuses.has(r.status)) return false;
      if (workflowId !== "" && r.workflow_version?.workflow?.id !== workflowId) return false;
      if (requesterId !== null && r.requester?.id !== requesterId) return false;
      const created = new Date(r.created_at).getTime();
      if (from !== null && created < from) return false;
      if (to !== null && created > to) return false;
      return true;
    });
  }, [allRequests, statuses, workflowId, requesterId, dateFrom, dateTo]);

  useEffect(() => {
    setPage(1);
  }, [statuses, workflowId, requesterId, dateFrom, dateTo]);

  const activeColumns = COLUMNS.filter((c) => columns.has(c.key));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function exportCsv() {
    const rows = [
      activeColumns.map((c) => csvEscape(c.label)).join(","),
      ...filtered.map((r) => activeColumns.map((c) => csvEscape(c.get(r))).join(",")),
    ];
    downloadBlob(rows.join("\n"), `requests-report-${Date.now()}.csv`, "text/csv;charset=utf-8;");
    toast.success(`Exported ${filtered.length} rows to CSV`);
  }

  async function exportPdf() {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const doc = new jsPDF({ orientation: activeColumns.length > 4 ? "landscape" : "portrait" });
    doc.setFontSize(14);
    doc.text("Requests report", 14, 16);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Generated ${new Date().toLocaleString()} - ${filtered.length} rows`, 14, 22);
    autoTable(doc, {
      startY: 27,
      head: [activeColumns.map((c) => c.label)],
      body: filtered.map((r) => activeColumns.map((c) => c.get(r))),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    doc.save(`requests-report-${Date.now()}.pdf`);
    toast.success(`Exported ${filtered.length} rows to PDF`);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Filter requests and export the results as CSV or PDF." />

      {error && <p className={errorText}>{error}</p>}

      <div className={`space-y-4 ${card} p-5`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={label}>Status</label>
            <div className="flex flex-wrap gap-3 pt-1">
              {STATUS_ORDER.map((s) => (
                <label key={s} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-neutral-300">
                  <input type="checkbox" checked={statuses.has(s)} onChange={() => toggleStatus(s)} />
                  {STATUS_LABEL[s]}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className={label} htmlFor="report-workflow">
              Workflow
            </label>
            <select
              id="report-workflow"
              value={workflowId}
              onChange={(e) => setWorkflowId(e.target.value ? Number(e.target.value) : "")}
              className={`w-full ${input}`}
            >
              <option value="">All workflows</option>
              {workflowList.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Requester</label>
            <UserSelect value={requesterId} onChange={setRequesterId} placeholder="All requesters..." />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 border-t border-gray-200 pt-4 dark:border-neutral-800 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="report-date-from">
              Submitted from
            </label>
            <input
              id="report-date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={`w-full ${input}`}
            />
          </div>
          <div>
            <label className={label} htmlFor="report-date-to">
              Submitted to
            </label>
            <input
              id="report-date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={`w-full ${input}`}
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 dark:border-neutral-800">
          <label className={label}>Columns</label>
          <div className="flex flex-wrap gap-3">
            {COLUMNS.map((c) => (
              <label key={c.key} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-neutral-300">
                <input type="checkbox" checked={columns.has(c.key)} onChange={() => toggleColumn(c.key)} />
                {c.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 pt-4 dark:border-neutral-800">
          <p className={mutedText}>
            {loading ? "Loading..." : `${filtered.length} of ${allRequests.length} requests match these filters.`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportCsv}
              disabled={loading || filtered.length === 0 || activeColumns.length === 0}
              className="rounded-md border border-gray-300 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={exportPdf}
              disabled={loading || filtered.length === 0 || activeColumns.length === 0}
              className="rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {!loading && filtered.length === 0 && (
        <EmptyState icon={<IconDocument />} title="No matching requests" description="Try widening your filters." />
      )}

      {!loading && filtered.length > 0 && activeColumns.length > 0 && (
        <div className={tableWrap}>
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-neutral-800">
            <thead className={tableHead}>
              <tr>
                {activeColumns.map((c) => (
                  <th key={c.key} className={tableHeadCell}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={tableDivide}>
              {pageItems.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                  {activeColumns.map((c) => (
                    <td key={c.key} className="px-4 py-2.5 text-gray-600 dark:text-neutral-300">
                      {c.key === "status" ? <StatusBadge status={r.status} /> : c.get(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-neutral-800">
            <p className={mutedText}>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of{" "}
              {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Previous
              </button>
              <span className={mutedText}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
