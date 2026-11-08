# Tích hợp hệ thống TriceHSK

## Cấu hình local

```dotenv
HSK_API_URL=http://localhost:3001/api/v1
HSK_ADMIN_URL=http://localhost:3000
NEXT_PUBLIC_HSK_MEDIA_ORIGIN=http://localhost:3001
# Tùy chọn, mặc định suy ra từ HSK_API_URL:
HSK_SOCKET_URL=http://localhost:3001/game
```

Web học viên dùng cổng **3002**, admin riêng ở **3000**, backend ở **3001**. Frontend chỉ gọi API; PostgreSQL do backend quản lý. Không seed, migrate hoặc sao chép dữ liệu của admin vào frontend.
a
Backend gửi liên kết email theo `FRONTEND_DOMAIN`. Cấu hình `FRONTEND_DOMAIN=http://localhost:3002` trong môi trường backend rồi khởi động lại backend để các liên kết đặt lại mật khẩu/đổi email mở đúng web user. Giữ `APP_PORT=3001`.

## Nhận diện và dữ liệu

- Tên và favicon lấy từ `../Trice_HSK_Admin/fe_admin/dashboard/src/app/{layout.tsx,favicon.ico}`. Màu/font giữ bộ gốc của web theo yêu cầu: navy `#123C6B`, teal `#0EA599`, Plus Jakarta Sans cho tiêu đề và Inter cho nội dung.
- Giữ bố cục, viền, bóng, bảng màu, cỡ chữ và font gốc (Plus Jakarta Sans/Inter, có subset tiếng Việt). Giãn dòng nhẹ: tiêu đề lớn 1,12, tiêu đề khác khoảng 1,2–1,35, nội dung khoảng 1,6. Giá trị font-size của từng bậc Tailwind vẫn giữ nguyên. Các giá trị chung nằm trong `src/styles/tokens.css`, `tailwind.config.ts` và `src/app/globals.css`.
- Trang chủ dùng giao diện sáng để tránh trộn dark mode với các khối nền trắng; các trang học vẫn đổi theme được. Menu dùng dạng thu gọn dưới 1280px để nhãn tiếng Việt và icon không đè lên nhau.
- Riêng tiêu đề mở đầu chia 3 dòng cố định, desktop co giãn 56–80px để có chiều cao tương đương tiêu đề 3 dòng của mẫu gốc. Chiều cao từng dòng được giữ sẵn trong lúc chạy hiệu ứng gõ chữ, tránh đẩy khung minh họa lên/xuống. Kích thước khung minh họa và lưới hai cột được giữ nguyên.
- HSK 1–9 và màu badge theo `fe_admin/dashboard/src/constants/hsk.ts`.
- Chủ đề do `practice-sets/topics` trả về, khóa liên kết chính xác là **`topicKey`**. Lọc bài luyện/từ vựng bằng `topic=topicKey`.
- Từ vựng đọc `hanzi`, `pinyin`, `meaning`, `hskLevel`, `topic`. Nội dung `meaning` được hiển thị đúng dữ liệu admin; hiện có mục bằng tiếng Anh. Frontend không tự dịch hoặc thay dữ liệu gốc.
- Các trang lấy dữ liệu bằng `cache: no-store`, hỗ trợ bộ lọc và phân trang của backend. Nút tải lại lấy dữ liệu mới sau khi admin cập nhật. Trang chủ dùng số lượng và chủ đề thực tế; lỗi kết nối hiển thị trạng thái thiếu dữ liệu.

## Các API đang dùng

Đường dẫn dưới đây tương đối với `HSK_API_URL`, trừ chấm viết.

