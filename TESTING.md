# Kiểm tra web TriceHSK

```powershell
npm run typecheck
npm test -- --runInBand
npm run build
```

`typecheck` dùng cấu hình riêng để không đọc type route cũ còn sót trong `.next` của dev server. Build Next.js kiểm tra các route hiện tại.

Các bộ test kiểm tra:

- REST/JWT: cookie HttpOnly, refresh, đăng xuất, allowlist endpoint và origin.
- Đăng ký theo DTO; hồ sơ, HSK 1–9 và số phút học mỗi ngày.
- Validate ô nhập: thông báo bắt buộc tiếng Việt, lỗi đầu tiên dưới đúng ô, `aria-invalid`/`aria-describedby`, vị trí icon mật khẩu trong wrapper của input, email được chuẩn hóa và mật khẩu giữ nguyên khoảng trắng.
- Ánh xạ lỗi NestJS dạng object lồng/mảng, tài khoản trùng và mật khẩu hiện tại sai về từng trường; phản hồi thiếu dữ liệu và lỗi kết nối có thông báo dự phòng.
- Từ chối dữ liệu hồ sơ/mật khẩu và định dạng ảnh sai trước khi gọi API; kiểm tra giới hạn ảnh 3 MB, âm thanh 10 MB, bài viết 10.000 ký tự và nội dung phát âm 5.000 ký tự.
- Hồ sơ: bỏ cả ô Tên và Họ, giữ tên người dùng/email chỉ xem; HSK mặc định chọn đúng số nguyên, chỉ gửi mục tiêu học tới endpoint tương ứng, mục tiêu 1–1440 phút, đổi mật khẩu 6–72 ký tự và multipart ảnh/ID ảnh.
- Tên tài khoản: hồ sơ, trang chủ khi đăng nhập và menu tài khoản dùng `username`; lưu mục tiêu không gửi hoặc ghi đè các trường tên cũ.
- Khóa `topicKey`, câu hỏi có lựa chọn bằng ảnh, đúng/sai, pinyin, phần thi có audio, không đưa đáp án xuống màn hình làm bài.
- Bộ lọc, phân trang, lỗi một phần của danh mục và lựa chọn trò chơi.
- Chấm viết không có `/v1`; chấm phát âm multipart và giới hạn tệp.
- Chuyển WAV PCM16 mono 16kHz, giới hạn độ dài, resampling.
- Luyện nét: dữ liệu cục bộ và URL đúng từ/HSK, tải lại khi lỗi; engine Hanzi Writer thật chấp nhận ba nét chữ 上 theo thứ tự, từ chối nét sai, xử lý đúng tọa độ khi thu nhỏ ô và hủy input listener. Test DOM kiểm tra xem mẫu/gợi ý/viết lại, chuyển chữ lặp trong 妈妈 và retry khi tải lỗi.
- Bài viết biên soạn: giữ marker `write-tracing`, tách đúng chữ từ `Luyện viết: 发烧`, render Hanzi Writer ngay trong câu hỏi và bỏ audio/textarea của dạng luyện nét; các dạng bài khác vẫn giữ control tương ứng. File tải về có tiến độ chữ riêng, không tự tạo câu trả lời gõ hoặc điểm.
- Điều hướng luyện viết: bấm kỹ năng mở danh sách `WRITING` và liên kết mở từng bài, không lấy danh sách từ hoặc tự mở ô viết. Nút luyện viết trên thẻ từ đi riêng `/practice/writing/words`.
- Route luyện tập: cả bốn kỹ năng dùng `/practice/{skill}`; link `?skill=...` cũ chuyển hướng giữ bộ lọc. Chọn kỹ năng qua thẻ hoặc form, phân trang và đặt lại không làm lệch kỹ năng; query không lặp `skill`, áp dụng bộ lọc trở về trang 1.
- PK: kiểm tra lệnh, session độc lập, token chỉ nằm ở server, sự kiện, đóng kết nối và lỗi xác thực/backend.

