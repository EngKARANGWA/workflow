// Fixed status palette (validated: light/dark-surface contrast + CVD-safe as a
// set) — never themed, reused everywhere a status needs a real data-ink color
// (charts). Text-only badges elsewhere use Tailwind tokens for legibility;
// this is the "ink" version for marks (donut segments, bars).
export const STATUS_HEX = {
  approved: "#0ca30c", // good
  in_progress: "#fab219", // warning
  returned: "#ec835a", // serious
  rejected: "#d03b3b", // critical
} as const;

export const STATUS_LABEL: Record<keyof typeof STATUS_HEX, string> = {
  approved: "Approved",
  in_progress: "In progress",
  returned: "Returned",
  rejected: "Rejected",
};

export const STATUS_ORDER = ["in_progress", "approved", "returned", "rejected"] as const;