| Chức năng | API |
| --- | --- |
| Đăng ký/đăng nhập | `POST auth/email/register`, `POST auth/email/login` |
| Phiên, đăng xuất | `GET auth/me`, `POST auth/refresh`, `POST auth/logout` |
| Xác nhận email | `POST auth/email/confirm`, `POST auth/email/confirm/new`, `POST auth/email/resend` |
| Khôi phục mật khẩu | `POST auth/forgot/password`, `POST auth/reset/password` |
| Chủ đề/bài luyện | `GET practice-sets/topics`, `GET practice-sets`, `GET practice-sets/:id` |
| Từ vựng | `GET vocabulary`, `POST analytics/vocabulary-progress` |
| Đề thi | `GET exams`, `GET exams/:id` |
| Thống kê học tập | `GET analytics/dashboard`, `POST analytics/ping` |
| Bảng xếp hạng | `GET leaderboard/streak` với metric `streak`/`exp`, timeframe `all`/`month`/`week` |
| Trò chơi từ vựng | `GET game/offline/words`, `POST game/offline/submit`, `GET game/offline/top-scores` |
| Lịch sử PK | `GET game/pk/history` |
| Chấm viết | **`POST /api/ai/writing-assessment`** — không có `/v1` |
| Chấm phát âm | `POST ai/speaking/pronunciation-assessment` — multipart `audio`, `referenceText` |
| Hồ sơ/mật khẩu | `PATCH auth/me` |
| Ảnh đại diện | `POST files/upload`, sau đó `PATCH auth/me` |
| Mục tiêu HSK/phút mỗi ngày | `PATCH users/me/study-goals` |
| Xóa tài khoản | `DELETE auth/me` |
| Danh sách bài luyện theo kỹ năng | `/practice/listening`, `/practice/speaking`, `/practice/reading`, `/practice/writing` đọc `GET practice-sets` với `skill` tương ứng, cùng `GET practice-sets/topics` |
| Luyện viết một từ vựng | `/practice/writing/words` đọc `GET vocabulary`, `GET practice-sets/topics`; Hanzi Writer xử lý nét trên trình duyệt |

JWT nằm trong cookie HttpOnly. Proxy `/api/hsk` chỉ cho phép endpoint học viên, xử lý refresh, giới hạn dữ liệu và kiểm tra origin với yêu cầu ghi. Không có Supabase hoặc trang admin nhúng.

Đăng ký gửi `username`, `email`, `password` theo DTO; xác nhận mật khẩu chỉ kiểm tra tại form. Mật khẩu dài 6–72 ký tự. Tài khoản mới chờ admin duyệt; sau khi được duyệt có thể đăng nhập. Web không yêu cầu xác thực email, không hiển thị banner nhắc hoặc nút gửi lại email xác nhận. Backend tiếp tục quản lý trạng thái duyệt/khóa tài khoản.

Trang hồ sơ đọc `GET auth/me` và lưu theo đúng các DTO hiện có:

| Trường trên profile | Payload / API |
| --- | --- |
| Tên người dùng | `username` chỉ đọc từ `GET auth/me`; API học viên không cho cập nhật trường này |
| Email | Chỉ hiển thị từ `auth/me`, do quản trị viên quản lý |
| HSK hiện tại, mục tiêu | `currentHskLevel`, `targetHskLevel` là số nguyên 1–9 → `PATCH users/me/study-goals` |
| Phút học mỗi ngày | `dailyStudyTime` là số nguyên 1–1440 → cùng API mục tiêu |
| Ảnh đại diện | Multipart trường `file` → `POST files/upload`, sau đó `{photo: {id}}` → `PATCH auth/me` |
| Đổi mật khẩu | `{oldPassword, password}` → `PATCH auth/me`; mật khẩu mới 6–72 ký tự |
| Xóa tài khoản | `DELETE auth/me`, chỉ xóa cookie phiên khi backend trả thành công |

Hồ sơ đã bỏ cả ô Tên và Họ. Tên người dùng và email hiển thị ở trạng thái chỉ xem. Nút **Lưu mục tiêu** chỉ gửi `currentHskLevel`, `targetHskLevel`, `dailyStudyTime` thay đổi tới `PATCH users/me/study-goals`; dữ liệu tên cũ trong database được giữ nguyên. Lựa chọn HSK dùng giá trị `1`–`9`, khớp dữ liệu số nguyên đọc từ backend.

Web nối với backend gốc. Tên trên trang chủ khi đăng nhập, menu tài khoản và tiêu đề hồ sơ dùng `username` từ backend, thống nhất với admin. Giá trị `firstName`/`fullName` cũ không còn được dùng làm tên hiển thị tại những vị trí này. Các form đổi mật khẩu và ảnh đại diện vẫn dùng API riêng hiện có. App mobile riêng sẽ được cập nhật sau khi có mã nguồn.

## Validate ô nhập

