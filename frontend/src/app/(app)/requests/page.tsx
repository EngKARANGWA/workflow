"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { requests as requestsApi } from "@/lib/api";
import { formatError } from "@/lib/format-error";
import type { WorkflowRequest } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { StatTile } from "@/components/StatTile";
import { DonutChart } from "@/components/charts/DonutChart";
import { BarChart } from "@/components/charts/BarChart";
import { IconArrowUturnLeft, IconCheckCircle, IconClock, IconDocument } from "@/components/icons";
import { STATUS_HEX, STATUS_LABEL, STATUS_ORDER } from "@/lib/status-colors";
import { bucketByDay } from "@/lib/bucket-by-day";
import { btnPrimary, card, errorText, mutedText, tableDivide, tableHead, tableHeadCell, tableWrap } from "@/lib/ui";

type Scope = "mine" | "pending_my_approval" | "all";

type Stats = {
  total: number;
  inProgress: number;
  approved: number;
  returned: number;
  rejected: number;
  pendingApproval: number;
  submittedTrend: number[];
  inProgressTrend: number[];
  approvedTrend: number[];
  returnedTrend: number[];
  pendingApprovalTrend: number[];
  submittedByDay: { label: string; count: number }[];
};

const TREND_DAYS = 12;
const BAR_DAYS = 14;

export default function RequestsPage() {
  const { user } = useAuth();
  const [scope, setScope] = useState<Scope>("mine");
  const [items, setItems] = useState<WorkflowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  const isAdmin = user?.system_role === "system_administrator";
  const isApproverOrAdmin = isAdmin || user?.system_role === "approver";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    requestsApi
      .list({ scope })
      .then((res) => {
        if (!cancelled) setItems(res.data);
      })
      .catch((err) => {
        if (!cancelled) {
          const message = formatError(err);
          setError(message);
          toast.error(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      const mine = await requestsApi.list({ scope: "mine", per_page: 100 });
      const byStatus = (status: string) => mine.data.filter((r) => r.status === status);

      let pendingApproval = 0;
      let pendingApprovalTrend: number[] = new Array(TREND_DAYS).fill(0);
      if (isApproverOrAdmin) {
        const pending = await requestsApi.list({ scope: "pending_my_approval", per_page: 100 });
        pendingApproval = pending.total;
        pendingApprovalTrend = bucketByDay(pending.data.map((r) => r.created_at), TREND_DAYS).map((b) => b.count);
      }

      if (cancelled) return;

      const submittedByDay = bucketByDay(mine.data.map((r) => r.created_at), BAR_DAYS);

      setStats({
        total: mine.total,
        inProgress: byStatus("in_progress").length,
        approved: byStatus("approved").length,
        returned: byStatus("returned").length,
        rejected: byStatus("rejected").length,
        pendingApproval,
        submittedTrend: bucketByDay(mine.data.map((r) => r.created_at), TREND_DAYS).map((b) => b.count),
        inProgressTrend: bucketByDay(byStatus("in_progress").map((r) => r.created_at), TREND_DAYS).map((b) => b.count),
        approvedTrend: bucketByDay(byStatus("approved").map((r) => r.created_at), TREND_DAYS).map((b) => b.count),
        returnedTrend: bucketByDay(byStatus("returned").map((r) => r.created_at), TREND_DAYS).map((b) => b.count),
        pendingApprovalTrend,
        submittedByDay: submittedByDay.map((b) => ({ label: b.label, count: b.count })),
      });
    }

    loadStats().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isApproverOrAdmin]);

  const firstName = user?.name.split(" ")[0];

  const statusCounts: Record<(typeof STATUS_ORDER)[number], number> = {
    in_progress: stats?.inProgress ?? 0,
    approved: stats?.approved ?? 0,
    returned: stats?.returned ?? 0,
    rejected: stats?.rejected ?? 0,
  };
  const donutSegments = STATUS_ORDER.map((status) => ({
    label: STATUS_LABEL[status],
    value: statusCounts[status],
    color: STATUS_HEX[status],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-neutral-100">
            Welcome back{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className={`mt-0.5 ${mutedText}`}>Here&apos;s what&apos;s happening with your requests.</p>
        </div>
        <Link href="/requests/new" className={btnPrimary}>
          New request
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="My requests"
          value={stats ? stats.total : "–"}
          icon={<IconDocument />}
          tone="blue"
          trend={stats?.submittedTrend}
          onClick={() => setScope("mine")}
        />
        {isApproverOrAdmin ? (
          <StatTile
            label="Pending my approval"
            value={stats ? stats.pendingApproval : "–"}
            icon={<IconClock />}
            tone="amber"
            trend={stats?.pendingApprovalTrend}
            onClick={() => setScope("pending_my_approval")}
          />
        ) : (
          <StatTile
            label="In progress"
            value={stats ? stats.inProgress : "–"}
            icon={<IconClock />}
            tone="amber"
            trend={stats?.inProgressTrend}
          />
        )}
        <StatTile
          label="Approved"
          value={stats ? stats.approved : "–"}
          icon={<IconCheckCircle />}
          tone="green"
          trend={stats?.approvedTrend}
        />
        <StatTile
          label="Returned to you"
          value={stats ? stats.returned : "–"}
          icon={<IconArrowUturnLeft />}
          tone="orange"
          trend={stats?.returnedTrend}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className={`${card} p-5 lg:col-span-2`}>
          <p className="mb-4 text-sm font-medium text-gray-700 dark:text-neutral-300">Status mix (last 100)</p>
          <DonutChart segments={donutSegments} centerValue={stats?.total ?? 0} centerLabel="Total" />
        </div>
        <div className={`${card} p-5 lg:col-span-3`}>
          <p className="mb-4 text-sm font-medium text-gray-700 dark:text-neutral-300">
            Requests submitted &middot; last {BAR_DAYS} days
          </p>
          {stats ? (
            <BarChart data={stats.submittedByDay.map((b) => ({ label: b.label, value: b.count }))} />
          ) : (
            <div className="flex h-[140px] items-center justify-center">
              <p className={mutedText}>Loading...</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-neutral-800">
        <TabButton active={scope === "mine"} onClick={() => setScope("mine")}>
          My requests
        </TabButton>
        <TabButton active={scope === "pending_my_approval"} onClick={() => setScope("pending_my_approval")}>
          Pending my approval
        </TabButton>
        {isAdmin && (
          <TabButton active={scope === "all"} onClick={() => setScope("all")}>
            All requests
          </TabButton>
        )}
      </div>

      {loading && <p className={mutedText}>Loading...</p>}
      {error && <p className={errorText}>{error}</p>}

      {!loading && !error && items.length === 0 && (
        <div className={`${tableWrap} px-4 py-10 text-center`}>
          <p className={mutedText}>No requests here.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className={tableWrap}>
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-neutral-800">
            <thead className={tableHead}>
              <tr>
                <th className={tableHeadCell}>Title</th>
                <th className={tableHeadCell}>Requester</th>
                <th className={tableHeadCell}>Status</th>
                <th className={tableHeadCell}>Submitted</th>
              </tr>
            </thead>
            <tbody className={tableDivide}>
              {items.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/requests/${r.id}`}
                      className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      {r.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-neutral-300">
                    {r.requester?.name ?? "-"}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-neutral-400">
                    {new Date(r.created_at).toLocaleString()}
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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active
          ? "border-blue-600 text-blue-600 dark:text-blue-400"
          : "border-transparent text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200"
      }`}
    >
      {children}
    </button>
  );
}
