"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { workflows as workflowsApi } from "@/lib/api";
import { formatError } from "@/lib/format-error";
import type { Workflow } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { IconPlus, IconWorkflow } from "@/components/icons";
import { btnPrimary, errorText, mutedText, tableDivide, tableHead, tableHeadCell, tableWrap } from "@/lib/ui";

export default function WorkflowsPage() {
  const [items, setItems] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    workflowsApi
      .list({ per_page: 100 })
      .then((res) => setItems(res.data))
      .catch((err) => setError(formatError(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflows"
        description="Define steps, approvers, and conditions for each approval flow."
        action={
          <Link href="/admin/workflows/new" className={`flex items-center gap-1.5 ${btnPrimary}`}>
            <IconPlus className="h-4 w-4" /> New workflow
          </Link>
        }
      />

      {error && <p className={errorText}>{error}</p>}
      {loading && <p className={mutedText}>Loading...</p>}

      {!loading && items.length === 0 && (
        <EmptyState
          icon={<IconWorkflow />}
          title="No workflows yet"
          description="Create one to start routing requests through approval steps."
        />
      )}

      {!loading && items.length > 0 && (
        <div className={tableWrap}>
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-neutral-800">
            <thead className={tableHead}>
              <tr>
                <th className={tableHeadCell}>Name</th>
                <th className={tableHeadCell}>Description</th>
                <th className={tableHeadCell}>Current version</th>
                <th className={tableHeadCell}>Active</th>
              </tr>
            </thead>
            <tbody className={tableDivide}>
              {items.map((w) => (
                <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/workflows/${w.id}`}
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {w.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-neutral-300">{w.description}</td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-neutral-300">
                    v{w.current_version?.version_number ?? "-"}
                  </td>
                  <td className="px-4 py-2.5">
                    {w.is_active ? (
                      <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-500/15 dark:text-green-400">
                        Active
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-neutral-800 dark:text-neutral-400">
                        Inactive
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