Đối chiếu cách hiển thị `error`/`hint` của `fe_admin/dashboard/src/components/form/input/InputField.tsx`, các trường bắt buộc trong `components/auth/SignInForm.tsx` và kiểm tra định dạng/kích thước file trong `components/questions/QuestionCreateForm.tsx`. Áp dụng cho web học viên: dấu `*` với trường bắt buộc, viền đỏ và thông báo tiếng Việt dưới đúng ô; kiểm tra khi rời ô và trước khi gửi, cập nhật lỗi khi sửa. Các form dùng `noValidate` để thông báo trong trang thay cho popup tiếng Anh của trình duyệt.

Quy tắc lấy từ DTO backend, không sao chép quyền/trạng thái dành cho admin. Email được bỏ khoảng trắng ngoài và chuẩn hóa chữ thường; mật khẩu giữ nguyên. Mật khẩu đăng nhập chỉ cần không trống và tối đa 72 ký tự, không áp điều kiện 6 ký tự của mật khẩu mới cho đăng nhập. Mục tiêu để trống vẫn giữ giá trị đang có theo hợp đồng trước đó. Mật khẩu xác nhận phải khớp nhưng không gửi tới API.

Lỗi dạng `{errors: {email: ..., oldPassword: ..., dailyStudyTime: ...}}` từ backend được chuyển thành `ApiError.fieldErrors` và trả về đúng ô nhập, bao gồm lỗi email/tên người dùng trùng, mật khẩu hiện tại sai và lỗi validation NestJS. Lỗi kết nối hoặc dịch vụ vẫn có thông báo chung.

Ảnh đại diện kiểm tra phần mở rộng JPG/JPEG/PNG/WebP/GIF, loại ảnh và tối đa 3 MB ở cả client lẫn server action. Bản ghi kiểm tra phần mở rộng như admin và tối đa 10 MB trước khi đọc/chuyển WAV; vẫn giữ giới hạn phát âm 30 giây. Bài viết bắt buộc câu hỏi/nội dung, tối đa 10.000 ký tự; nội dung cần đọc tối đa 5.000 ký tự theo DTO. Bộ lọc tìm kiếm vẫn tùy chọn và giới hạn 500 ký tự. Form hỗ trợ cũ chỉ kiểm tra bỏ trống; backend chưa có API gửi ticket.

Đánh dấu từ vựng gửi `studied`, `remembered`, `unknown`; thống kê tổng lưu ở backend. Đánh dấu trên từng thẻ chỉ hiển thị trong phiên vì backend chưa có API đọc tiến độ từng từ.

Thời gian học ghi khi trang đang hiện, được tập trung và có tương tác gần đây. Tên module khớp backend: `vocabulary_review`, `practice_listening`, `practice_speaking`, `practice_reading`, `practice_writing`, `hsk_exam`, `game_battle`. Thời gian PK do backend quản lý, không ghi trùng từ web. EXP của bảng xếp hạng chỉ hỗ trợ khung thời gian `all`.

## PK và AI

### Luyện viết chữ Hán

Luồng **Luyện tập → Luyện viết → Danh sách bài luyện → Mở bài luyện** giữ cùng cách chọn bài như các kỹ năng khác. `/practice/writing` chỉ lấy các bộ bài `WRITING`, giữ bộ lọc HSK/chủ đề/tìm kiếm và phân trang; ô luyện nét xuất hiện bên trong câu hỏi sau khi mở bài.

Cả bốn kỹ năng dùng route `/practice/{listening|speaking|reading|writing}`; `page`, `limit`, `hskLevel`, `topic`, `search` nằm trong query. API vẫn nhận `skill` viết hoa từ route. Đổi kỹ năng hoặc áp dụng bộ lọc về trang 1; phân trang và đặt lại giữ route kỹ năng đang chọn. `/practice` hiển thị tất cả kỹ năng. Link cũ `/practice?...&skill=READING` tự chuyển sang `/practice/reading?...` và giữ các bộ lọc; nếu route đã có kỹ năng thì giá trị trong path được ưu tiên và query `skill` thừa được bỏ.

Nút **Luyện viết chữ này** trên từ vựng mở riêng `/practice/writing/words` cho từ đã chọn. Danh sách từ, pinyin, nghĩa và cấp độ lấy từ API từ vựng hiện có của admin. Học viên chọn từng chữ trong từ, xem mẫu thứ tự nét, nhận gợi ý, viết lại và bật/tắt chữ mẫu mờ. Trang này có liên kết quay về danh sách bài luyện viết.

