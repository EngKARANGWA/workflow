"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatError } from "@/lib/format-error";

const glassInput =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 backdrop-blur-sm transition-colors focus:outline-none focus:border-blue-400/60 focus:bg-white/10 focus:ring-2 focus:ring-blue-500/30";

const glassLabel = "mb-1.5 block text-sm font-medium text-white/70";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/requests");
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[#05070d] lg:flex-row">
      <Image
        src="/login-bg.jpg"
        alt=""
        fill
        priority
        className="object-cover object-center opacity-90"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#05070d] via-[#05070d]/70 to-[#05070d]/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#05070d] via-transparent to-[#05070d]/40" />

      <div className="relative z-10 p-6 lg:hidden">
        <span className="text-lg font-semibold text-white">Workflow Engine</span>
      </div>

      <div className="relative z-10 hidden flex-1 flex-col justify-between p-8 sm:p-12 lg:flex lg:p-16">
        <div className="flex items-center gap-2.5">
          <span className="text-lg font-semibold text-white">Workflow Engine</span>
        </div>

        <div className="hidden max-w-md lg:block">
          <h1 className="text-4xl font-semibold leading-tight text-white">
            Approvals that route
            <br />
            themselves.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/60">
            Define workflows once - conditions, steps, and approvers - and let the engine handle
            routing, delegation, and audit trails for every request that follows.
          </p>
        </div>

        <p className="text-xs text-white/30">
          &copy; {new Date().getFullYear()} Workflow Engine. Internal tool.
        </p>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-10 sm:px-12 lg:mx-0 lg:flex-none lg:px-0 lg:pr-16 xl:pr-24">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <h2 className="text-xl font-semibold text-white">Sign in</h2>
          <p className="mt-1 text-sm text-white/50">Welcome back - enter your details below.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className={glassLabel} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={glassInput}
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className={glassLabel} htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={glassInput}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/50">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-blue-400 hover:text-blue-300 hover:underline">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
