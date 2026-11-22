// Shared by server catalog pages and client study cards.
export function HskBadge({ level }: { level: number }) {
  const colors = ["", "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300", "bg-teal-50 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300", "bg-sky-50 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300", "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300", "bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300", "bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300", "bg-purple-50 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300", "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/20 dark:text-fuchsia-300", "bg-violet-50 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300"];
  return <span className={`inline-flex shrink-0 rounded-md px-2.5 py-1 text-xs font-medium dark:ring-1 dark:ring-inset dark:ring-white/10 ${colors[level] || "bg-mist text-slate"}`}>HSK {level}</span>;
}
