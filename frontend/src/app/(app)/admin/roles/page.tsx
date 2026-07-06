"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { roles as rolesApi } from "@/lib/api";
import { formatError } from "@/lib/format-error";
import type { BusinessRole } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { IconTag } from "@/components/icons";
import { btnPrimary, card, errorText, input, mutedText, tableDivide, tableWrap } from "@/lib/ui";

export default function RolesPage() {
  const [items, setItems] = useState<BusinessRole[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<BusinessRole | null>(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    setLoading(true);
    rolesApi
      .list()
      .then(setItems)
      .catch((err) => {
        const message = formatError(err);
        setError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await rolesApi.create({ name, description: description || undefined });
      toast.success("Business role created");
      setName("");
      setDescription("");
      load();
    } catch (err) {
      const message = formatError(err);
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setError(null);
    setDeleting(true);
    try {
      await rolesApi.remove(pendingDelete.id);
      toast.success("Business role deleted");
      setPendingDelete(null);
      load();
    } catch (err) {
      const message = formatError(err);
      setError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Business roles"
        description="Used for step routing (Finance, Legal, CEO, ...) — distinct from system roles."
      />

      <form onSubmit={handleCreate} className={`flex gap-2 ${card} p-4`}>
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className={`w-48 shrink-0 ${input}`}
        />
        <input
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`flex-1 ${input}`}
        />
        <button type="submit" disabled={submitting} className={btnPrimary}>
          Add
        </button>
      </form>

      {error && <p className={errorText}>{error}</p>}
      {loading && <p className={mutedText}>Loading...</p>}

      {!loading && items.length === 0 && (
        <EmptyState
          icon={<IconTag />}
          title="No business roles yet"
          description="Add one above to start routing workflow steps to it."
        />
      )}

      {!loading && items.length > 0 && (
        <ul className={`${tableDivide} ${tableWrap}`}>
          {items.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-neutral-800 dark:text-neutral-400">
                  <IconTag className="h-4 w-4" />
                </span>
                <div>
                  <span className="font-medium text-gray-900 dark:text-neutral-100">{r.name}</span>
                  {r.description && (
                    <span className="text-gray-500 dark:text-neutral-400"> — {r.description}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingDelete(r)}
                className="shrink-0 text-gray-400 hover:text-red-600 dark:text-neutral-500 dark:hover:text-red-400"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete ${pendingDelete?.name ?? "this role"}?`}
        description="Any workflow steps that route to this role will lose that approver assignment."
        confirmLabel="Delete"
        submitting={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
