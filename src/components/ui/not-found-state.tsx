
import { NavigationLink as Link } from "@/components/shell/navigation-protection";
import { TargetIcon } from "@/components/icons/stat-icons";

export function NotFoundState({ backHref = "/dashboard" }: { backHref?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <TargetIcon size={40} />
      <p className="font-display text-lg font-semibold text-ink"> Không tìm thấy trang </p>
      <p className="max-w-sm text-sm text-slate-soft"> Đường dẫn này không tồn tại hoặc đã được thay đổi. </p>
      <Link
        href={backHref}
        className="mt-2 rounded-pill bg-teal px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
         Về trang chủ </Link>
    </div>
  );
}
