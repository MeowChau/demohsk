# TriceHSK — Web học tiếng Trung

Frontend dành cho học viên, giao diện tiếng Việt và nội dung học tiếng Trung/HSK. Giữ bố cục, màu, cỡ chữ và font của dự án gốc: Plus Jakarta Sans cho tiêu đề, Inter cho nội dung. Chỉ tăng giãn dòng để dấu tiếng Việt không chạm dòng trên. Trang chủ dùng giao diện sáng để tránh trộn màu dark mode với các khối nền trắng. Favicon lấy từ `../Trice_HSK_Admin/fe_admin/dashboard/src/app/favicon.ico`.

## Chạy dự án

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Chỉ sao chép `.env.example` khi chưa có cấu hình riêng trong `.env.local`.

- Web học viên: http://localhost:3002
- Admin riêng: http://localhost:3000
- Backend NestJS: http://localhost:3001/api/v1

Production: `npm run build` rồi `npm start`, vẫn dùng cổng 3002.

Frontend gọi REST API/JWT qua `/api/hsk`; PostgreSQL được backend quản lý. Không cần kết nối database trực tiếp từ web user.

## Các trang chính

| Đường dẫn | Nội dung |
| --- | --- |
| `/` | Giới thiệu TriceHSK, chủ đề và số lượng nội dung thực tế từ backend |
| `/register` | Đăng ký học viên bằng tên người dùng, email và mật khẩu; chờ admin duyệt |
| `/signup` | Chuyển tới `/register` |
| `/login` | Đăng nhập |
| `/forgot-password`, `/reset-password` | Khôi phục mật khẩu |
| `/confirm-email`, `/confirm-new-email` | Tương thích liên kết email của backend; không phải điều kiện kích hoạt tài khoản học viên |
| `/dashboard` | Tổng quan tài khoản, thời gian học, thống kê từ vựng và mục tiêu HSK |
| `/learning` | Các chủ đề bài học, tên Việt, tên Trung và pinyin |
| `/vocabulary` | Lật thẻ/danh sách, chữ Hán, pinyin, nghĩa từ; ghi nhận đã học/đã nhớ/chưa nhớ |
| `/practice` | Luyện nghe, nói, đọc, viết; lọc theo cấp độ, chủ đề, tìm kiếm và phân trang |
| `/exams` | Đề thi và các phần thi từ admin, mở bài tự luyện |
| `/games` | Game PK 1 vs 1: tìm người cùng HSK, sẵn sàng, đấu theo lượt, kết quả và lịch sử thi đấu |
| `/games/pk` | Đường dẫn cũ chuyển về sảnh Game PK tại `/games` |
| `/leaderboard` | Xếp hạng chuỗi ngày học và tổng EXP |
| `/tutor` | Chuyển tới phần luyện tập |
| `/rewards` | EXP, cấp độ, chuỗi ngày học và EXP từ lịch sử PK |
| `/profile` | Hồ sơ, ảnh đại diện, mật khẩu, mục tiêu HSK và số phút học mỗi ngày |

Web này chỉ chứa giao diện học viên. Các đường dẫn admin/teacher cũ được chuyển sang ứng dụng quản trị riêng.

Đối chiếu API, cấu hình liên kết email và giới hạn hiện tại: [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md).

## Kiểm tra

```powershell
npm test -- --runInBand
npm run typecheck
npm run build
```
