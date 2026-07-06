import { card } from "@/lib/ui";
import { Sparkline } from "@/components/charts/Sparkline";

const TONES = {
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  green: "bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400",
  orange: "bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
  red: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400",
} as const;

const TONE_HEX = {
  blue: "#3b82f6",
  amber: "#f59e0b",
  green: "#22c55e",
  orange: "#f97316",
  red: "#ef4444",
} as const;

type StatTileProps = {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone: keyof typeof TONES;
  href?: string;
  onClick?: () => void;
  trend?: number[];
};

export function StatTile({ label, value, icon, tone, href, onClick, trend }: StatTileProps) {
  const interactive = Boolean(href || onClick);
  const className = `flex w-full items-center justify-between gap-3 overflow-hidden text-left ${card} p-4 ${
    interactive ? "transition-colors hover:border-gray-300 dark:hover:border-neutral-700" : ""
  }`;

  const content = (
    <>
      <span className="flex min-w-0 items-center gap-3.5">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${TONES[tone]}`}>
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block text-2xl font-semibold text-gray-900 dark:text-neutral-100">{value}</span>
          <span className="block truncate text-sm text-gray-500 dark:text-neutral-400">{label}</span>
        </span>
      </span>
      {trend && trend.some((v) => v > 0) && (
        <span className="hidden shrink-0 sm:block">
          <Sparkline values={trend} accent={TONE_HEX[tone]} />
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
