"use client";

import { useMemo, useState } from "react";
import { COUNTRIES } from "@/lib/countries";
import { input, inputSm } from "@/lib/ui";

const MAX_RESULTS = 20;

export function CountrySelect({
  value,
  onChange,
  placeholder = "Search countries...",
  className,
  id,
  size = "md",
}: {
  value: string;
  onChange: (country: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  size?: "sm" | "md";
}) {
  const fieldClass = size === "sm" ? inputSm : input;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? COUNTRIES.filter((c) => c.toLowerCase().includes(q)) : COUNTRIES;
    return matches.slice(0, MAX_RESULTS);
  }, [query]);

  function select(country: string) {
    onChange(country);
    setQuery("");
    setOpen(false);
  }

  function clear() {
    onChange("");
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
      {value && !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`flex w-full items-center justify-between gap-2 text-left ${fieldClass}`}
        >
          <span className="truncate text-gray-900 dark:text-neutral-100">{value}</span>
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
          id={id}
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
          placeholder={placeholder}
          className={`w-full ${fieldClass}`}
        />
      )}

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400 dark:text-neutral-500">No countries found.</p>
          ) : (
            results.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => select(c)}
                className="block w-full truncate px-3 py-1.5 text-left text-sm text-gray-900 hover:bg-gray-50 dark:text-neutral-100 dark:hover:bg-neutral-800"
              >
                {c}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
