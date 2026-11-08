import type { SupportTicket } from "@/types/community";
import type { TicketStatus } from "@/types/community";
import { getCurrentStudentId } from "@/lib/auth/current-user";
import { CreateTicketForm } from "./create-ticket-form";
import { WarningIcon, InfoIcon, CheckIcon } from "@/components/icons/stat-icons";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_ICON: Record<TicketStatus, typeof WarningIcon> = {
  Open: WarningIcon,
  InProgress: InfoIcon,
  Resolved: CheckIcon,
};
const STATUS_LABEL: Record<TicketStatus, string> = {
  Open: "Open",
  InProgress: "Đang xử lý",
  Resolved: "Resolved",
};

export default async function SupportPage(){const tickets:SupportTicket[]=[];
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink dark:text-white"> Hỗ trợ </h1>
        <p className="text-sm text-slate"> Cần trợ giúp? Liên hệ quản trị viên của hệ thống HSK. </p>
      </div>

      <CreateTicketForm />

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-ink"> Yêu cầu của bạn </h2>
        {tickets.length === 0 ? (
          <EmptyState icon={<CheckIcon size={28} />} title="Chưa có yêu cầu" body="Các yêu cầu đã ghi nhận sẽ xuất hiện tại đây." />
        ) : (
          tickets.map((t) => {
            const Icon = STATUS_ICON[t.status];
            return (
              <div key={t.ticketid} className="flex gap-3 rounded-lg border border-mist bg-surface p-4">
                <Icon size={20} className="mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-semibold text-ink">{t.subject}</p>
                    <span className="text-xs text-slate-soft">{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate">{t.message}</p>
                  <span className="mt-2 inline-block rounded-pill bg-mist px-2.5 py-0.5 text-xs font-medium text-slate">
                    {STATUS_LABEL[t.status]}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