Các câu `WRITING` có `payload.templateId = write-tracing` trong bộ bài biên soạn cũng dùng ô Hanzi Writer ngay tại `/practice/attempt/...`. Ví dụ `Luyện viết: 发烧` tách thành hai chữ để luyện lần lượt. Mapper giữ `templateId` từ payload công khai, bỏ audio của câu luyện nét và audio chung nếu cả bộ chỉ có luyện nét; renderer thay textarea bằng ô viết. Prompt biên soạn cũ có nhãn `Luyện viết:` được nhận diện khi thiếu template. Các dạng viết đoạn văn, trả lời ngắn khác và bài nghe/đọc vẫn theo loại câu riêng. Trường hợp chỉ có ảnh và không có chữ mẫu văn bản sẽ báo thiếu dữ liệu mẫu, không suy diễn từ đáp án ẩn.

Tải bản sao bài tự luyện xuất câu trả lời gõ trong `answers` và tiến độ nét trong `handwriting` (chữ mẫu, vị trí chữ đã hoàn thành, tổng số chữ). Tiến độ nét không được biến thành đáp án gõ hoặc điểm chấm.

Ô viết dùng hanzi-writer@3.6.1. Website tải dữ liệu nét theo từng chữ từ hanzi-writer-data@2.0.1 qua jsDelivr, tự chuyển sang unpkg nếu nguồn đầu lỗi; trình duyệt cache các request trong phiên. Các JSON nét không nằm trong repository, nhưng lần tải đầu cần có Internet. Nguồn dữ liệu Hanzi Writer Data / Make Me a Hanzi; giấy phép ARPHIC và giấy phép MIT của thư viện được giữ trong public/hanzi-data.

Ô viết dùng extension point `rendererOverride.createRenderTarget` của thư viện với Pointer Events, hỗ trợ chuột/cảm ứng/bút, giữ đúng tọa độ khi đổi kích thước và hủy toàn bộ listener khi rời chữ/trang. Hoàn thành chữ và số lần viết chưa khớp chỉ hiển thị trong phiên; đây là luyện nét, không phải điểm thi hay kết quả chấm AI. Thời gian tương tác dùng module `practice_writing` của API analytics đang có.

Backend có Socket.IO namespace `/game`. `/api/pk` mở kết nối từ server web với JWT trong HttpOnly và chuyển sự kiện sang trình duyệt bằng SSE; thao tác gửi qua POST có danh sách lệnh cho phép. Token không xuất hiện trong EventSource URL hoặc localStorage. Server backend quyết định lượt, hạn giờ, đáp án, điểm, kết quả và EXP. Web nhận các sự kiện `match_found`, `player_ready_update`, `game_started`, `turn_changed`, `answer_result`, `game_finished`, `match_cancelled`.

Chấm viết dùng Gemini trên backend (`GEMINI_API_KEY`). Chấm phát âm dùng Azure Speech (`AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`). Web hỗ trợ ghi âm/tải tệp và chuyển thành WAV PCM16 mono 16kHz tối đa 30 giây; backend kiểm tra định dạng và trả điểm/nhận xét. Nếu dịch vụ chưa cấu hình hoặc lỗi, web hiển thị lỗi thật và không tạo điểm thay thế.

## Giới hạn

- Backend hiện chưa có controller nộp bài thi/luyện tập, chấm trắc nghiệm hoặc đọc lịch sử bài thi của học viên. Màn hình làm bài là tự luyện, hỗ trợ hình, audio cho dạng nghe, pinyin, nghĩa, lựa chọn/nhập câu trả lời theo loại câu và ô luyện nét cho `write-tracing`; cho tải bản sao câu trả lời và tiến độ nét. Chấm viết/phát âm riêng nằm tại `/assessment`.
- Không có API cho thẻ tự tạo, nhắc học, ticket, thông báo hoặc lớp trực tuyến. Các trang cũ tương ứng báo rõ trạng thái; không xuất hiện trong menu học chính.
- Hội thoại AI chung chưa có API; `/tutor` chuyển tới chấm bài.
- Không tạo huy hiệu/thử thách hoặc lịch sử EXP giả. Trang tiến bộ dùng cấp độ, EXP và lịch sử PK thực tế.

## Kiểm tra

Xem [TESTING.md](TESTING.md). Cần tài khoản học viên đã được admin duyệt để kiểm tra thao tác ghi thực tế, email và trận PK hai người; AI cần cấu hình nhà cung cấp trên backend. Các kiểm tra tự động không tạo tài khoản, ghi điểm hoặc thay đổi database thật.
