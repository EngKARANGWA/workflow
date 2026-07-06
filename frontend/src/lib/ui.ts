// Deliberately has no width utility — combining a conflicting `w-*` class in a
// template string is unreliable (Tailwind's stylesheet order decides the winner,
// not string order), so every call site sets its own width (`w-full`, `flex-1`, ...).
export const input =
  "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500";

export const inputSm =
  "rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500";

export const card = "rounded-lg border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900";

export const label = "block text-sm font-medium mb-1 text-gray-700 dark:text-neutral-300";

export const btnPrimary =
  "rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors";

export const btnGhost =
  "text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-neutral-100 transition-colors";

export const errorText = "text-sm text-red-600 dark:text-red-400";

export const mutedText = "text-sm text-gray-500 dark:text-neutral-400";

export const tableWrap = "overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900";

export const tableHead = "bg-gray-50 dark:bg-neutral-800/50";

export const tableHeadCell = "px-4 py-2.5 text-left font-medium text-gray-500 dark:text-neutral-400";

export const tableDivide = "divide-y divide-gray-100 dark:divide-neutral-800";
