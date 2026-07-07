"use client";

import { useEffect, useMemo, useState } from "react";
import { users as usersApi } from "@/lib/api";
import type { User } from "@/lib/types";
import { input, inputSm } from "@/lib/ui";

const MAX_RESULTS = 20;

export function UserSelect({
  value,
  onChange,
  excludeUserId,
  placeholder = "Search by name or email...",
  className,
  size = "md",
}: {
  value: number | null;
  onChange: (userId: number | null) => void;
  excludeUserId?: number;
  placeholder?: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const fieldClass = size === "sm" ? inputSm : input;
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    usersApi
      .list({ per_page: 100 })
      .then((res) => setAllUsers(res.data))
      .finally(() => setLoading(false));
  }, []);

  const selectedUser = useMemo(() => allUsers.find((u) => u.id === value) ?? null, [allUsers, value]);

  const results = useMemo(() => {
    const pool = excludeUserId ? allUsers.filter((u) => u.id !== excludeUserId) : allUsers;
    const q = query.trim().toLowerCase();
    const matches = q
      ? pool.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      : pool;
    return matches.slice(0, MAX_RESULTS);
  }, [allUsers, excludeUserId, query]);

  function select(user: User) {
    onChange(user.id);
    setQuery("");
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setQuery("");
  }

  return (
    <div
      tabIndex={-1}
      className={`relative ${className ?? ""}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      {selectedUser && !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`flex w-full items-center justify-between gap-2 text-left ${fieldClass}`}
        >
          <span className="truncate text-gray-900 dark:text-neutral-100">
            {selectedUser.name}{" "}
            <span className="text-gray-400 dark:text-neutral-500">({selectedUser.email})</span>
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              clear();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                clear();
              }
            }}
            aria-label="Clear selection"
            className="shrink-0 text-gray-400 hover:text-red-600 dark:text-neutral-500 dark:hover:text-red-400"
          >
            &times;
          </span>
        </button>
      ) : (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) {
              e.preventDefault();
              select(results[0]);
            }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={loading ? "Loading users..." : placeholder}
          disabled={loading}
          className={`w-full ${fieldClass}`}
        />
      )}

      {open && !loading && (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400 dark:text-neutral-500">No users found.</p>
          ) : (
            results.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => select(u)}
                className="block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-neutral-800"
              >
                <span className="font-medium text-gray-900 dark:text-neutral-100">{u.name}</span>{" "}
                <span className="text-gray-400 dark:text-neutral-500">{u.email}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
