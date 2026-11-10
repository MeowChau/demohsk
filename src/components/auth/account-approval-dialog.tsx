"use client";

import { Clock3 } from "lucide-react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export function AccountApprovalDialog({ open, onClose, registeredEmail, message }: {
  open: boolean;
  onClose: () => void;
  registeredEmail?: string;
  message?: string;
}) {
  return (
    <ConfirmationDialog
      open={open}
      title={registeredEmail ? "Đăng ký thành công" : "Tài khoản đang chờ duyệt"}
      confirmLabel="Đã hiểu"
      cancelLabel={null}
      onCancel={onClose}
      onConfirm={onClose}
      icon={<Clock3 className="mt-0.5 shrink-0 text-brand dark:text-ink" size={20} aria-hidden="true" />}
    >
      {registeredEmail && <p className="mb-2">Tài khoản <strong className="break-all text-ink">{registeredEmail}</strong> đã được đăng ký.</p>}
      <p>{message || "Tài khoản của bạn đang chờ quản trị viên duyệt. Vui lòng chờ được duyệt trước khi đăng nhập vào học."}</p>
    </ConfirmationDialog>
  );
}
