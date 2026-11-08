// Shared by server catalog pages and client study cards.
export function HskBadge({ level }: { level: number }) {
  const colors = ["", "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400", "bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400", "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400", "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400", "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400", "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400", "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400", "bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-500/10 dark:text-fuchsia-400", "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"];
  return <span className={`inline-flex shrink-0 rounded-md px-2.5 py-1 text-xs font-medium ${colors[level] || "bg-mist text-slate"}`}>HSK {level}</span>;
}
