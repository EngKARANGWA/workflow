"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { notifications as notificationsApi } from "@/lib/api";
import { formatError } from "@/lib/format-error";
import type { AppNotification } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { IconBell, IconInbox } from "@/components/icons";
import { card, errorText, mutedText } from "@/lib/ui";

export default function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  function load() {
    setLoading(true);
    notificationsApi
      .list({ per_page: 50 })
      .then((res) => setItems(res.data))
      .catch((err) => {
        const message = formatError(err);
        setError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function markRead(id: number) {
    setError(null);
    try {
      await notificationsApi.markRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    } catch (err) {
      const message = formatError(err);
      setError(message);
      toast.error(message);
    }
  }

  const unread = items.filter((n) => !n.read_at);

  async function markAllRead() {
    setError(null);
    setMarkingAll(true);
    try {
      await Promise.all(unread.map((n) => notificationsApi.markRead(n.id)));
      const now = new Date().toISOString();
      setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
      toast.success("All notifications marked as read");
    } catch (err) {
      const message = formatError(err);
      setError(message);
      toast.error(message);
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Notifications"
        description={unread.length > 0 ? `${unread.length} unread` : "You're all caught up."}
        action={
          unread.length > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              disabled={markingAll}
              className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-400"
            >
              {markingAll ? "Marking..." : "Mark all as read"}
            </button>
          )
        }
      />

      {error && <p className={errorText}>{error}</p>}
      {loading && <p className={mutedText}>Loading...</p>}
      {!loading && items.length === 0 && (
        <EmptyState icon={<IconInbox />} title="No notifications" description="You'll see updates here as they happen." />
      )}

      {!loading && items.length > 0 && (
        <ul className={`divide-y divide-gray-100 dark:divide-neutral-800 ${card}`}>
          {items.map((n) => (
            <li
              key={n.id}
              className={`flex items-start gap-3 px-4 py-3 text-sm ${
                !n.read_at ? "bg-blue-50 dark:bg-blue-500/10" : ""
              }`}
            >
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  !n.read_at
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
                    : "bg-gray-100 text-gray-400 dark:bg-neutral-800 dark:text-neutral-500"
                }`}
              >
                <IconBell className="h-3.5 w-3.5" />
              </span>
              <div className="flex-1">
                <p className="text-gray-900 dark:text-neutral-100">{n.message}</p>
                <p className="mt-0.5 text-gray-400 dark:text-neutral-500">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {!n.read_at && (
                <button
                  type="button"
                  onClick={() => markRead(n.id)}
                  className="shrink-0 whitespace-nowrap text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                >
                  Mark read
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
