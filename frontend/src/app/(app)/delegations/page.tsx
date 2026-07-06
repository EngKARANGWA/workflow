"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { delegations as delegationsApi } from "@/lib/api";
import { formatError } from "@/lib/format-error";
import type { Delegation } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { IconUsers } from "@/components/icons";
import { btnGhost, btnPrimary, card, errorText, input, label, mutedText } from "@/lib/ui";

function delegationState(d: Delegation): { label: string; className: string } {
  const now = Date.now();
  const start = new Date(d.starts_at).getTime();
  const end = new Date(d.ends_at).getTime();
  if (now < start) {
    return { label: "Upcoming", className: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" };
  }
  if (now > end) {
    return { label: "Expired", className: "bg-gray-100 text-gray-500 dark:bg-neutral-800 dark:text-neutral-400" };
  }
  return { label: "Active", className: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" };
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function DelegationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [delegateId, setDelegateId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    delegationsApi
      .list()
      .then(setItems)
      .catch((err) => setError(formatError(err)))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await delegationsApi.create({
        delegate_id: Number(delegateId),
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
      });
      setDelegateId("");
      setStartsAt("");
      setEndsAt("");
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(id: number) {
    if (!confirm("Revoke this delegation?")) return;
    setError(null);
    try {
      await delegationsApi.remove(id);
      load();
    } catch (err) {
      setError(formatError(err));
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Delegations"
        description="While active, any step routed to you also routes to your delegate. The delegate must be an Approver or Administrator."
      />

      <form onSubmit={handleCreate} className={`space-y-3 ${card} p-5`}>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={label}>Delegate user ID</label>
            <input
              type="number"
              value={delegateId}
              onChange={(e) => setDelegateId(e.target.value)}
              required
              className={`w-full ${input}`}
            />
          </div>
          <div>
            <label className={label}>Starts at</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
              className={`w-full ${input}`}
            />
          </div>
          <div>
            <label className={label}>Ends at</label>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
              className={`w-full ${input}`}
            />
          </div>
        </div>
        {error && <p className={errorText}>{error}</p>}
        <button type="submit" disabled={submitting} className={btnPrimary}>
          {submitting ? "Creating..." : "Create delegation"}
        </button>
      </form>

      {loading && <p className={mutedText}>Loading...</p>}
      {!loading && items.length === 0 && (
        <EmptyState
          icon={<IconUsers />}
          title="No delegations yet"
          description="Create one above to route your approvals to someone else for a period of time."
        />
      )}

      {!loading && items.length > 0 && (
        <ul className={`divide-y divide-gray-100 dark:divide-neutral-800 ${card}`}>
          {items.map((d) => {
            const state = delegationState(d);
            return (
              <li key={d.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-neutral-100">
                      {d.delegator?.name ?? `#${d.delegator_id}`}
                    </span>
                    <span className="text-gray-400 dark:text-neutral-500">&rarr;</span>
                    <span className="font-medium text-gray-900 dark:text-neutral-100">
                      {d.delegate?.name ?? `#${d.delegate_id}`}
                    </span>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${state.className}`}>
                      {state.label}
                    </span>
                  </div>
                  <div className="mt-0.5 text-gray-500 dark:text-neutral-400">
                    {toDatetimeLocal(d.starts_at).replace("T", " ")} to {toDatetimeLocal(d.ends_at).replace("T", " ")}
                  </div>
                </div>
                {(d.delegator_id === user?.id || user?.system_role === "system_administrator") && (
                  <button type="button" onClick={() => handleRevoke(d.id)} className={`shrink-0 ${btnGhost}`}>
                    Revoke
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
