"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function LearningTabs({
  lessons,
  vocabulary,
}: {
  lessons: React.ReactNode;
  vocabulary: React.ReactNode;
}) {
  const [tab, setTab] = useState<"lessons" | "vocabulary">("lessons");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex w-fit gap-1 rounded-pill bg-mist p-1">
        {(["lessons", "vocabulary"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-pill px-4 py-1.5 text-sm font-medium capitalize transition-colors",
              tab === t ? "bg-surface text-ink shadow-card" : "text-slate hover:text-ink"
            )}
          >
            {t === "lessons" ? "Chủ đề bài học" : "Từ vựng"}
          </button>
        ))}
      </div>
      {tab === "lessons" ? lessons : vocabulary}
    </div>
  );
}
