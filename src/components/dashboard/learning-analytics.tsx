"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Clock3, BookOpen, Brain, CalendarDays } from "lucide-react";
import type { HskAnalytics } from "@/lib/api/types";
import { RefreshButton } from "@/components/ui/refresh-button";
import { formatStudyClock, formatStudyDuration } from "@/lib/study-duration";

export function LearningAnalytics({ data, dailyMinutes }: { data: HskAnalytics; dailyMinutes?: number | null }) {
  const values = (data.chart7Dates || []).map((date, index) => ({
    date: new Date(`${date}T12:00:00+07:00`).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
    seconds: Math.max(0, data.chart7DaysSeconds[index] || 0),
  }));
  const progress = dailyMinutes && data.timeTodaySeconds != null ? Math.min(100, Math.max(0, data.timeTodaySeconds / (dailyMinutes * 60) * 100)) : 0;
  const stats = [
    { label: "Học hôm nay", value: formatStudyClock(data.timeTodaySeconds), unit: "phút:giây", Icon: Clock3 },
    { label: "Từ đã học", value: data.vocabularyStats?.learnedCount?.toLocaleString("vi-VN") ?? "—", unit: "từ", Icon: BookOpen },
    { label: "Từ đã nhớ", value: data.vocabularyStats?.masteredCount?.toLocaleString("vi-VN") ?? "—", unit: "từ", Icon: Brain },
    { label: "Ngày đã học", value: data.totalDaysStudied?.toLocaleString("vi-VN") ?? "—", unit: "ngày", Icon: CalendarDays },
  ];

  return <section aria-labelledby="learning-analytics-title" className="flex flex-col gap-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 id="learning-analytics-title" className="hsk-section-title">Thời gian học và từ vựng</h2><p className="mt-1 text-sm text-slate">Thống kê tài khoản theo ngày học tại Việt Nam.</p></div>
      <RefreshButton />
    </div>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{stats.map(({ label, value, unit, Icon }) => <div key={label} className="hsk-panel min-w-0">
      <Icon className="mb-3 text-brand" size={21} /><p className="text-sm text-slate">{label}</p>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2"><span className="text-2xl font-semibold tabular-nums text-ink">{value}</span><span className="text-xs text-slate">{unit}</span></p>
    </div>)}</div>

    <div className="grid gap-5 lg:grid-cols-3">
      <div className="hsk-panel min-w-0 lg:col-span-2">
        <h3 className="text-base font-semibold text-ink">7 ngày gần nhất · {formatStudyDuration(data.time7DaysSeconds)}</h3>
        <p className="mb-4 mt-1 text-xs text-slate">Mỗi cột là một ngày · Thời gian theo phút:giây.</p>
        {values.length ? <div data-study-chart="" className="h-64 min-w-0" role="img" aria-label={`Biểu đồ cột thời gian học 7 ngày: ${values.map(row => `${row.date}: ${formatStudyDuration(row.seconds)}`).join(", ")}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={values} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--mist)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "var(--slate-soft)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis width={54} domain={[0, (maximum: number) => Math.max(60, maximum)]} allowDecimals={false} tickFormatter={formatStudyClock}
                tick={{ fill: "var(--slate-soft)", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--white)", border: "1px solid var(--mist)", borderRadius: 8, color: "var(--ink)" }}
                labelFormatter={date => `Ngày ${date}`} formatter={(value: number) => [formatStudyDuration(value), "Thời gian học"]} cursor={{ fill: "var(--mist)", fillOpacity: 0.35 }} />
              <Bar dataKey="seconds" fill="var(--brand-text)" maxBarSize={36} radius={[6, 6, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div> : <p className="py-16 text-sm text-slate">Chưa có dữ liệu biểu đồ.</p>}
      </div>

      <div className="hsk-panel flex min-w-0 flex-col gap-4">
        <h3 className="text-base font-semibold text-ink">Mục tiêu mỗi ngày</h3>
        <div><p className="text-2xl font-semibold tabular-nums text-ink">{dailyMinutes ? `${formatStudyClock(data.timeTodaySeconds)} / ${formatStudyClock(dailyMinutes * 60)}` : "Chưa đặt mục tiêu"}</p>{dailyMinutes ? <p className="mt-1 text-xs text-slate">phút:giây</p> : null}</div>
        <div role="progressbar" aria-label="Mục tiêu học hôm nay" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-mist"><div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} /></div>
        <Link href="/profile" className="text-sm font-medium text-brand">Chỉnh mục tiêu học →</Link>
        <dl className="mt-2 grid gap-3 border-t border-mist pt-4 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-slate">Đang học</dt><dd className="font-medium text-ink">{data.vocabularyStats?.learningCount ?? "—"} từ</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-slate">Cần ôn lại</dt><dd className="font-medium text-ink">{data.vocabularyStats?.reviewCount ?? "—"} từ</dd></div>
          <div className="flex flex-wrap justify-between gap-3"><dt className="text-slate">Tổng thời gian</dt><dd className="font-medium text-ink">{formatStudyDuration(data.timeTotalSeconds)}</dd></div>
        </dl>
      </div>
    </div>
  </section>;
}
