const COLORS: Record<string, string> = {
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400",
  approved: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400",
  returned: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-400",
  active: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-400",
  completed: "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400",
  skipped: "bg-gray-100 text-gray-500 dark:bg-neutral-800 dark:text-neutral-400",
  pending: "bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300",
};

export function StatusBadge({ status }: { status: string }) {
  const color = COLORS[status] ?? "bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300";
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium capitalize ${color}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
