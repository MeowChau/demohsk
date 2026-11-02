# Kết nối backend HSK, giữ giao diện gốc

Phần hiển thị của bản clone được giữ: CSS, token màu, font, theme, các component landing và khung trang. Lớp lấy dữ liệu/xác thực được đổi từ Supabase sang REST/JWT của `../Trice_HSK_Admin/backend`. Không xóa các thư mục hoặc component gốc, không thay lại bộ giao diện.

## Chạy local

Frontend tại folder này:

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Mở **http://localhost:3000**.

Backend dùng cấu hình database/JWT hiện có:

```powershell
cd ../Trice_HSK_Admin/backend
npm run start:dev
```

Backend mặc định ở **http://localhost:3001/api/v1**. Không cần chạy AI backend Python hoặc tạo Supabase project cho frontend user.

Nếu admin cũng dùng cổng 3000, chạy admin riêng ở 3002:

```powershell
cd ../Trice_HSK_Admin/fe_admin/dashboard
npm run dev -- --port 3002
```

| Biến môi trường frontend | Mặc định |
| --- | --- |
| `HSK_API_URL` | `http://localhost:3001/api/v1` |
| `HSK_ADMIN_URL` | `http://localhost:3002` |
| `NEXT_PUBLIC_HSK_MEDIA_ORIGIN` | `http://localhost:3001` |

Thay các giá trị nếu backend/admin đang triển khai ở địa chỉ khác. Token JWT nằm trong cookie HttpOnly; không đưa token vào URL hoặc localStorage. Cấu hình Supabase không còn cần cho các luồng user đã nối. Mã repository/admin/teacher của bản IELTS vẫn giữ làm tham chiếu, nhưng route admin/teacher được chuyển tới ứng dụng admin HSK riêng.

## Luồng đã nối

| Giao diện gốc | API HSK |
| --- | --- |
| Đăng nhập | `POST auth/email/login`, `GET auth/me`, refresh JWT |
| Đăng ký | `POST auth/email/register` với email làm username; tài khoản chờ xác nhận/duyệt theo backend |
| Quên/đặt lại mật khẩu | `POST auth/forgot/password`, `POST auth/reset/password` |
| Xác nhận email | `POST auth/email/confirm`, `POST auth/email/confirm/new` |
| Đăng xuất | `POST auth/logout` |
| Dashboard/rewards | `auth/me`, `analytics/dashboard`, `leaderboard/streak` |
| Lessons | `practice-sets/topics`, `practice-sets` |
| Word bank | `vocabulary`, `analytics/vocabulary-progress` |
| Practice | `practice-sets?skill=...`, `practice-sets/:id` |
| Hồ sơ/tên/ảnh/mật khẩu | `PATCH auth/me`, `POST files/upload` |
| Mục tiêu HSK | `PATCH users/me/study-goals` |

Danh sách từ và bài luyện đọc đủ các trang của API, tối đa 100 trang mỗi yêu cầu tải. Cấp độ HSK được hiển thị theo số nguyên 1–9; không quy đổi sang band IELTS. Một số tên field nội bộ của component cũ được giữ để tránh thay giao diện, nhưng dữ liệu hiển thị trên chart đã được ghi rõ là mục tiêu HSK.

Đăng ký giữ nguyên form gốc; backend chỉ nhận email/username/mật khẩu. Tên và họ được giữ tạm trên trình duyệt và cập nhật sau lần đăng nhập đầu tiên trên cùng trình duyệt, nếu tài khoản chưa có tên. Ngày sinh chỉ được dùng kiểm tra form, chưa có trường lưu tương ứng trên backend.

## Những phần backend chưa có API tương ứng

- Thẻ tự tạo, cấu hình email/streak reminder, hỗ trợ ticket, thông báo và lớp live: giữ khung hoặc trạng thái rỗng; thao tác lưu chưa hỗ trợ sẽ báo rõ.
- Số điện thoại/ngày sinh/giới tính/địa chỉ trong hồ sơ: trường gốc được giữ nhưng tắt chỉnh sửa vì API hồ sơ chưa hỗ trợ lưu.
- Bài luyện dùng nội dung/ảnh/audio từ backend. Chưa có API lịch sử bài thi/submission: nút hoàn thành hiện tải câu trả lời về máy, không báo điểm hoặc giả lập đã lưu vào tài khoản.
- Danh sách từ đã thực hành ở phần vocabulary là danh sách trong phiên hiện tại; thao tác đánh dấu ghi sự kiện `studied` vào backend, không giả lập API bookmark/flashcard chưa có.
- Không tạo số liệu achievement/XP history/daily challenge khi backend chưa trả dữ liệu tương ứng. EXP/cấp độ có thật được lấy từ hồ sơ người dùng.
- Hội thoại AI chung chưa có trên backend HSK. Màn AI gốc hiện trạng thái offline; không gọi AI backend IELTS cũ.

Backend cần `FRONTEND_DOMAIN=http://localhost:3000` để link email mở đúng frontend user. Khi triển khai HTTPS, đổi URL môi trường trước khi build và dùng cấu hình cookie production.

## Kiểm tra

```powershell
npx tsc --noEmit --incremental false
npm test -- --runInBand
npm run build
```

Không chạy seed hoặc migration lên database hiện có trong quá trình nối frontend.
