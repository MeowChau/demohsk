import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
export default function ResultsPage(){return <div className="flex flex-col gap-6"><h1 className="font-display text-2xl font-semibold text-ink dark:text-white"> Kết quả </h1><EmptyState icon={null} title="Chưa có lịch sử bài thi" body="Bài tự luyện hiện hỗ trợ tải câu trả lời về máy. Kết quả thi chưa được lưu trên tài khoản HSK."/><Link href="/practice" className="text-sm font-semibold text-teal"> Quay lại luyện tập → </Link></div>;}
