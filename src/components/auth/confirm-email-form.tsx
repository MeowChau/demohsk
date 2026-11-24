"use client";

import { NavigationLink as Link } from "@/components/shell/navigation-protection";
import { useState } from "react";
import { apiAction } from "@/lib/api/client";
export function ConfirmEmailForm({
  hash,
  newEmail = false,
}: {
  hash?: string;
  newEmail?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <>
      <h1 className="mb-6 text-center font-display text-2xl font-semibold text-ink dark:text-white">
         Xác nhận email </h1>
      <p className="mb-6 text-center text-sm text-slate">
        {newEmail
          ? "Xác nhận địa chỉ email mới cho tài khoản của bạn."
          : "Quyền đăng nhập và sử dụng tài khoản do quản trị viên phê duyệt."}
      </p>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!hash) {
            setMessage("Liên kết thiếu mã xác nhận.");
            return;
          }
          setPending(true);
          try {
            await apiAction(
              newEmail ? "auth/email/confirm/new" : "auth/email/confirm",
              { hash },
            );
            setMessage(
              "Email đã xác nhận. Bạn có thể đăng nhập sau khi tài khoản được duyệt.",
            );
          } catch (error) {
            setMessage(
              error instanceof Error
                ? error.message
                : "Không xác nhận được email.",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        <button
          disabled={pending || !hash}
          className="mt-2 rounded-pill bg-navy px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Confirming…" : "Xác nhận email"}
        </button>
        {message && (
          <p className="text-sm text-slate" role="status">
            {message}
          </p>
        )}
        <Link
          href="/login"
          className="mt-4 text-center text-sm font-medium text-teal"
        >
           Quay lại đăng nhập </Link>
      </form>
    </>
  );
}
