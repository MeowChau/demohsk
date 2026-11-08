# Kiến trúc frontend TriceHSK

Next.js App Router + React + TypeScript + Tailwind CSS. Web chỉ phục vụ học viên, dùng backend NestJS/PostgreSQL và admin riêng.

- `src/lib/api/types.ts`: kiểu dữ liệu API HSK.
- `src/lib/api/client.ts`: gọi API từ component client, chuyển lỗi sang tiếng Việt.
- `src/lib/api/server.ts`: gọi backend từ server component/server action.
- `src/lib/api/session.ts`: cookie HttpOnly và refresh JWT.
- `src/app/api/hsk/[...path]/route.ts`: proxy có danh sách endpoint học viên được phép gọi.
- `src/lib/api/learning.ts`: chuyển dữ liệu HSK sang props cho các component giao diện.
- `src/lib/api/catalog.ts`, `src/lib/catalog-query.ts`: đọc danh mục, kiểm tra bộ lọc và tạo liên kết phân trang.
- `src/lib/api/pk-bridge.ts`, `src/app/api/pk/route.ts`: Socket.IO phía server và cầu nối SSE/POST cho PK.
- `src/components/learning`: thẻ từ vựng, danh mục bài luyện, trò chơi, PK và chấm bài.
- `src/components/shell/study-tracker.tsx`: ghi thời gian hoạt động theo module backend.
- `src/styles/tokens.css`, `src/components/ui/catalog.tsx`: màu navy/teal, font gốc của web, token sáng/tối và control dùng chung; giữ nhãn HSK theo admin.
- `src/lib/audio-wav.ts`: chuyển âm thanh sang WAV theo yêu cầu Azure của backend.
- `src/types`: kiểu dữ liệu hiển thị, tách khỏi lớp lưu trữ.
- `src/lib/navigation.ts`: điều hướng user, icon và kiểm tra route đang chọn.
- `src/lib/hsk.ts`: nhãn kỹ năng tiếng Việt và cấp độ HSK.
- `src/middleware.ts`: bảo vệ trang học và chuyển đường dẫn quản trị cũ sang admin riêng.

Nguồn nội dung, API và các chức năng chưa được backend hỗ trợ được ghi trong `BACKEND_INTEGRATION.md`.
