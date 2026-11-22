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
| `/games` | Sảnh Game PK: cấp HSK cố định theo hồ sơ, bắt đầu ghép trận và xem lịch sử thi đấu |
| `/games/match` | Ghép đối thủ và thi đấu PK đúng mức HSK hiện tại trong hồ sơ |
| `/games/pk` | Đường dẫn cũ chuyển về sảnh Game PK tại `/games` |
| `/leaderboard` | Xếp hạng chuỗi ngày học và tổng EXP |
| `/tutor` | Chuyển tới phần luyện tập |
| `/rewards` | EXP, cấp độ, chuỗi ngày học và EXP từ lịch sử PK |
| `/profile` | Hồ sơ, ảnh đại diện, mật khẩu, mục tiêu HSK và số phút học mỗi ngày |

Web này chỉ chứa giao diện học viên. Các đường dẫn admin/teacher cũ được chuyển sang ứng dụng quản trị riêng.

Đối chiếu API, cấu hình liên kết email và giới hạn hiện tại: [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md).

## Cách chấm bài luyện và đề thi

Khi mở bài luyện hoặc bắt đầu đề thi, popup cho chọn **Chấm khi nộp bài** hoặc **Chấm ngay từng câu**. Đề thi vẫn chọn được thời gian trong cùng popup.

Chế độ chấm ngay khóa đáp án đã kiểm tra; câu nhập chữ có nút kiểm tra riêng. Cuối lượt vẫn nộp một lần để lưu lịch sử và kết quả tổng hợp. Bài nói và luyện nét giữ cơ chế chấm riêng hiện có.

## Kiểm tra

Chạy trực tiếp bằng các lệnh có sẵn, không cần script kiểm chứng riêng:

```powershell
npm run lint
npm run typecheck
npm test -- --runInBand
npm run build
```

Để xem độ bao phủ kiểm thử, chạy `npm run test:coverage -- --runInBand` thay cho lệnh test thường. Kết quả hiển thị trong terminal; thư mục `coverage/` được Git bỏ qua.

Để đo hiệu năng, dừng phiên dev trước khi chạy `npm run build` rồi `npm start`, mở http://localhost:3002 và dùng Lighthouse/Performance trong DevTools. Báo cáo JSON và ảnh chụp có thể tạo lại tại máy kiểm tra; nếu xuất file thì để trong `docs/evidence/`, thư mục này không đưa vào Git.

`.env.local` cấu hình kết nối backend/media và không đưa vào Git. Các kiểu TypeScript của API vẫn nằm trong source để web biên dịch và kiểm tra kiểu; dự án không còn lệnh đồng bộ kiểu từ source backend.

### Thống kê lỗi sau luyện nói và viết

Trang kết quả và bản bài làm đã lưu dùng chung bảng thống kê: tối đa 5 từ có nhiều lượt sai nét nhất, 5 từ cần cải thiện phát âm nhất và 5 âm có nhiều lượt dưới 60/100 nhất. Các từ trùng nhau được gộp; bỏ sót và đọc thừa được thống kê riêng. Điểm trung bình chỉ lấy điểm có thật, không thay điểm thiếu bằng 0.

API chấm nói hiện có yêu cầu Azure ở mức `Phoneme` và giữ chi tiết âm trong kết quả/lịch sử JSON sẵn có; không thêm endpoint hoặc migration. Tiếng Trung dùng tên âm SAPI, không có nhóm âm tiết riêng của Azure. Cần deploy cả bản cập nhật backend để nhận chi tiết âm cho các lượt mới; lịch sử cũ vẫn xem được và chỉ thống kê theo từ nếu thiếu chi tiết âm. Bảng lỗi nét dùng các lượt sai đã ghi nhận trong bản bài làm, không tính chữ chưa mở hoặc gộp các lượt làm khác nhau.

Biểu đồ tròn thể hiện phân bố lượt lỗi theo từ/âm: 5 mục nhiều nhất và nhóm các mục còn lại; chú thích hiển thị số lượt và phần trăm. Biểu đồ không lấy số câu chưa làm hoặc điểm chưa chấm để tạo lát cắt. Bảng chi tiết vẫn đi kèm để đọc số liệu.
