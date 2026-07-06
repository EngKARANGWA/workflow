"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatError } from "@/lib/format-error";
import { btnPrimary, card, errorText, input, label, mutedText } from "@/lib/ui";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    department: "",
    employee_level: "",
    country: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(form);
      router.push("/requests");
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-gray-50 px-4 py-12 dark:bg-neutral-950">
      <div className={`w-full max-w-md space-y-6 ${card} p-8 shadow-sm`}>
        <div className="space-y-1.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-600 text-sm font-semibold text-white">
            W
          </div>
          <h1 className="pt-2 text-xl font-semibold text-gray-900 dark:text-neutral-100">
            Create an account
          </h1>
          <p className={mutedText}>
            Registers as a Requester. Approver/Admin accounts are provisioned by an admin.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field id="name" label="Name" value={form.name} onChange={(v) => update("name", v)} required />
          <Field
            id="email"
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => update("email", v)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              id="password"
              label="Password"
              type="password"
              value={form.password}
              onChange={(v) => update("password", v)}
              required
            />
            <Field
              id="password_confirmation"
              label="Confirm password"
              type="password"
              value={form.password_confirmation}
              onChange={(v) => update("password_confirmation", v)}
              required
            />
          </div>

          <div className="border-t border-gray-200 pt-4 dark:border-neutral-800">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-neutral-500">
              Additional info (optional)
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Field
                id="department"
                label="Department"
                value={form.department}
                onChange={(v) => update("department", v)}
              />
              <Field
                id="employee_level"
                label="Level"
                value={form.employee_level}
                onChange={(v) => update("employee_level", v)}
              />
              <Field id="country" label="Country" value={form.country} onChange={(v) => update("country", v)} />
            </div>
          </div>

          {error && <p className={errorText}>{error}</p>}

          <button type="submit" disabled={submitting} className={`w-full ${btnPrimary}`}>
            {submitting ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className={mutedText}>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
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
