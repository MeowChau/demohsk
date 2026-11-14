import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock3, ShieldCheck, Swords, Users } from "lucide-react";
import { requireApiUser } from "@/lib/api/server";
import { backendUrl } from "@/lib/api/config";
import type { SearchParams } from "@/lib/catalog-query";
import { validHskLevel } from "@/lib/hsk";
import { PageHeading } from "@/components/ui/catalog";
import { HskBadge } from "@/components/ui/catalog-badge";
import { PkArena } from "@/components/learning/pk-arena";

export const metadata = { title: "Ghép trận PK" };

export default async function PkMatchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireApiUser();
  const level = validHskLevel(user.currentHskLevel);
  if (level === null) redirect("/games");
  const params = await searchParams;
  if (params.hskLevel !== undefined && params.hskLevel !== String(level)) {
    redirect("/games/match?hskLevel=" + level);
  }
  const api = new URL(backendUrl());
  const backendOrigin = api.origin + api.pathname;

  return <div className="flex min-w-0 flex-col gap-6">
    <PageHeading title="Thi đấu PK" description="Ghép đối thủ cùng cấp HSK và sẵn sàng cho trận so tài từ vựng.">
      <Link href={"/games?hskLevel=" + level} className="hsk-button-secondary"><ArrowLeft size={17} aria-hidden="true" />Về sảnh PK</Link>
    </PageHeading>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <PkArena key={backendOrigin + ":" + user.id + ":" + level} userId={Number(user.id)} level={level} backendOrigin={backendOrigin} autoMatch />
      <aside className="hsk-panel flex flex-col gap-5" aria-labelledby="pk-rules-title">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="pk-rules-title" className="hsk-section-title">Trận đấu của bạn</h2><HskBadge level={level} /></div>
        <div className="flex items-start gap-3"><Users className="mt-1 shrink-0 text-brand" size={20} aria-hidden="true" /><div><h3 className="text-sm font-semibold text-ink">Đấu trực tiếp 1 vs 1</h3><p className="mt-1 text-sm leading-6 text-slate">Cả hai người chơi xác nhận sẵn sàng để bắt đầu.</p></div></div>
        <div className="flex items-start gap-3"><Clock3 className="mt-1 shrink-0 text-brand" size={20} aria-hidden="true" /><div><h3 className="text-sm font-semibold text-ink">Luân phiên theo lượt</h3><p className="mt-1 text-sm leading-6 text-slate">Trả lời trong thời gian hiển thị. Hết lượt, người chơi tiếp theo sẽ trả lời.</p></div></div>
        <div className="flex items-start gap-3"><Swords className="mt-1 shrink-0 text-brand" size={20} aria-hidden="true" /><div><h3 className="text-sm font-semibold text-ink">Nhanh và chính xác</h3><p className="mt-1 text-sm leading-6 text-slate">Trả lời đúng, nhanh và giữ chuỗi đúng để tăng điểm. Kết quả và EXP được lưu sau trận.</p></div></div>
        <p className="flex items-start gap-2 border-t border-mist pt-4 text-xs leading-5 text-slate"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />Rời trận đang diễn ra sẽ tính bỏ cuộc. Bạn sẽ được hỏi xác nhận trước khi rời trang.</p>
      </aside>
    </div>
  </div>;
}
