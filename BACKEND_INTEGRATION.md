# Tích hợp hệ thống TriceHSK

## Cấu hình local

```dotenv
HSK_API_URL=http://localhost:3001/api/v1
HSK_ADMIN_URL=http://localhost:3000
NEXT_PUBLIC_HSK_MEDIA_ORIGIN=http://localhost:3001
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

Các câu `WRITING` có `payload.templateId = write-tracing` trong bộ bài biên soạn cũng dùng ô Hanzi Writer ngay tại `/practice/sets/[id]/attempt`. Ví dụ `Luyện viết: 发烧` tách thành hai chữ để luyện lần lượt. Mapper giữ `templateId` từ payload công khai, bỏ audio của câu luyện nét và audio chung nếu cả bộ chỉ có luyện nét; renderer thay textarea bằng ô viết. Prompt biên soạn cũ có nhãn `Luyện viết:` được nhận diện khi thiếu template. Các dạng viết đoạn văn, trả lời ngắn khác và bài nghe/đọc vẫn theo loại câu riêng. Trường hợp chỉ có ảnh và không có chữ mẫu văn bản sẽ báo thiếu dữ liệu mẫu, không suy diễn từ đáp án ẩn.

Tải bản sao bài tự luyện xuất câu trả lời gõ trong `answers` và tiến độ nét trong `handwriting` (chữ mẫu, vị trí chữ đã hoàn thành, tổng số chữ). Khi nộp bài luyện nét, web hiển thị số nét viết đúng, lượt nét chưa khớp và số chữ hoàn thành từ Hanzi Writer; không quy đổi tiến độ thành điểm bài viết. Phần nói trong bài luyện dùng micro thay ô nhập, chuyển bản ghi sang WAV mono PCM16 / 16 kHz và gọi API phát âm Azure hiện có. Kết quả có nội dung nhận diện, điểm và nhận xét; bản ghi được giữ trong phiên để nghe lại hoặc thử chấm lại khi lỗi.

Ô viết dùng hanzi-writer@3.6.1. Website tải dữ liệu nét theo từng chữ từ hanzi-writer-data@2.0.1 qua jsDelivr, tự chuyển sang unpkg nếu nguồn đầu lỗi; trình duyệt cache các request trong phiên. Các JSON nét không nằm trong repository, nhưng lần tải đầu cần có Internet. Nguồn dữ liệu Hanzi Writer Data / Make Me a Hanzi; giấy phép ARPHIC và giấy phép MIT của thư viện được giữ trong public/hanzi-data.

Ô viết dùng extension point `rendererOverride.createRenderTarget` của thư viện với Pointer Events, hỗ trợ chuột/cảm ứng/bút, giữ đúng tọa độ khi đổi kích thước và hủy toàn bộ listener khi rời chữ/trang. Hoàn thành chữ và số lần viết chưa khớp chỉ hiển thị trong phiên; đây là luyện nét, không phải điểm thi hay kết quả chấm AI. Thời gian tương tác dùng module `practice_writing` của API analytics đang có.

Mục Game PK tại `/games` mở trực tiếp sảnh thi đấu 1 vs 1, dùng cấp HSK của hồ sơ làm mặc định, có nút bắt đầu tìm người, xác nhận sẵn sàng, câu hỏi theo lượt, kết quả, EXP và lịch sử trận. Web và app ghép trận qua cùng backend; trang này không tải từ vựng hoặc điểm game offline. Cấp HSK bị khóa trong khi đang tìm hoặc thi đấu. Lịch sử bị lỗi vẫn cho phép mở sảnh và tìm trận. Các link xem lịch sử dùng `/games`; `/games/pk` cũ chuyển về đây và giữ cấp HSK/trang lịch sử.

Backend có Socket.IO namespace `/game`. `/api/pk` mở kết nối từ server web với JWT trong HttpOnly và chuyển sự kiện sang trình duyệt bằng SSE; thao tác gửi qua POST có danh sách lệnh cho phép. Token không xuất hiện trong EventSource URL hoặc localStorage. Server backend quyết định lượt, hạn giờ, đáp án, điểm, kết quả và EXP. Web nhận các sự kiện `match_found`, `player_ready_update`, `game_started`, `turn_changed`, `answer_result`, `game_finished`, `match_cancelled`.

Chấm viết dùng Gemini trên backend (`GEMINI_API_KEY`). Chấm phát âm dùng Azure Speech (`AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`). Web hỗ trợ ghi âm/tải tệp và chuyển thành WAV PCM16 mono 16kHz tối đa 30 giây; backend kiểm tra định dạng và trả điểm/nhận xét. Nếu dịch vụ chưa cấu hình hoặc lỗi, web hiển thị lỗi thật và không tạo điểm thay thế.

## Đường dẫn học và làm bài

| Luồng | Đường dẫn |
| --- | --- |
| Danh sách đề thi | /exams |
| Chi tiết đề thi | /exams/[id] |
| Làm đề thi | /exams/[id]/attempt |
| Danh sách bài luyện theo kỹ năng | /practice/listening, /practice/speaking, /practice/reading, /practice/writing |
| Làm bộ bài luyện | /practice/sets/[id]/attempt |
| Luyện viết từng từ | /practice/writing/words |

Các link mở bài ở danh sách đề, danh sách luyện tập, nội dung bài học và server action đều dùng bộ tạo đường dẫn trong src/lib/attempt-routes.ts. Form làm bài được dùng chung ở src/components/learning/attempt-form.tsx; dữ liệu vẫn đọc từ API exams và practice-sets đang có.

Đường dẫn cũ /practice/attempt/exam-2?testid=exam-2 chuyển hướng 308 sang /exams/2/attempt; bộ bài set-39 chuyển sang /practice/sets/39/attempt. Mã hợp lệ trong path được ưu tiên khi query cũ có mã khác; testid được loại khỏi query. Middleware chuẩn hóa URL trước bước đăng nhập để redirectTo cũng giữ đường dẫn mới. Tải trang làm bài chỉ lấy mã từ path. Menu Đề thi và Luyện tập nhận trạng thái theo namespace tương ứng.

## Xác nhận thoát và nộp bài

Màn làm đề và bài luyện dùng chung hai popup: rời bài có tiến độ chưa nộp và xác nhận nộp bài. Cảnh báo thoát áp dụng cho link trong web, logo/menu và Back/Forward trong cùng phiên điều hướng. Hủy giữ lại URL, câu trả lời, bản ghi và nét viết; xác nhận mới điều hướng. Đóng tab hoặc tải lại dùng cảnh báo native của trình duyệt khi có tiến độ. Sau khi nộp, cảnh báo tiến độ được gỡ. Đăng xuất dùng popup hiện có với lời nhắc mất tiến độ, không mở thêm popup thứ hai.

Popup nộp bài hiển thị số câu hoàn thành và số câu còn thiếu. Viết theo mẫu phải hoàn thành toàn bộ chữ; nói phải có kết quả chấm. Khi còn ghi âm/chấm nói, nút nộp bị khóa như trước. Hết giờ ở bài có giới hạn thời gian vẫn tự nộp. Các thao tác làm lại, ghi âm lại và viết lại giữ nguyên.

NavigationProtectionProvider chỉ gắn cảnh báo beforeunload khi có dữ liệu cần giữ; bộ theo dõi history bảo toàn state của Next, không chèn bản sao trang để chặn Back. Popup dùng native dialog, giữ focus trong hộp thoại, Escape/X để hủy và màu từ token hiện có cho cả light/dark.

## Giới hạn

- Màn hình luyện tập và đề thi đọc đáp án đã có trong dữ liệu bài học để tự chấm trên website khi nộp bài; câu cần rubric hoặc thiếu đáp án được đánh dấu chưa tự chấm. Website không tạo API nộp bài và hiện chưa lưu điểm luyện tập thành lịch sử trên tài khoản. Phát âm được chấm ngay trong bài luyện nói; luyện viết theo mẫu nhận phản hồi từ phần nhận diện nét. Kết quả và phản hồi hiển thị ngay trong bài luyện.
- Không có API cho thẻ tự tạo, nhắc học, ticket, thông báo hoặc lớp trực tuyến. Các trang cũ tương ứng báo rõ trạng thái; không xuất hiện trong menu học chính.
- Hội thoại AI chung chưa có API; `/tutor` chuyển tới luyện tập.
- Không tạo huy hiệu/thử thách hoặc lịch sử EXP giả. Trang tiến bộ dùng cấp độ, EXP và lịch sử PK thực tế.

## Kiểm tra

Xem [TESTING.md](TESTING.md). Cần tài khoản học viên đã được admin duyệt để kiểm tra thao tác ghi thực tế, email và trận PK hai người; AI cần cấu hình nhà cung cấp trên backend. Các kiểm tra tự động không tạo tài khoản, ghi điểm hoặc thay đổi database thật.


## Game PK khi deploy trên Vercel

PK dùng trực tiếp origin của `HSK_API_URL`, giữ namespace `/game`. Ví dụ `HSK_API_URL=https://api.tricehsk.id.vn/api/v1` sẽ kết nối Socket.IO tới `https://api.tricehsk.id.vn/game`. Cấu hình local tương ứng là `http://localhost:3001/api/v1` và `http://localhost:3001/game`. Dùng các biến môi trường API, admin và media hiện có; không có biến riêng cho PK.

