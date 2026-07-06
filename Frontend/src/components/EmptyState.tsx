import { card } from "@/lib/ui";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${card} px-6 py-14 text-center`}>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-neutral-800 dark:text-neutral-500">
        {icon}
      </span>
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-neutral-100">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
