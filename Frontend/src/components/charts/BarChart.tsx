"use client";

import { useState } from "react";

type Bar = { label: string; value: number };

export function BarChart({ data, height = 140 }: { data: Bar[]; height?: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 1);
  const barWidth = 100 / data.length;

  return (
    <div className="relative" style={{ height }}>
      <div className="absolute inset-x-0 bottom-6 border-t border-gray-200 dark:border-neutral-800" />
      <div className="flex h-full items-end" style={{ paddingBottom: 24 }}>
        {data.map((d, i) => {
          const barHeight = (d.value / max) * (height - 24 - 8);
          return (
            <div
              key={i}
              className="relative flex h-full flex-1 flex-col items-center justify-end"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
            >
              {hovered === i && (
                <div className="absolute -top-2 z-10 -translate-y-full rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow-lg dark:bg-neutral-700">
                  {d.value} on {d.label}
                </div>
              )}
              <div
                className="w-full max-w-[22px] rounded-t-[4px] bg-blue-500 transition-colors dark:bg-blue-500"
                style={{
                  height: Math.max(barHeight, d.value > 0 ? 3 : 0),
                  opacity: hovered === null || hovered === i ? 1 : 0.5,
                }}
              />
              <span
                className="mt-1.5 truncate text-[11px] text-gray-400 dark:text-neutral-500"
                style={{ maxWidth: `${barWidth}%` }}
              >
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