Mỗi SSE request sở hữu một socket để nhận sự kiện; mỗi POST mở socket riêng, đợi `pk_connected`, gửi lệnh và đóng sau khi có xác nhận. Backend đã hỗ trợ nhiều socket cho cùng tài khoản và phát sự kiện qua phòng tài khoản, nên GET/POST có thể chạy trên các Function khác nhau. Không chia sẻ socket giữa request bằng Map/global. JWT vẫn được giữ ở phía server; không thêm endpoint backend.

Route PK đặt `maxDuration = 300`. SSE vẫn chịu giới hạn thời gian của Vercel; khi luồng đóng sau thời gian dài hoặc do mạng, màn PK hiện nút Kết nối lại. Hai người cần dùng hai tài khoản khác nhau, chọn cùng HSK và cùng bấm tìm trận. Khi kết nối lại, mã phòng đã lưu được chuyển qua socket của lệnh để khôi phục trận.

Sau khi sửa source, cần commit/push bản sửa và deploy từ commit mới. Giữ `HSK_API_URL` production đang dùng; không cần thêm biến môi trường trên Vercel.


### Thư viện WebSocket khi build website

`next.config.mjs` giữ `socket.io-client`, `engine.io-client` và `ws` trong `serverExternalPackages`. Các thư viện này được Node.js nạp trực tiếp ở server, tránh làm hỏng phần nạp native addon `bufferutil` khi đóng gói bằng Webpack.

Lỗi đã tái hiện với API VPS: xác thực HTTP thành công, WebSocket mở được nhưng gói xác thực Socket.IO dài 331 byte không gửi được vì `TypeError: bufferUtil.mask is not a function`. Gói ping/pong ngắn vẫn đi được; VPS chờ namespace rồi đóng sau khoảng 45 giây. Sau khi dùng external packages, cùng tài khoản và cùng VPS đã nhận `pk_connected` trong khoảng 700 ms.

Không cần thêm biến môi trường, tắt TLS hay đổi backend để sửa lỗi đóng gói này. Sau khi áp dụng cấu hình, deploy website từ commit mới.
