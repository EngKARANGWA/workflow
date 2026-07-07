"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { roles as rolesApi, users as usersApi } from "@/lib/api";
import { formatError } from "@/lib/format-error";
import type { BusinessRole, SystemRole, User } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/Modal";
import { CountrySelect } from "@/components/CountrySelect";
import { IconUserPlus, IconUsers } from "@/components/icons";
import { initials } from "@/lib/initials";
import {
  btnGhost,
  btnPrimary,
  errorText,
  input,
  label,
  mutedText,
  tableDivide,
  tableHead,
  tableHeadCell,
  tableWrap,
} from "@/lib/ui";

const SYSTEM_ROLES: SystemRole[] = ["requester", "approver", "system_administrator"];

export default function UsersPage() {
  const [items, setItems] = useState<User[]>([]);
  const [businessRoles, setBusinessRoles] = useState<BusinessRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    setLoading(true);
    Promise.all([usersApi.list({ per_page: 100 }), rolesApi.list()])
      .then(([userRes, roleRes]) => {
        setItems(userRes.data);
        setBusinessRoles(roleRes);
      })
      .catch((err) => {
        const message = formatError(err);
        setError(message);
        toast.error(message);
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setError(null);
    setDeleting(true);
    try {
      await usersApi.remove(pendingDelete.id);
      toast.success("User deleted");
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
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage accounts, system roles, and business-role assignments."
        action={
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className={`flex items-center gap-1.5 ${btnPrimary}`}
          >
            <IconUserPlus className="h-4 w-4" /> New user
          </button>
        }
      />

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New user" maxWidth="36rem">
        <CreateUserForm
          businessRoles={businessRoles}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      </Modal>

      {error && <p className={errorText}>{error}</p>}
      {loading && <p className={mutedText}>Loading...</p>}

      {!loading && items.length === 0 && (
        <EmptyState icon={<IconUsers />} title="No users yet" description="Create the first one above." />
      )}

      {!loading && items.length > 0 && (
        <div className={tableWrap}>
          <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-neutral-800">
            <thead className={tableHead}>
              <tr>
                <th className={tableHeadCell}>Name</th>
                <th className={tableHeadCell}>Email</th>
                <th className={tableHeadCell}>System role</th>
                <th className={tableHeadCell}>Business roles</th>
                <th className={tableHeadCell} />
              </tr>
            </thead>
            <tbody className={tableDivide}>
              {items.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-700 dark:bg-neutral-700 dark:text-neutral-200">
                        {initials(u.name)}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-neutral-100">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-neutral-300">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-700 dark:bg-neutral-800 dark:text-neutral-300">
                      {u.system_role.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-neutral-300">
                    {u.roles?.map((r) => r.name).join(", ") || "-"}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button type="button" onClick={() => setPendingDelete(u)} className={btnGhost}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete ${pendingDelete?.name ?? "this user"}?`}
        description="This permanently removes the account and cannot be undone."
        confirmLabel="Delete"
        submitting={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function CreateUserForm({
  businessRoles,
  onCreated,
}: {
  businessRoles: BusinessRole[];
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [systemRole, setSystemRole] = useState<SystemRole>("requester");
  const [department, setDepartment] = useState("");
  const [employeeLevel, setEmployeeLevel] = useState("");
  const [country, setCountry] = useState("");
  const [roleIds, setRoleIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleRole(id: number) {
    setRoleIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await usersApi.create({
        name,
        email,
        password,
        system_role: systemRole,
        department: department || undefined,
        employee_level: employeeLevel || undefined,
        country: country || undefined,
        role_ids: roleIds,
      });
      toast.success("User created");
      onCreated();
    } catch (err) {
      const message = formatError(err);
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <TextInput id="new-user-name" label="Name" value={name} onChange={setName} required />
        <TextInput id="new-user-email" label="Email" type="email" value={email} onChange={setEmail} required />
        <TextInput
          id="new-user-password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          required
        />
        <div>
          <label className={label} htmlFor="new-user-system-role">
            System role
          </label>
          <select
            id="new-user-system-role"
            value={systemRole}
            onChange={(e) => setSystemRole(e.target.value as SystemRole)}
            className={`w-full ${input}`}
          >
            {SYSTEM_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <TextInput id="new-user-department" label="Department" value={department} onChange={setDepartment} />
        <TextInput
          id="new-user-employee-level"
          label="Employee level"
          value={employeeLevel}
          onChange={setEmployeeLevel}
        />
        <div>
          <label className={label} htmlFor="new-user-country">
            Country
          </label>
          <CountrySelect id="new-user-country" value={country} onChange={setCountry} />
        </div>
      </div>

      {businessRoles.length > 0 && (
        <div>
          <label className={label}>Business roles (for step routing)</label>
          <div className="flex flex-wrap gap-3">
            {businessRoles.map((r) => (
              <label
                key={r.id}
                className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-neutral-300"
              >
                <input type="checkbox" checked={roleIds.includes(r.id)} onChange={() => toggleRole(r.id)} />
                {r.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {error && <p className={errorText}>{error}</p>}

      <button type="submit" disabled={submitting} className={btnPrimary}>
        {submitting ? "Creating..." : "Create user"}
      </button>
    </form>
  );
}

function TextInput({
  id,
  label: labelText,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className={label} htmlFor={id}>
        {labelText}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full ${input}`}
      />
    </div>
  );
}