Kiểm tra HTTP local ở `http://localhost:3002`: trang chủ, đăng ký, đăng nhập, favicon, route bảo vệ và các API đọc danh mục. Không dùng kiểm tra tự động để tạo tài khoản, gửi bài AI hoặc ghi điểm vào database thật.

Để kiểm tra bằng tài khoản thật đã được duyệt:

1. Sửa một chủ đề/từ/bài luyện/đề thi trong admin, tải lại web và đối chiếu dữ liệu, tìm kiếm, bộ lọc, ảnh/audio.
2. Lật thẻ, ghi đã học/đã nhớ/chưa nhớ; mở dashboard đối chiếu thống kê và thời gian hoạt động.
3. Lưu mục tiêu, hồ sơ và avatar; kiểm tra đăng nhập và đặt lại mật khẩu. Tài khoản chờ duyệt phải nhận thông báo chờ admin; tài khoản đã duyệt dùng được dù chưa xác thực email và không có banner nhắc xác thực.
   Hồ sơ không còn ô **Tên**/**Họ**; ô **Tên người dùng** và **Email** chỉ xem. Đổi HSK/phút học, bấm **Lưu mục tiêu** rồi tải lại để đối chiếu. Tên trên menu tài khoản và tiêu đề hồ sơ phải khớp `username` trong admin.
4. Chơi từ vựng, lưu điểm một lần, đối chiếu top điểm; dùng hai tài khoản PK để kiểm tra sẵn sàng, lượt, mất kết nối, kết quả, EXP và lịch sử.
5. Kiểm tra chấm viết/phát âm với Gemini/Azure đã cấu hình; thử từ chối micro, bản ghi quá dài và lỗi nhà cung cấp.
6. Chọn lần lượt bốn kỹ năng qua thẻ và form: URL dùng `/practice/listening`, `/practice/speaking`, `/practice/reading`, `/practice/writing`. Thử bộ lọc, trang sau, đặt lại và link cũ `/practice?page=1&limit=24&skill=READING`; route và danh sách phải đúng kỹ năng. Bấm **Luyện viết** phải thấy danh sách bài; bấm **Mở bài luyện** mới vào câu hỏi. Nút **Luyện viết chữ này** trên từ vựng mở riêng ô luyện từ. Thử chuột, bút và cảm ứng; viết đúng/sai thứ tự, xem mẫu, gợi ý, viết lại, chuyển chữ và đổi kích thước màn hình. Từ/pinyin/nghĩa phải khớp admin. Chữ chưa có dữ liệu phải báo rõ thay vì hiển thị ô trống.
7. Mở bộ **HSK 3 · Ôn từ vựng 26 · Viết (biên soạn)** (`set-250` trong dữ liệu local đã đối chiếu): câu `Luyện viết: 发烧` phải có ô viết hai chữ, pinyin và mẫu nét; không hiện thanh audio hoặc textarea. Hoàn thành chữ, tải bản sao để kiểm tra trường `handwriting`. Với đề hỗn hợp, câu nghe vẫn phát audio và câu viết đoạn văn vẫn có ô trả lời riêng.

Email, ghi dữ liệu bằng tài khoản thật, chấm AI có nhà cung cấp và trận PK hai người chưa được xác nhận bằng các unit test.

Kiểm tra tương tác form khi có trình duyệt: rời một ô trống, nhập email sai, xác nhận mật khẩu không khớp rồi sửa lại; thử dữ liệu trùng và mật khẩu hiện tại sai bằng tài khoản thử nghiệm. Lỗi phải xuất hiện/cập nhật dưới đúng ô, trường hợp không hợp lệ không được gửi yêu cầu ghi. Test hiện tại kiểm tra schema, HTML render và API/server action với mock; không thay thế kiểm tra tương tác trình duyệt.
