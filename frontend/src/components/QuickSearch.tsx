"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { IconSearch } from "./icons";

type Page = { label: string; href: string; adminOnly?: boolean; approverOnly?: boolean };

const PAGES: Page[] = [
  { label: "Requests", href: "/requests" },
  { label: "New request", href: "/requests/new" },
  { label: "Delegations", href: "/delegations", approverOnly: true },
  { label: "Notifications", href: "/notifications" },
  { label: "Workflows", href: "/admin/workflows", adminOnly: true },
  { label: "Users", href: "/admin/users", adminOnly: true },
  { label: "Roles", href: "/admin/roles", adminOnly: true },
  { label: "Reports", href: "/admin/reports", adminOnly: true },
];

export function QuickSearch({ isAdmin, isApproverOrAdmin }: { isAdmin: boolean; isApproverOrAdmin: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    const available = PAGES.filter((p) => (!p.adminOnly || isAdmin) && (!p.approverOnly || isApproverOrAdmin));
    if (!query.trim()) return available;
    return available.filter((p) => p.label.toLowerCase().includes(query.trim().toLowerCase()));
  }, [query, isAdmin, isApproverOrAdmin]);

  function go(href: string) {
    router.push(href);
    setQuery("");
    setFocused(false);
  }

  return (
    <div
      className="relative w-full max-w-xs"
      tabIndex={-1}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false);
      }}
    >
      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-neutral-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) go(results[0].href);
            if (e.key === "Escape") setFocused(false);
          }}
          placeholder="Search pages..."
          className="w-full rounded-md border border-gray-300 bg-gray-50 py-1.5 pl-8 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:bg-neutral-900"
        />
      </div>
      {focused && results.length > 0 && (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-full overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          {results.map((p) => (
            <button
              key={p.href}
              type="button"
              onClick={() => go(p.href)}
              className="block w-full px-3.5 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
