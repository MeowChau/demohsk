import Link from "next/link";
import { Swords } from "lucide-react";
import { requireApiUser, serverApi } from "@/lib/api/server";
import type { HskWord, OfflineScore } from "@/lib/api/types";
import { HSK_LEVELS } from "@/lib/hsk";
import { parseCatalogQuery, type SearchParams } from "@/lib/catalog-query";
import { PageHeading } from "@/components/ui/catalog";
import { VocabularyGame } from "@/components/learning/vocabulary-game";
export const metadata = { title: "Trò chơi tiếng Trung" };
export default async function GamesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireApiUser();
  const level = parseCatalogQuery(await searchParams, user.currentHskLevel || 1).hskLevel || "1";
  const [words, scores] = await Promise.all([serverApi<HskWord[]>(`game/offline/words?hskLevel=${level}&limit=30`), serverApi<OfflineScore[]>("game/offline/top-scores")]);
  return <div className="flex flex-col gap-6"><PageHeading title="Trò chơi tiếng Trung" description="Ôn từ vựng qua lượt chơi ngắn hoặc tìm đối thủ trong phòng PK cùng cấp độ."><Link className="hsk-button" href={`/games/pk?hskLevel=${level}`}><Swords size={16} />Đấu PK</Link></PageHeading><form action="/games" className="flex items-end gap-3"><label className="hsk-label">Cấp độ từ vựng<select className="hsk-input" name="hskLevel" defaultValue={level}>{HSK_LEVELS.map(value => <option value={value} key={value}>HSK {value}</option>)}</select></label><button className="hsk-button-secondary">Đổi cấp độ</button></form><div className="grid items-start gap-5 lg:grid-cols-3"><div className="lg:col-span-2"><VocabularyGame key={level} words={words} /></div><aside className="hsk-panel"><h2 className="hsk-section-title">Điểm cao của bạn</h2>{scores.length ? <ol className="mt-4 flex flex-col gap-4">{scores.map((score, index) => <li key={score.id} className="flex items-center justify-between gap-3 border-b border-mist pb-3 last:border-0"><div><p className="text-sm font-medium text-ink">Hạng {index + 1}</p><p className="mt-1 text-xs text-slate-soft">{new Date(score.playedAt).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p></div><span className="text-lg font-semibold text-brand">{score.score}</span></li>)}</ol> : <p className="mt-4 text-sm text-slate">Chưa có lượt chơi đã lưu.</p>}</aside></div></div>;
}
