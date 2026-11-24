import { NavigationLink as Link } from "@/components/shell/navigation-protection";
import { ArrowRight, Check, Clock3, History, LockKeyhole, ShieldCheck, Swords, Trophy, Users, Zap } from "lucide-react";
import { HskBadge } from "@/components/ui/catalog-badge";

const steps = [
  { icon: Users, title: "Ghép người cùng HSK", text: "Hệ thống ghép theo đúng mức HSK hiện tại trong hồ sơ của bạn." },
  { icon: Check, title: "Cùng xác nhận sẵn sàng", text: "Xem đối thủ được ghép và xác nhận để bắt đầu thi đấu." },
  { icon: Clock3, title: "So tài theo lượt", text: "Trả lời đúng và nhanh để ghi điểm. Kết quả và EXP được lưu khi trận kết thúc." },
];

export function PkLobby({ currentLevel, displayName, avatarUrl, totalMatches }: {
  currentLevel: number | null;
  displayName: string;
  avatarUrl: string | null;
  totalMatches: number | null;
}) {
  const initial = Array.from(displayName.trim())[0]?.toLocaleUpperCase("vi-VN") || "B";

  return <div className="flex min-w-0 flex-col gap-5">
    <section className="hsk-panel grid min-w-0 gap-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(19rem,0.85fr)] lg:gap-10" aria-labelledby="pk-lobby-title">
      <div className="flex min-w-0 flex-col justify-between gap-7">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand"><Swords size={16} aria-hidden="true" />Sảnh thi đấu</p>
          <h2 id="pk-lobby-title" className="mt-3 font-display text-2xl font-bold leading-tight text-ink sm:text-3xl">Ôn từ vựng qua<br className="hidden sm:block" /> mỗi trận so tài.</h2>
          <p className="mt-3 hidden max-w-lg text-sm leading-6 text-slate sm:block">Thử sức cùng bạn học, ghi nhớ từ vựng và nhận EXP từ những trận đấu trực tiếp.</p>
          <div className="mt-4 hidden flex-wrap gap-2 sm:flex">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand/5 px-3 py-1.5 text-xs font-medium text-brand"><Users size={15} aria-hidden="true" />Đấu 1 vs 1</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-teal/10 px-3 py-1.5 text-xs font-medium text-teal"><Zap size={15} aria-hidden="true" />Nhận EXP sau trận</span>
          </div>
        </div>

        <div className="hidden items-center gap-3 lg:flex" aria-label="Bạn sẽ được ghép với một người chơi cùng cấp HSK">
          <div className="flex min-w-0 flex-1 flex-col items-center rounded-lg border border-brand/20 bg-brand/5 px-3 py-5 text-center">
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
              : <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-xl font-semibold text-brand" aria-hidden="true">{initial}</span>}
            <p className="mt-3 max-w-full truncate text-sm font-semibold text-ink" title={displayName}>{displayName}</p>
            <p className="mt-1 text-xs text-slate">Bạn</p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-mist bg-surface text-xs font-bold text-brand" aria-hidden="true">VS</span>
          <div className="flex min-w-0 flex-1 flex-col items-center rounded-lg border border-dashed border-control bg-paper px-3 py-5 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-mist text-slate" aria-hidden="true"><Users size={26} /></span>
            <p className="mt-3 text-sm font-semibold text-ink">Đối thủ của bạn</p>
            <p className="mt-1 text-xs text-slate">{currentLevel === null ? "Người chơi cùng trình độ" : `Người chơi cùng HSK ${currentLevel}`}</p>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-col rounded-lg border border-mist bg-paper p-5 sm:p-6" aria-labelledby="pk-setup-title">
        <h3 id="pk-setup-title" className="text-lg font-semibold text-ink">Cấp độ thi đấu</h3>
        <p className="mt-2 text-sm leading-6 text-slate">Bạn được ghép với người chơi có cùng mức HSK hiện tại.</p>
        <div className="mt-5 flex items-center gap-3 rounded-md border border-control bg-surface p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand/5 text-brand" aria-hidden="true"><LockKeyhole size={20} /></span>
          <div><p className="font-semibold text-ink">{currentLevel === null ? "Chưa có cấp độ HSK" : `HSK ${currentLevel}`}</p><p className="mt-1 text-xs leading-5 text-slate">Theo mức HSK hiện tại trong hồ sơ</p></div>
        </div>
        <p className="mt-2 min-h-10 text-xs leading-5 text-slate">{currentLevel === null ? "Cập nhật mức HSK trong hồ sơ trước khi ghép trận." : "Cấp PK được giữ đúng theo hồ sơ, không chọn cao hơn hoặc thấp hơn."}</p>
        {currentLevel === null
          ? <Link href="/profile" className="hsk-button mt-4 min-h-12 w-full justify-center px-5 font-semibold">Cập nhật mức HSK</Link>
          : <Link href={"/games/match?hskLevel=" + currentLevel} prefetch={false} className="hsk-button mt-4 min-h-12 w-full justify-center px-5 font-semibold" aria-label={"Ghép trận HSK " + currentLevel}><Swords size={18} aria-hidden="true" />Ghép trận</Link>}
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate"><ShieldCheck className="mt-0.5 shrink-0 text-brand" size={16} aria-hidden="true" />Hai bên xác nhận sẵn sàng trước khi bắt đầu.</p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-mist pt-4 text-xs text-slate">
          <p className="flex items-center gap-2"><Trophy size={16} aria-hidden="true" /><span><strong className="font-semibold text-ink">{totalMatches === null ? "—" : totalMatches.toLocaleString("vi-VN")}</strong> trận đã chơi</span></p>
          {currentLevel !== null && <HskBadge level={currentLevel} />}
        </div>
      </div>
    </section>

    <div className="grid gap-4 sm:grid-cols-3" aria-label="Các bước vào trận PK">
      {steps.map(({ icon: Icon, title, text }, index) => <section key={title} className="hsk-panel flex items-start gap-3 p-4 sm:flex-col sm:p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand/5 text-brand" aria-hidden="true"><Icon size={21} /></span>
        <div><p className="mb-1 text-xs font-medium text-slate">Bước {index + 1}</p><h3 className="text-sm font-semibold text-ink">{title}</h3><p className="mt-2 text-xs leading-5 text-slate">{text}</p></div>
      </section>)}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate">
      <p>Bỏ cuộc trong lúc thi đấu sẽ tính thua và không nhận EXP.</p>
      <Link href="#pk-history" className="inline-flex min-h-11 items-center gap-2 font-medium text-brand hover:underline"><History size={16} aria-hidden="true" />Xem lịch sử thi đấu<ArrowRight size={15} aria-hidden="true" /></Link>
    </div>
  </div>;
}
