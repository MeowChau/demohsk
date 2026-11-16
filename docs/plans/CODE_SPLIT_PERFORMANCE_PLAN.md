# Kế hoạch tách code theo chức năng và tối ưu hiệu năng TrikeHSK-Web

Ngày rà soát: 13/11/2026. Source: `E:\ltwnc\Web_HSK\TrikeHSK-Web`.

**Trạng thái: đề xuất, chưa thực hiện refactor.** Lần này chỉ lập kế hoạch từ source hiện có. Không thay đổi giao diện, nghiệp vụ, API, DB, backend, admin hoặc app Android. Bản plan cũ không còn trong cây làm việc lúc rà soát; tài liệu này ghi riêng phần tổ chức code và hiệu năng, không khôi phục những tài liệu đã bị bỏ.

## 1. Kết luận chính và cách hiểu đoạn log

Nên tách một số file, nhưng phải tách theo trách nhiệm và nơi cập nhật trạng thái. Không chia một file thành nhiều phần bằng nhau chỉ vì số dòng lớn.

Ba việc cần phân biệt:

| Thay đổi | Lợi ích trực tiếp | Giới hạn |
| --- | --- | --- |
| Chuyển một nhóm hàm/JSX sang file khác, vẫn import tĩnh | Dễ đọc, kiểm thử, bảo trì và định vị lỗi | Chưa chứng minh giảm JavaScript tải xuống hoặc thời gian render; đồ thị module còn có thể lớn hơn |
| Thu hẹp phần client, bớt dữ liệu truyền xuống, hoãn module chưa cần | Có thể giảm JS ban đầu, hydration và công việc khi mở trang | Cần đo bundle, Network và render; phải giữ nội dung quan trọng và fallback ổn định |
| Cô lập state/subscription, giảm công việc lặp | Có thể giảm render và CPU khi chọn câu, nhập đáp án, vẽ nét, cuộn trang | `memo` hoặc đổi tên file không tự giải quyết subscription sai |

Các dòng `Compiled / in 5s`, `GET / ...5855ms`, `/login ...747ms` người dùng đưa là **ví dụ**, không phải kết quả đo của lần rà soát này. Chúng chứa công việc của chế độ phát triển: Next biên dịch route khi được truy cập, khác với chạy bản build production. Không lấy 5.855 giây làm toàn bộ thời gian xử lý nghiệp vụ, cũng không hứa tách file sẽ giảm xuống một số giây cố định. [Next.js 15 — Local development](https://nextjs.org/docs/15/app/guides/local-development)

Request về `/` sau khi route đã biên dịch mà vẫn chậm cần được tách tiếp thành middleware/xác thực, thời gian API, xử lý server và trình duyệt. Số dòng không thể chỉ ra nguyên nhân này.

**Thứ tự đề nghị:** đo → trang chủ → dashboard → bài làm → PK/ghi âm → làm rõ lớp API server. Các hạng mục chỉ giúp bảo trì được ghi riêng, không gán thành cải thiện tốc độ đã đạt được.

## 2. Phạm vi và phương pháp rà soát

- Kiểm kê hiện tại: 233 file, gồm 231 file TS/TSX và 2 file CSS; trong đó 40 file test. Ba script CJS kiểm chứng/đồng bộ đã bỏ theo yêu cầu; cấu hình test nằm trong Jest có sẵn. Phụ lục cuối ghi quyết định cho từng file còn giữ.
- Đối chiếu các route, import tĩnh/động, `use client`, component con, state/ref/effect, xử lý mạng, timer, tài nguyên trình duyệt và các ca kiểm thử hiện có. Các khối lớn được xem thêm theo luồng dữ liệu, không chỉ xếp hạng theo số dòng.
- Đọc thêm cấu hình package, Next, TypeScript/typecheck, Tailwind, PostCSS, Jest, ESLint và workflow frontend. Không quét source của `node_modules`, `.next`, coverage hoặc Git như code ứng dụng; chỉ tra cấu hình Next đã cài khi cần xác minh hành vi.
- Không đưa `.env`, khóa, token, file ảnh/audio, dữ liệu người dùng hoặc DB vào tài liệu. Không cần đọc lại PDF/slide để đổi yêu cầu bài tập lớn trong lần này; những nghiệp vụ đã xây dựng là ràng buộc phải giữ khi refactor.
- “Được route tham chiếu” trong phụ lục là kết quả đồ thị import runtime từ các entry App Router/middleware. Điều đó không chứng minh mọi export trong module đều đang được gọi. File type-only không đi vào đồ thị runtime **không đồng nghĩa file thừa**.

Stack được đối chiếu: Next **15.5.9**, React **19.0.1**, App Router, TypeScript strict, Tailwind, Zustand, Framer Motion, Zod, Hanzi Writer, Recharts và BFF kết nối backend Nest hiện có. Không mặc định React 19 đã bật React Compiler.

Những phần đã có, phải dùng tiếp:

| Trách nhiệm | Nơi hiện có | Quyết định |
| --- | --- | --- |
| Phân trang và bộ lọc | `components/ui/catalog.tsx`, `lib/catalog-query.ts`, `lib/topic-catalog.ts` | Không thêm `list-pagination`, một page riêng hoặc một bộ phân trang mới |
| Input/validate | `components/ui/field.tsx`, `field-error.tsx`, `hooks/use-validated-form.ts`, `lib/validations/*` | Dùng lại contract lỗi và focus input |
| Xác nhận thao tác | `components/ui/confirmation-dialog.tsx` | Dùng lại cho bài làm; giữ popup đăng xuất hiện có trong đợt này |
| Header | `components/landing/landing-nav.tsx` được `shell/top-nav.tsx` dùng lại | Một bộ header; không tách thành hai header khách/học viên có markup trùng |
| State bài làm | `components/learning/attempt/attempt-store.ts` | Mở rộng cấu trúc quanh store này, không thêm store thứ hai |
| Thứ tự/định dạng câu hỏi | `lib/api/question-adapter.ts`, `lib/practice-scoring.ts` | Không tạo thêm bản normalize/chấm đáp án khác |
| Audio chung | `lib/practice-audio.ts`, `components/learning/shared-audio-section.tsx` | Giữ cách nhóm theo kỹ năng/phần/audio và chỉ một player cho mỗi nhóm |
| Nét viết | `lib/hanzi-data.ts`, `lib/hanzi-render-target.ts`, `hanzi-practice.tsx` | Dùng tiếp SDK và cache có sẵn, không tải JSON vào Git |
| Hiệu ứng chúc mừng | `lib/celebration.ts` | Đã import động `canvas-confetti`; không ghi việc này là tối ưu mới |
| Điểm/lịch sử/hồ sơ | `lib/learning-scores.ts`, `learning-history.ts`, generated contract | Giữ kết quả backend làm nguồn cuối cùng; giữ đồng bộ hồ sơ sau nâng HSK |

## 3. Tiêu chí tách vừa đủ

Một phần nên thành module khi có ít nhất một lý do rõ ràng: sở hữu vòng đời tài nguyên riêng; có state và tác động render riêng; là ranh giới server/client hoặc lazy load thực sự; được nhiều nơi dùng cùng một contract; hoặc là một nhóm nghiệp vụ đủ lớn để kiểm thử độc lập.

Mốc tham khảo sau format là khoảng 100–300 dòng cho một module nghiệp vụ; **không phải giới hạn bắt buộc**. File dài hơn vẫn hợp lý nếu chỉ có một trách nhiệm. Một file chỉ 16–24 dòng nhưng chứa vài KB JSX hoặc thư viện nặng cũng cần được xem xét. Không nén nhiều statement/JSX trên một dòng để làm đẹp số dòng.

Không tạo file riêng cho từng icon, nút, nhãn, đáp án, thanh tiến trình hoặc một helper 3 dòng chỉ dùng tại chỗ. Type, hằng số và helper nội bộ để cạnh chức năng; chỉ chuyển sang file chung khi có người dùng thực tế. Không tạo chuỗi `container → wrapper → view` chỉ truyền nguyên props.

Import trực tiếp module chức năng; tránh `index.ts` gom tất cả landing, dashboard và bài làm rồi import từ mọi nơi. Giữ `server-only`; client không được kéo loader có cookie/token sang trình duyệt. Thu hẹp client boundary theo nơi cần tương tác, có thể truyền nội dung server qua `children`/slot. [Next.js 15 — Server and Client Components](https://nextjs.org/docs/15/app/getting-started/server-and-client-components)

Chỉ `dynamic import` chưa chắc đã trì hoãn tải nếu component vẫn được render ngay. Các demo dưới màn hình phải có điều kiện kích hoạt thực sự. Không tắt SSR cho cả trang và không lazy heading/CTA chính. Với Next 15, không giả định server import động một Client Component sẽ tự tạo đúng ranh giới tải mong muốn. [Next.js 15 — Lazy loading](https://nextjs.org/docs/15/app/guides/lazy-loading)

`memo` chỉ dùng ở phần render đã đo, với props/callback ổn định; state hoặc context của chính component vẫn có thể làm nó render. Không phủ `memo/useMemo/useCallback` toàn dự án. [React — memo](https://react.dev/reference/react/memo)

## 4. Những file đáng xử lý trước

Số dòng theo source hiện tại; KB ở bảng là dung lượng source UTF-8, **không phải dung lượng bundle gzip**.

| File | Quy mô | Nhận xét | Quyết định |
| --- | --- | --- | --- |
| `landing/feature-showcase.tsx` | 823 dòng, ~24.9 KB | Sáu demo có state/timer cùng section và metadata | Tách 2 nhóm demo, hoãn phần tương tác dưới màn hình |
| `landing/hero.tsx` | 750 dòng, ~21.8 KB | Mockup, particles, nút tương tác, typewriter và bố cục chung | Tách 2 nhóm; giảm props và kiểm tra LCP |
| `learning/attempt-form.tsx` | 681 dòng, ~45.4 KB | State, submit, kết quả, câu hỏi và điều hướng cùng một module | Ưu tiên lớn nhất về cấu trúc nghiệp vụ; tách 4 phần có trách nhiệm rõ |
| `dashboard/dashboard-client.tsx` | 553 dòng, ~18.1 KB | Animation số liệu, refresh điểm và trình bày dashboard | Tách stat cards và tiến độ; giữ dữ liệu đã tối ưu |
| `landing/landing-nav.tsx` | 366 dòng, ~17.3 KB | Header chung, menu tài khoản, menu mobile và scroll | Chỉ tách menu tài khoản nếu giảm coupling sau đo; không làm header mới |
| `landing/for-teachers.tsx` | 359 dòng, ~10.8 KB | Một demo so sánh chiếm phần lớn file | Tách một demo nếu áp dụng tải gần viewport; không bắt buộc |
| `learning/speaking-recorder.tsx` | 262 dòng, ~13.5 KB | Micro, Blob, WAV, chấm, retry và UI | Tách một hook sở hữu toàn bộ vòng đời ghi âm/chấm |
| `learning/pk-arena.tsx` | 218 dòng, ~18.4 KB | Kết nối, retry, command và trận đấu | Tách session hook và giao diện trận đấu, giữ countdown cô lập |
| `dashboard/learning-analytics.tsx` | 24 dòng, ~4.8 KB | Import Recharts tĩnh dù file rất ngắn | Tách chart là ranh giới tải thư viện có ý nghĩa |
| `lib/api/learning.ts` | 294 dòng, ~10.4 KB | Loader bài làm lẫn ánh xạ hồ sơ/EXP/legacy | Tách loader bài làm server; lợi ích chính là bảo trì |
| `learning/hanzi-practice.tsx` | 164 dòng, ~12.4 KB | SDK đã import động nhưng board khởi tạo khi mount | Giữ file; xem lại thời điểm tạo Writer cho bài nhiều câu |
| `learning/attempt-history-review.tsx` | 90 dòng, ~12.7 KB | Review snapshot server, nhiều JSX nén | Format và giữ nhóm review; chưa cần tách thêm |

Hai file dài `learning/vocabulary-client.tsx` (462 dòng) và `rewards/rewards-client.tsx` (703 dòng) **không được luồng route hiện tại import runtime**. `/learning` và `/rewards` có triển khai khác đang được dùng. Tách hai file cũ này không trực tiếp sửa tốc độ mở trang hiện tại. `components/tutor/ai-tutor.tsx` cũng thuộc nhánh chưa được route dùng; `/tutor` đang redirect. Không tự xóa hoặc khôi phục tính năng từ các file này trong đợt refactor.

## 5. Thiết kế cho trang chủ `/`

### 5.1. Đường dữ liệu server trước khi chia UI

`app/page.tsx` hiện chờ `getLegacyUser()` và `getCatalogOverview()` trước khi trả cây trang. Overview gồm các request catalog công khai; đã chạy song song và có revalidate 60 giây trong `lib/api/catalog.ts`. Xác thực có `getApiUser()` dùng React cache trong request. Không đề xuất lại hai việc này như thể chưa có.

Việc cần làm:

1. Đo riêng cache hit/miss catalog, xác thực guest/logged-in và middleware; giữ token/cookie ngoài log.
2. Tính một projection nhỏ trên server cho Hero: tổng số, cấp HSK khả dụng, số bài theo kỹ năng và cờ dữ liệu khả dụng. Hero đang nhận cả `HskTopic[]` rồi lọc/tính lại trên client; dữ liệu đó không cần thiết cho mọi tương tác của Hero.
3. Không cache kết quả chứa người dùng vào cache công khai. Không xóa bảo vệ đăng nhập để có con số TTFB đẹp.
4. Nếu đo cho thấy overview đang giữ lại toàn bộ trang, thử streaming vùng số liệu bằng Suspense ngay tại `app/page.tsx`, với local async function khi đủ dùng. Heading/CTA không cần chờ catalog; số liệu có fallback đúng kích thước và không bịa số 0. Phải giữ đúng menu người dùng ngay từ server, tránh lóe giao diện khách.

Mục 4 là thử nghiệm có điều kiện: không chia server/client toàn trang chỉ để dùng Suspense, không thêm một data layer hay endpoint khác.

### 5.2. `hero.tsx`: hai phần lớn, không chia năm phần trang trí

| Nơi sau khi tách | Sở hữu | Không sở hữu |
| --- | --- | --- |
| Giữ `landing/hero.tsx` | Bố cục, nhận projection, heading/CTA và phối hợp các vùng | Không fetch catalog hoặc giữ state gõ chữ cho toàn Hero |
| Mới `landing/hero-visual.tsx` | `LiveDashboardMockup` + `ParticleBackground`; state/timer trang trí và cleanup của chúng | Không nhận toàn bộ danh sách topic hoặc token |
| Mới `landing/hero-interactions.tsx` | `MagneticButton` + `TypewriterHeadline`, xử lý tương tác/animation cục bộ | Không gom menu/header hay animation của toàn website vào đây |

Chuyển cấu trúc trước, giữ nguyên class/theme/bố cục. Sau đó mới kiểm tra có nên trì hoãn phần visual thuần trang trí; nếu đó là phần LCP hoặc việc trì hoãn tạo khoảng trống thì không hoãn.

Hiện typewriter bắt đầu bằng chuỗi rỗng và cập nhật theo timer. Cần dùng Performance xác định nó có trì hoãn phần chữ lớn nhìn thấy hay không. Nếu có, giữ nội dung heading đầy đủ trong HTML/accessible text và áp dụng hiệu ứng như phần tăng cường, giữ hình thức đã duyệt và hỗ trợ reduced motion. Đây là giả thuyết từ source, chưa phải kết luận LCP đã đo.

Không đưa `Math.random()` vào render SSR; phần particles phải ổn định khi hydrate. Không tự thay toàn bộ Framer Motion bằng thư viện khác trong bước tách file.

### 5.3. `feature-showcase.tsx`: tách demo theo nhóm chức năng

- Giữ section, nội dung giới thiệu và metadata sáu tính năng trong file hiện tại.
- Mới `landing/demos/learning-demos.tsx`: demo quiz, bốn kỹ năng và flashcard; các component cùng nhóm có state/timer riêng, export trực tiếp.
- Mới `landing/demos/progress-demos.tsx`: demo ngữ cảnh học, tài nguyên HSK và tiến độ/gamification. Đây vẫn là demo hiện tại, không khôi phục backend AI tutor hoặc thêm nghiệp vụ.
- Khi demo tới gần viewport, import/mount đúng nhóm cần thiết và giữ sau lần mount đầu. Phần text và kích thước khung demo vẫn có sẵn; lỗi chunk có fallback/thử lại phù hợp.
- `useInView` đang có chỉ điều khiển một số hiệu ứng; nó không tự loại import tĩnh khỏi initial graph. Không giữ map constructor import tĩnh của cả sáu demo sau khi tuyên bố đã lazy load.

Không tách thêm file metadata/types/renderer chỉ chứa vài dòng. Nếu chia nhóm nhưng cả hai module vẫn tải ngay và không cải thiện tổ chức, không giữ thêm lớp đó chỉ để đạt số lượng file.

### 5.4. Những section còn lại

`ForTeachers`: chỉ thêm `landing/demos/study-flow-demo.tsx` khi đo cho thấy demo đáng hoãn; nội dung chữ/CTA ở section cũ. `LandingFooter`: không có state/browser event, có thể bỏ `use client` khi kiểm tra import boundary xong; không cần tạo file mới.

`HowItWorks`, `FAQSection`, `PricingSection`, `TrustBar`, `ClosingCTA` và `SocialProof` đang tương đối gắn kết. Giữ các helper nội bộ. Với marquee/interval ngoài viewport, cân nhắc pause theo visibility và reduced motion nếu trace cho thấy CPU nền; việc tách thêm card/quote không thay thế việc dừng công việc không cần thiết.

Header đang dùng Framer Motion; vì vậy tách Hero không đồng nghĩa loại được toàn bộ Framer Motion khỏi trang. Đo chunk thực tế, không cộng các kích thước source thành con số tiết kiệm JS.

## 6. Thiết kế cho dashboard

Giữ `app/(student)/dashboard/page.tsx` là nơi lấy dữ liệu server. `getDashboardTopics()` hiện chỉ lấy một danh sách topic rồi chiếu 10 card, đồng thời giữ tổng đầy đủ. Không quay lại tải toàn bộ bộ luyện để đếm.

| Nơi | Quyết định |
| --- | --- |
| `dashboard-client.tsx` hiện có | Giữ orchestration, phần đầu trang, nối callback điểm danh và dữ liệu server |
| Mới `components/dashboard/dashboard-stat-cards.tsx` | Chứa cả nhóm bốn card + `StatCard`/animation số; không tạo file cho từng card |
| Mới `components/dashboard/dashboard-learning-progress.tsx` | Sở hữu refresh/tính mới dữ liệu điểm, chống request trùng và vùng mục tiêu + bốn kỹ năng; dùng lại `BandProgressChart`/`SkillProgress` |
| `dashboard/page.tsx` | Có thể render danh sách topic bằng local server function rồi truyền ReactNode slot vào client; không thêm file chỉ cho một link topic |
| `dashboard/learning-analytics.tsx` | Giữ số liệu, mục tiêu ngày, fallback và điều kiện kích hoạt biểu đồ |
| Mới `components/dashboard/study-time-chart.tsx` | Toàn bộ Recharts/chart/axes/tooltip/accessibility label; chỉ tải gần viewport |

Một nơi sở hữu refresh điểm, không để cha/con cùng fetch `learning-scores` sau khi tách. Giữ snapshot SSR, chống response cũ sau unmount, throttle focus và event `hsk-scores-updated`. Nếu việc chuyển refresh xuống con làm mất liên kết cập nhật cấp HSK ở phần đầu, truyền dữ liệu/callback rõ ràng hoặc dùng dữ liệu từ router refresh hiện có; không tạo store dashboard tổng quát chỉ để né vài props.

Chart có sẵn dữ liệu từ server, không fetch analytics lần nữa để vẽ. Fallback có chiều cao tương đương `h-64`, không nhảy trang; giữ mô tả số liệu cho người dùng không thấy chart.

**Giữ nguyên** `DailyCheckInCard` 128 dòng: trạng thái ngày Việt Nam, pending, retry, chống phản hồi cũ và phần thông báo cùng một nghiệp vụ. `BandProgressChart` 241 dòng và `SkillProgress` 266 dòng phần lớn là trình bày; chưa tách từng SVG/bar/label. Các card vẫn lấy màu từ token hiện có.

## 7. Thiết kế cho bài thi và bài luyện

### 7.1. Tách quanh store hiện có, giữ API component

`components/learning/attempt-form.tsx` hiện vừa quản lý context/store, vòng đời nộp, câu hỏi, tổng hợp và review. Dùng tiếp folder `components/learning/attempt/` đã có; `AttemptForm` và API `Attempt.Root/Question/Timer/Navigator` tiếp tục là điểm vào tương thích.

| Module | Nội dung chuyển đến | Ranh giới cần giữ |
| --- | --- | --- |
| Có sẵn `attempt/attempt-store.ts` | State/transition/claim submit, equality guard hiện tại | Một store cho mỗi bài đang mở; không singleton theo toàn app/SSR |
| Mới `attempt/attempt-provider.tsx` | Context, provider tạo store, `useAttemptStore`, `useAttemptField`, type props thực sự chia sẻ | Consumer import provider, không import ngược facade gây vòng phụ thuộc |
| Mới `attempt/attempt-question.tsx` | `QuestionBlock` và `ConnectedQuestion`, lựa chọn/ảnh/input, cầu nối nói/viết | Giữ hai phần cùng file; không tạo component cho mỗi loại đáp án nhỏ |
| Mới `attempt/use-attempt-submission.ts` | Attempt ID, start/deadline/version, payload cố định, submit/retry/reset, phase/result cần cho vòng đời nộp | Một chủ sở hữu của identity/ref/request; không tách mạng và reset thành hai hook tranh state |
| Mới `attempt/attempt-result.tsx` | Summary, điểm từng loại, thông báo lưu, hành động xem lại/làm lại và cập nhật hồ sơ liên quan | Không tự POST điểm lần nữa; kết quả backend là nguồn cuối cùng |
| Giữ `learning/attempt-form.tsx` | Bố cục, grouping đã memo, nối confirmation/navigation/audio và composition | Không đổi route, thứ tự câu hay contract công khai |

`AttemptTimer` ngắn, đã cô lập tick; giữ tại facade trước. `AttemptNavigator` wrapper ngắn cũng không cần file riêng. Không tách thêm `attempt-types.ts`, `attempt-utils.ts`, `use-attempt-form.ts` nếu chỉ chuyển tên/vài dòng.

### 7.2. Các thay đổi thực sự có thể giảm render

1. Parent hiện đăng ký `activeQuestionId`, trong khi Navigator cũng đọc store. Kiểm tra chỗ truyền `activeId` dư; parent chỉ cần action chọn câu, vùng Navigator tự đọc active ID. Mục tiêu là cuộn/chọn câu không làm cả controller tổng hợp lại bài.
2. Giữ selector theo câu cho `ConnectedQuestion`. Chọn đáp án câu 5 không làm mọi câu render lại vì truyền một object answers mới cho tất cả.
3. Nhóm theo kỹ năng/passage/audio và map số câu tính theo dữ liệu đề, không tính lại theo mỗi thao tác. `gradeByQuestion` phụ thuộc result/phase; bộ đếm làm/đánh dấu phụ thuộc đúng slice. Chỉ memo các phép tính có lợi sau đo, không thêm bản sao derived state cần đồng bộ bằng effect.
4. Không dùng selector trả object/array mới mỗi lần gọi mà không có chiến lược equality phù hợp; bảo toàn guard tiến độ nét viết để tránh lỗi maximum update depth đã từng xảy ra.
5. Cân nhắc import động phần Speaking theo đúng loại câu. Hanzi Writer đã được import động trong component, không tính lại là tối ưu mới. Không lazy radio/input hoặc ô trả lời đang xuất hiện đầu bài.
6. Summary có thể tải theo nhu cầu sau khi nộp, nhưng vùng nhận focus phải có ngay trong shell. Không để effect focus chạy vào ref chưa tồn tại do chunk chưa tới; lỗi chunk không được che kết quả vừa lưu.

### 7.3. Bảo toàn vòng đời bài làm

Luồng vẫn là `đang làm → xác nhận → lưu → summary → người dùng chọn xem lại → review`. Điểm local dùng cho phản hồi tạm; phản hồi submit server tiếp tục ghi đè kết quả chính thức theo contract hiện có. API hiện tại được giữ.

Các điều kiện bắt buộc khi tách:

- Giữ cùng attempt ID/payload cho retry của một lần nộp; bấm đúp, hết giờ và bấm nộp đồng thời chỉ tạo một lần lưu. Làm lại mới tạo identity mới.
- Không reset khi submit đang chạy; không để response cũ cập nhật attempt mới sau chuyển bài/unmount.
- Deadline theo thời gian thực; tab nền rồi quay lại vẫn đúng. Hết giờ chờ xử lý nói kết thúc theo cơ chế hiện tại, không tạo nhiều submit.
- Vùng câu hỏi hiện được ẩn bằng `hidden` khi xem summary; không đổi tùy tiện thành unmount cả cây. Việc đó có thể làm mất Blob ghi âm, trạng thái nét viết và tài nguyên đang xử lý.
- Giữ số thứ tự câu theo thứ tự đề, ID phục vụ state; không render theo khóa DB. Ảnh đầy đủ, chạm mở ảnh, audio chung không bị lặp, đang nghe câu này không phát các câu khác.
- Chọn số câu làm nội dung cuộn mượt nhưng ô active nhảy thẳng tới câu đích, không chạy qua từng số trung gian. Mobile dialog đóng đúng, desktop sticky đúng.
- Giữ cảnh báo thoát ngay cả khi bài mới bắt đầu/chưa chọn đáp án; Back/Forward, logo, link chi tiết đề và đổi navbar đều đi qua cơ chế bảo vệ hiện có.
- Giữ “chưa chấm” khác “0 điểm”; tách tự luyện nét viết, recording và câu có đáp án. Sau nâng HSK, refresh đúng hồ sơ/dashboard và không tự nâng cấp từ điểm client giả định.

## 8. Viết chữ và ghi âm: tách theo chủ sở hữu tài nguyên

### 8.1. Hanzi: giữ module, giảm khởi tạo sớm nếu cần

`hanzi-practice.tsx` gồm `CharacterBoard`, `WordPractice`, public component. Ranh giới này hợp lý; 164 dòng không cần chia ba file. SDK import động/cache nét đã có, nhưng board tạo Writer sau mount; một bài nhiều câu viết có thể tạo nhiều Writer ngay.

Đề nghị đo số Writer và CPU khi mở một bài viết nhiều câu. Nếu vấn đề rõ, kích hoạt Writer khi board gần viewport hoặc người dùng chủ động chọn “Xem mẫu”/bắt đầu viết. Khung board giữ sẵn; sau lần tạo đầu giữ instance/progress khi cuộn ra ngoài, không tự reset do IntersectionObserver. Không hỗ trợ observer thì khởi tạo bình thường.

Giữ key theo vị trí ký tự để chữ lặp như `妈妈` không dùng nhầm tiến độ; giữ PointerEvent target, resize, abort listener, cancel quiz và pause animation khi teardown. Không tạo bộ nhận diện nét thứ hai.

### 8.2. Ghi âm: thêm đúng một hook

Mới `components/learning/use-speaking-recorder.ts` nhận reference text, attempt context và callback cần thiết. Hook sở hữu MediaRecorder, stream, Blob, object URL, bộ đếm, prepared WAV, AbortController, busy lock và chuyển trạng thái `idle/opening/recording/processing`.

`speaking-recorder.tsx` giữ UI micro/dừng/nghe lại/chấm lại/feedback. Không chia UI thành nhiều nút. Hook dùng tiếp `encodeStudyWav`, schema và API hiện có; request và kết quả không có bản sao thứ hai.

Điểm kiểm tra: dừng mọi track sau lỗi/quay trang; revoke URL đúng lúc; chặn ghi âm trùng khi chờ quyền; không chấm Blob rỗng; cache WAV chỉ cho bản ghi tương ứng; retry chấm giữ cùng bản ghi; phản hồi muộn/abort không cập nhật component đã unmount. Thời hạn ghi/chấm và contract WAV hiện có được bảo toàn. Bộ đếm nằm trong vùng recorder, không khiến toàn bộ bài render theo mỗi tick.

## 9. PK: tách kết nối khỏi trình bày trận đấu

Mới `components/learning/use-pk-session.ts` sở hữu identity, EventSource, connect/retry/generation, storage theo backend/account/HSK, POST command, kiểm tra event và chuyển trạng thái trận. Hook này là session PK riêng, không phải websocket manager tổng quát.

Mới `components/learning/pk-match.tsx` chứa đề, lựa chọn, ready/score và `PkCountdown`. Giữ countdown ở cấp trận, không đưa tick mỗi giây vào hook kết nối rồi lan render toàn phòng.

`pk-arena.tsx` còn composition, lobby/search/result và hành động nối hook. Nếu lobby/result vẫn ngắn, để cạnh nhau; không thêm file cho từng hộp trạng thái.

Các invariant cần kiểm tra lại sau từng bước:

- Dùng BFF hiện có; không đưa token vào query/localStorage hay chuyển browser gọi API VPS theo một bộ env mới.
- Event chỉ thuộc user/phòng/cấp hiện tại; loại generation/revision cũ, payload hỏng hoặc phòng khác. Update thiếu question không xóa dữ liệu câu đang có.
- Giữ giới hạn retry và backoff hiện tại, dừng khi 401/403; cleanup EventSource/timer khi rời trang. Không polling lobby mỗi giây.
- Command bị chặn ngay trong cùng frame khi bấm liên tiếp; chọn đáp án hiện tức thì, sai đỏ, đúng xanh, thông báo đồng bộ; lỗi gửi cho phép thử lại đúng trạng thái.
- Deadline/offset/điểm/EXP lấy từ server, không thay bằng đồng hồ hay kết quả do client tự tính.
- Giữ `lib/api/pk-bridge.ts`: mỗi HTTP request sở hữu socket riêng, POST nhận ACK; không phụ thuộc biến kết nối của GET nằm trong cùng một process Vercel.
- Giữ `serverExternalPackages` Socket.IO/Engine.IO/ws trong Next config. Không “clean” cấu hình này vì localhost đang chạy được.

Test unit lifecycle chưa đủ chứng minh ghép trận production. Sau triển khai phải smoke hai tài khoản cùng HSK và kiểm tra bản build; khi release Vercel cần xác nhận hai phía ghép cùng phòng.

## 10. API, header, CSS và phần còn lại

### 10.1. Chia `lib/api/learning.ts` đúng vai trò

Tạo `lib/api/attempts.ts` là server-only loader chứa trọn `testForTaking()` và helper `answerValues` liên quan. Dùng lại `question-adapter`, `practice-audio`, `writing-practice`, route và timing hiện có; consumer chính là `components/learning/attempt-page.tsx` cùng test adapter/catalog.

`learning.ts` giữ profile/activity/EXP và adapter legacy còn cần kiểm tra. Dùng import trực tiếp tới loader mới; facade tương thích chỉ giữ khi có người dùng thật. Đây là cải thiện phân trách nhiệm, **chưa có bằng chứng giảm request API hoặc tốc độ browser**.

Giữ `server.ts`, `session.ts`, `config.ts`, `catalog.ts`, `client.ts` và BFF hiện tại: mỗi file vẫn tương đối gắn kết. Không tạo generic repository/service/fetch hook mới. `ApiError` giữ một class dùng chung để `instanceof` đúng. Không thêm schema API theo từng màn trùng với `question-adapter`/generated contract.

Catalog cá nhân hóa có thể cần nhiều bucket HSK để ưu tiên đúng và giữ đầy đủ trang; không đơn giản hóa thành sort một trang backend rồi làm mất dữ liệu. Trước khi đổi thuật toán phải đo số request theo trang/cấp và giữ test dữ liệu lớn 205 bản ghi. Danh sách 9 mục không được cắt một bài học chỉ còn 9 từ.

### 10.2. Header và đăng xuất

Chỉ cân nhắc một `components/shell/account-menu.tsx` nếu phần tài khoản và state click-outside/Escape đủ độc lập sau đo. Giữ header shared, vùng logo/nav/menu mobile/scroll ở `landing-nav.tsx`; phối hợp đóng menu khi đổi route. Không tạo thêm file cho initials/chevron/avatar fallback.

Popup đăng xuất hiện có là custom portal trong `logout-button.tsx`; nó có focus trap/scroll/unsaved handling riêng. Giữ nguyên trong bước này, tránh làm tái xuất hiện lỗi popup bị cắt khi header có transform/blur. `ConfirmationDialog` dùng cho các luồng đang dùng nó; chưa ép hợp nhất hai popup chỉ vì cùng có nút Hủy/Xác nhận.

### 10.3. CSS, icon và cấu hình

`globals.css` 553 dòng và `styles/tokens.css` 113 dòng đã tách token/theme. Di chuyển CSS sang file khác rồi import toàn cục vẫn tải cùng CSS. Giữ màu, radius, shadow, dark mode đã duyệt. Chỉ scope/remove CSS sau khi kiểm tra selector thật và ảnh trước/sau; không xóa keyframe đang được tham chiếu gián tiếp từ Tailwind config.

`stat-icons.tsx` 328 dòng chứa bộ SVG thuần; không chia thành hàng chục file icon nếu bundle chưa chỉ ra vấn đề. Giữ named import và tree shaking. Next đang cài đã có mặc định tối ưu import `lucide-react` và `recharts`; không thêm cùng cấu hình để ghi nhận một tối ưu giả.

`npm run dev` đã chạy Turbopack ở cổng 3002. Không đổi cổng người dùng, tắt strict/lint/typecheck, sửa cấu hình websocket hay nâng framework hàng loạt trong cùng đợt chia file.

## 11. Số module mới dự kiến và giới hạn phạm vi

Đây là ngân sách dự kiến, không phải chỉ tiêu phải tạo đủ:

| Nhóm | Module mới có lý do rõ | Có điều kiện |
| --- | ---: | ---: |
| Hero + showcase | 4 | +1 demo so sánh nếu lazy load hữu ích |
| Dashboard + chart | 3 | Không thêm server-topic file nếu local function đủ |
| Bài làm | 4 | Giữ timer/navigator nhỏ trong facade |
| PK | 2 | Giữ lobby/result cạnh nhau |
| Ghi âm | 1 | Không chia nút/player |
| API loader | 1 | Không thêm endpoint |
| Header | 0 | +1 menu tài khoản |
| **Tổng** | **15** | **Tối đa 2 module tùy kết quả rà soát/đo** |

Các con số không bao gồm test bổ sung thật sự cần thiết. Nếu một phần chỉ là chuyển 20 dòng ra rồi truyền hàng chục props, giữ lại tại chỗ. Không thêm package mới cho những việc hiện stack đã làm được.

## 12. Lộ trình thực hiện theo từng bước

Mỗi bước chỉ chuyển một nhóm chức năng. Không sửa đồng loạt cả trang chủ, bài làm và PK trước khi kiểm tra.

### Bước 0 — Chốt baseline và phạm vi

- Ghi revision/source hash, trạng thái working tree, phiên bản, env target local/deployed dưới nhãn đã che thông tin nhạy cảm.
- Đo route khách và đăng nhập trong cùng điều kiện; phân biệt cold dev, warm dev và production.
- Chụp giao diện desktop/mobile, light/dark và ghi số request, props truyền client, JS theo route, commit render cho thao tác đại diện.
- Không coi log ví dụ của người dùng là baseline. Không ghi hạng mục “đã tối ưu” trước khi thay đổi.

Điều kiện qua: có số đo tái lập và xác định khu vực chậm; không cần thêm kiến trúc đo tổng quát vào product UI.

### Bước 1 — Trang chủ: tách cấu trúc

Chuyển Hero và hai nhóm showcase theo mục 5, vẫn giữ cách render cũ. Kiểm tra import/circular dependency, hydration, logo, CTA, flipcard, menu, scroll và theme. Footer bỏ client chỉ khi không còn lý do client.

Điều kiện qua: UI/hành vi giữ đúng, typecheck/lint và production build đạt. Đây là bước dễ đọc hơn, không tuyên bố tốc độ cải thiện nếu số đo chưa đổi.

### Bước 2 — Trang chủ: thay ranh giới tải và dữ liệu

Áp dụng projection server; thử lazy demo gần viewport và xử lý heading/LCP khi trace xác nhận. Nếu streaming catalog có lợi, thử riêng để phân biệt nguyên nhân. Đo lại props/chunks/LCP/CLS/CPU và cold dev.

Điều kiện qua: demo dưới màn hình chưa mount thì không chạy interval/tải phần code tương tác không cần; nội dung chính vẫn sẵn; không làm UI trống hoặc giật bố cục. Chỉ giữ tối ưu có ích quan sát được.

### Bước 3 — Dashboard

Tách nhóm stat/progress; owner refresh điểm chỉ một chỗ. Dời chart Recharts sau gate và topic server slot nếu không gây coupling. Giữ tổng topic, 10 card, điểm danh/ngày Việt Nam, hồ sơ và điểm sau làm bài.

Điều kiện qua: test refresh/check-in/catalog đạt; không thêm request trùng; chart chỉ tải đúng lúc; counter không kéo cả dashboard render mỗi tick.

### Bước 4 — Bài làm: refactor hành vi giữ nguyên

Chuyển provider/question trước và kiểm tra; tiếp đó chuyển submission/result. Giữ facade và public API. Chạy test store/timer/result, route, đáp án, viết và lịch sử sau mỗi phần có ảnh hưởng.

Điều kiện qua: cả nộp thủ công, hết giờ, retry sau lỗi, làm lại, summary→review và nâng HSK/hồ sơ còn đúng; không mất ghi âm/nét viết khi ẩn vùng câu.

### Bước 5 — Bài làm: thu hẹp render và khởi tạo tài nguyên

Bỏ subscription active ID không cần ở parent; giữ selector theo câu và nhóm dữ liệu cố định. Đo rồi mới hoãn Writer/Speaking/chunk kết quả. Không áp dụng virtualization toàn đề ngay vì ảnh cao thay đổi, sticky audio, scroll-to-question và state nét/ghi âm dễ mất.

Điều kiện qua: bài 40/60/80 câu, fixture 240 câu, bài viết nhiều board đều đúng; typing/chọn cờ/cuộn không tạo render đại trà; observer/Writer/timer được cleanup.

### Bước 6 — PK và ghi âm

Tách PK session/match, test hồi kết nối và hai tài khoản trước; sau đó mới tách recorder. Không làm hai vòng đời mạng/tài nguyên trong một thay đổi khó kiểm tra.

Điều kiện qua: không socket/timer rò rỉ, không ghép nhầm user/phòng, không submit trùng; mic được nhả và bản ghi vẫn nghe/chấm lại được.

### Bước 7 — API server và hoàn thiện

Tách loader bài làm, cập nhật direct imports và các test sử dụng loader. Nếu cần, tách account menu sau khi các nhóm ưu tiên đã ổn. Rà lại đường import chưa dùng, cấu hình, UI responsive và số liệu trước/sau. File legacy chỉ phân loại, chưa xóa tự động.

Điều kiện qua: tất cả quality gate và smoke liên quan đạt; chỉ công bố chênh lệch thực đo. Nếu cải thiện cấu trúc nhưng performance ngang nhau, ghi đúng như vậy.

## 13. Kế hoạch đo để biết phần nào nhanh hơn

### 13.1. Tách ba chế độ

| Chế độ | Cách đo | Dùng để kết luận |
| --- | --- | --- |
| Cold dev | Phiên dev/cache riêng của bản đối chiếu, truy cập route lần đầu | Chi phí biên dịch theo nhu cầu; không đại diện production |
| Warm dev | Cùng server sau khi route đã compile, lặp cùng đường dẫn/tài khoản | Request/data latency khi phát triển |
| Production | Build/start trong bản làm việc cách ly có cùng cấu hình/dataset | JS, TTFB, LCP/CLS và tương tác gần điều kiện deploy |

Không build vào `.next` đang được dev 3002 sử dụng, không xóa `.next` của phiên người dùng. Dùng bản snapshot cách ly chỉ để đo; phải ghi nhận cả thay đổi chưa commit, không so nhầm HEAD sạch với working tree hiện tại. Server đối chiếu dùng cổng khác và dừng sau đo, không đổi `dev/start` chính của dự án.

Giữ cùng Node, target backend, account, cache state, kích thước màn hình và throttling. Cold và warm không gộp chung; guest và authenticated không gộp; backend local và VPS không gộp. Khi thực hiện đo, ghi median của nhiều lượt, độ dao động và số mẫu; không dùng p95 từ 2–3 lượt để khẳng định chắc chắn.

### 13.2. Những số phải thu

| Khu vực | Chỉ số | Bằng chứng cần có |
| --- | --- | --- |
| `/`, `/login` | Thời gian compile lần đầu, GET warm, middleware/auth/catalog | Log timestamp đã che thông tin; Performance/Network phân tách pha |
| Landing | JS ban đầu, module demo thực tải, props/RSC, LCP/CLS | Build report + Network/trace, không chỉ số dòng source |
| Dashboard | Số request ban đầu/focus/điểm danh, chart chunk, render animation | Test request count và React Profiler |
| Bài làm | Commit/render khi chọn câu/đáp án/nhập/vẽ; long task | Profiler trên đề cố định; kiểm tra CPU và thời gian tương tác |
| Viết/nói | Số Writer, listener, track, URL, request khi mở/đóng | Instrument trong test/trace, không log audio hay token |
| PK | EventSource/socket/timer theo phiên, thời gian ghép và cleanup | Unit lifecycle + hai tài khoản + bản build/Vercel khi release |

Chạy trực tiếp các test sẵn có bằng npm/Jest; dùng React DevTools Profiler và Performance/Lighthouse để đo cùng một luồng thao tác. Không thêm script đo so sánh phụ thuộc commit cũ. Báo cáo, ảnh chụp và log phát sinh chỉ dùng tại máy kiểm tra; nếu xuất file thì để trong thư mục evidence được Git bỏ qua.

Lập baseline mới ngay trước từng đợt triển khai và đối chiếu trong cùng điều kiện. Không giữ báo cáo JSON/ảnh kiểm chứng cũ trong repository hoặc dùng chúng để thay cho lần đo lại. Tốc độ build giữa cache nóng/lạnh khác nhau không được suy ra từ kích thước bundle.

Không đặt cam kết “5 giây xuống 1 giây” khi chưa đo. Tiêu chí performance là giảm đúng chỉ số mục tiêu vượt dao động đo, không làm hồi quy đáng kể những chỉ số còn lại; nếu có tradeoff thì ghi rõ và giữ lại chỉ khi có lý do.

## 14. Kiểm thử và bảo toàn chức năng

Lần lập plan này không sửa code nên không chạy lại bộ test/build hoặc tạo file test tạm. Các lệnh dưới đây là gate cho giai đoạn triển khai sau:

```text
npm run lint
npm run typecheck
npm test -- --runInBand
npm run test:coverage -- --runInBand
npm run build
```

Chạy test liên quan trong từng bước; chạy toàn bộ gate một lần trước chốt nhóm thay đổi lớn. Build production và đo hiệu năng thực hiện trong bản cách ly phù hợp. Không chạy hai lệnh Jest toàn bộ và coverage toàn bộ liên tiếp nếu một lần coverage đã đủ kiểm tra và không có thay đổi mới. Không cần source backend sibling để chạy test unit; .env.local phục vụ cấu hình kết nối khi chạy ứng dụng.

Không thu hẹp coverage chỉ để số đẹp sau khi chuyển code. Giữ file contract TypeScript hiện có vì code đang import; khi backend đổi payload thì đối chiếu và cập nhật kiểu cùng test liên quan, không dùng script đồng bộ. Giữ pipeline lint/typecheck/coverage/build và các kiểm tra kỹ thuật BTL đang áp dụng. Refactor không phải bằng chứng mới để tuyên bố đã đáp ứng toàn bộ rubric chưa được đối chiếu lại trong lần này.

| Luồng | Ca bắt buộc sau refactor liên quan |
| --- | --- |
| Auth | Email/password, Google, pending approval, nonce/retry, lỗi input, redirect role, logout |
| Navigation | Logo về `/`, tab đúng route, mobile/desktop menu, guard link/Back/Forward/refresh trong bài |
| Danh mục | 9 mục/trang, bộ lọc giữ qua pagination, ưu tiên HSK, toàn bộ từ của một bài học |
| Nghe/đọc | Đáp án chữ/ảnh/true-false, chuẩn hóa giá trị, số thứ tự, audio chung/riêng, xem ảnh đầy đủ |
| Viết | Chữ lặp, xem mẫu, outline, hint, retry CDN, đúng/sai nét, tiến độ khi cuộn/đổi ký tự |
| Nói | Quyền micro, bắt đầu/dừng, nghe lại, lỗi chấm, chấm lại, busy/timeout/cleanup |
| Thi/nộp | Giới hạn thời gian, hết giờ, bấm đúp, retry, summary trước review, history đúng một lần |
| Tiến độ | Band theo phản hồi server, hồ sơ/dashboard cập nhật, chưa có điểm không thành 0, điểm danh qua ngày |
| PK | Hai tài khoản cùng HSK, selected/wrong/correct, deadline, stale events, reconnect, rời trận, lịch sử/EXP |
| UI | Cùng palette/token, dark/light, popup nằm đúng viewport, keyboard/focus, reduced motion, không overflow ngang |

## 15. Danh mục quyết định từng file

Ký hiệu: **TÁCH** = đã mô tả trách nhiệm mới ở trên; **ĐO** = thay đổi runtime có điều kiện, chưa chắc cần file mới; **GIỮ** = trách nhiệm hiện rõ; **CŨ** = chưa được đồ thị runtime hiện tại tham chiếu, chỉ phân loại; **TYPE** = type/contract, không coi là code chết; **TEST** = giữ kiểm tra, sửa import khi thật sự di chuyển chức năng.

Số dòng chỉ để tra cứu. Quyết định không dựa vào ngưỡng cắt dòng; file dài do SVG/markup và file ngắn do nén JSX đều được xét theo chức năng.


### Route và trang

| File | Dòng | Quyết định | Nội dung |
| --- | ---: | --- | --- |
| `src/app/(auth)/confirm-email/page.tsx` | 2 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(auth)/confirm-new-email/page.tsx` | 2 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(auth)/error.tsx` | 7 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(auth)/forgot-password/page.tsx` | 62 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(auth)/layout.tsx` | 41 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(auth)/loading.tsx` | 5 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(auth)/login/page.tsx` | 195 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(auth)/password-change/page.tsx` | 2 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(auth)/register/page.tsx` | 97 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(auth)/reset-password/page.tsx` | 73 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(auth)/signup/page.tsx` | 2 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(student)/dashboard/__tests__/refresh.test.tsx` | 69 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/app/(student)/dashboard/dashboard-client.tsx` | 553 | **TÁCH** | Nhóm stat cards + tiến độ; một owner refresh dữ liệu (§6). |
| `src/app/(student)/dashboard/page.tsx` | 24 | **ĐO** | Giữ loader server; topic server slot nếu hữu ích, tổng topic không đổi. |
| `src/app/(student)/error.tsx` | 7 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(student)/exams/[id]/attempt/page.tsx` | 13 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(student)/exams/[id]/page.tsx` | 28 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(student)/exams/page.tsx` | 20 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(student)/games/page.tsx` | 71 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(student)/games/pk/page.tsx` | 10 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(student)/history/page.tsx` | 38 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(student)/layout.tsx` | 14 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(student)/leaderboard/page.tsx` | 29 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(student)/learning/learning-tabs.tsx` | 34 | **CŨ** | Chưa được đồ thị route import runtime; không tách/xóa hay khôi phục tự động. |
| `src/app/(student)/learning/lessons-panel.tsx` | 91 | **CŨ** | Chưa được đồ thị route import runtime; không tách/xóa hay khôi phục tự động. |
| `src/app/(student)/learning/page.tsx` | 31 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(student)/learning/vocabulary-client.tsx` | 462 | **CŨ** | Chưa được đồ thị route import runtime; không tách/xóa hay khôi phục tự động. |
| `src/app/(student)/learning/vocabulary-panel.tsx` | 3 | **CŨ** | Chưa được đồ thị route import runtime; không tách/xóa hay khôi phục tự động. |
| `src/app/(student)/live-classes/page.tsx` | 43 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(student)/loading.tsx` | 5 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(student)/practice/__tests__/routes.test.tsx` | 53 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/app/(student)/practice/[skill]/page.tsx` | 11 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(student)/practice/actions.ts` | 10 | **CŨ** | Chưa được đồ thị route import runtime; không tách/xóa hay khôi phục tự động. |
| `src/app/(student)/practice/attempt/[attemptId]/__tests__/attempt-form.test.tsx` | 37 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/app/(student)/practice/attempt/[attemptId]/__tests__/handwriting-export.test.tsx` | 23 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/app/(student)/practice/attempt/[attemptId]/page.tsx` | 21 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(student)/practice/page.tsx` | 9 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(student)/practice/sets/[id]/attempt/page.tsx` | 9 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(student)/practice/writing/__tests__/page.test.tsx` | 33 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/app/(student)/practice/writing/page.tsx` | 12 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(student)/practice/writing/words/__tests__/page.test.tsx` | 28 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/app/(student)/practice/writing/words/page.tsx` | 31 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(student)/results/[attemptId]/page.tsx` | 20 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(student)/rewards/page.tsx` | 23 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(student)/rewards/rewards-client.tsx` | 703 | **CŨ** | Chưa được đồ thị route import runtime; không tách/xóa hay khôi phục tự động. |
| `src/app/(student)/tutor/page.tsx` | 2 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/(student)/vocabulary/page.tsx` | 64 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/announcements/error.tsx` | 7 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/announcements/layout.tsx` | 3 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/announcements/loading.tsx` | 5 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/announcements/page.tsx` | 29 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/api/auth/google/route.ts` | 16 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/app/api/hsk/[...path]/route.ts` | 168 | **GIỮ** | BFF/session/origin/multipart/approval; không sinh thêm endpoint khi refactor. |
| `src/app/api/pk/route.ts` | 40 | **GIỮ** | BFF GET/POST riêng transport; auth/command contract cùng route. |
| `src/app/api/tutor/chat/route.ts` | 2 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/app/api/tutor/health/route.ts` | 2 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/app/globals.css` | 553 | **GIỮ** | Global styles/keyframes; tách import không tự giảm CSS gửi đi. |
| `src/app/layout.tsx` | 54 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/not-found.tsx` | 5 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/app/page.tsx` | 46 | **ĐO** | Composition server; bớt props catalog; đo auth/catalog trước streaming (§5). |
| `src/app/profile/__tests__/api-actions.test.ts` | 133 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/app/profile/__tests__/personal-info-form.test.tsx` | 35 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/app/profile/api-actions.ts` | 107 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/app/profile/avatar-uploader.tsx` | 105 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/app/profile/error.tsx` | 7 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/profile/layout.tsx` | 3 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/profile/loading.tsx` | 5 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/profile/page.tsx` | 54 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/profile/personal-info-form.tsx` | 169 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/app/profile/profile-tabs.tsx` | 47 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/app/profile/settings-forms.tsx` | 146 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/app/robots.ts` | 8 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/app/sitemap.ts` | 5 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/app/support/actions.ts` | 2 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/app/support/create-ticket-form.tsx` | 46 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/app/support/error.tsx` | 7 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/support/layout.tsx` | 9 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/support/loading.tsx` | 5 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |
| `src/app/support/page.tsx` | 55 | **GIỮ** | Entry/composition theo App Router; tái sử dụng component sẵn có, không thêm page wrapper. |

### Component

| File | Dòng | Quyết định | Nội dung |
| --- | ---: | --- | --- |
| `src/components/auth/account-approval-dialog.tsx` | 26 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/auth/confirm-email-form.tsx` | 69 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/auth/google-sign-in.tsx` | 175 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/dashboard/band-progress-chart.tsx` | 241 | **GIỮ** | SVG + animation cùng một chart; không chia tick/label. |
| `src/components/dashboard/daily-checkin-card.tsx` | 128 | **GIỮ** | State theo ngày, request dedupe/retry và thông báo cùng nghiệp vụ. |
| `src/components/dashboard/learning-analytics.tsx` | 24 | **TÁCH** | Chart Recharts riêng sau gate; dữ liệu/số liệu hiện có giữ cùng module (§6). |
| `src/components/dashboard/skill-progress.tsx` | 266 | **GIỮ** | Nhóm kỹ năng gắn kết; dùng token và contract điểm hiện có. |
| `src/components/gamification/achievement-card.tsx` | 182 | **CŨ** | Chưa được đồ thị route import runtime; không tách/xóa hay khôi phục tự động. |
| `src/components/gamification/animated-flame.tsx` | 150 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/gamification/daily-challenge.tsx` | 150 | **CŨ** | Chưa được đồ thị route import runtime; không tách/xóa hay khôi phục tự động. |
| `src/components/gamification/level-badge.tsx` | 112 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/gamification/progress-ring.tsx` | 132 | **CŨ** | Chưa được đồ thị route import runtime; không tách/xóa hay khôi phục tự động. |
| `src/components/gamification/xp-gem.tsx` | 151 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/icons/stat-icons.tsx` | 328 | **GIỮ** | Bộ SVG named exports; không chia mỗi icon khi chưa có bằng chứng bundle. |
| `src/components/landing/closing-cta.tsx` | 137 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/landing/faq-section.tsx` | 105 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/landing/feature-showcase.tsx` | 823 | **TÁCH** | Hai nhóm demo, giữ metadata/section; gate tải gần viewport (§5). |
| `src/components/landing/for-teachers.tsx` | 359 | **ĐO** | Chỉ tách demo BeforeAfter nếu có lợi tải/CPU, text vẫn có sẵn (§5). |
| `src/components/landing/hero.tsx` | 750 | **TÁCH** | Visual + interactions; projection server; heading/CTA không lazy tùy tiện (§5). |
| `src/components/landing/how-it-works.tsx` | 141 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/landing/landing-footer.tsx` | 115 | **ĐO** | Không state/browser event; cân nhắc server component, không thêm file. |
| `src/components/landing/landing-nav.tsx` | 366 | **ĐO** | Header dùng chung; menu account tách có điều kiện; giữ scroll/mobile (§10). |
| `src/components/landing/pricing-section.tsx` | 179 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/landing/scroll-to-top.tsx` | 36 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/landing/social-proof.tsx` | 304 | **ĐO** | Giữ module; đo marquee/scramble ngoài viewport, không chia từng quote. |
| `src/components/landing/trust-bar.tsx` | 109 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/learning/__tests__/hanzi-practice.test.tsx` | 64 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/components/learning/__tests__/history-review.test.tsx` | 41 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/components/learning/__tests__/pk-lifecycle.test.tsx` | 43 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/components/learning/__tests__/practice-filters.test.tsx` | 24 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/components/learning/attempt-form.tsx` | 681 | **TÁCH** | Provider, question, submission, result; facade/Timer/Navigator giữ (§7). |
| `src/components/learning/attempt-history-review.tsx` | 90 | **GIỮ** | Format JSX; review snapshot/grade map tuyến tính đã có, chưa chia thêm. |
| `src/components/learning/attempt-history-table.tsx` | 24 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/learning/attempt-page.tsx` | 36 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/learning/attempt/__tests__/attempt-store.test.ts` | 24 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/components/learning/attempt/__tests__/attempt-timer.test.tsx` | 21 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/components/learning/attempt/__tests__/result-lifecycle.test.ts` | 11 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/components/learning/attempt/attempt-store.ts` | 61 | **GIỮ** | State machine riêng từng bài; claim/equality/reset là invariant. |
| `src/components/learning/handwriting-lesson.tsx` | 53 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/learning/hanzi-practice.tsx` | 164 | **ĐO** | Giữ board/word cùng file; đo init Writer gần viewport (§8). |
| `src/components/learning/pk-arena.tsx` | 218 | **TÁCH** | Session hook + match UI; countdown giữ vùng trận (§9). |
| `src/components/learning/practice-catalog.tsx` | 26 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/learning/practice-filters.tsx` | 25 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/learning/pronunciation-button.tsx` | 83 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/learning/question-content.tsx` | 6 | **CŨ** | Chưa được đồ thị route import runtime; không tách/xóa hay khôi phục tự động. |
| `src/components/learning/question-navigator.tsx` | 135 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/learning/shared-audio-section.tsx` | 45 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/learning/source-attempt-history.tsx` | 18 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/learning/speaking-recorder.tsx` | 262 | **TÁCH** | Một hook sở hữu toàn bộ stream/Blob/WAV/request/cleanup (§8). |
| `src/components/learning/start-attempt-button.tsx` | 70 | **GIỮ** | Luồng mở bài luyện/đề thi dùng chung popup chọn cách chấm và thời gian thi. |
| `src/components/learning/vocabulary-game.tsx` | 39 | **CŨ** | Chưa được đồ thị route import runtime; không tách/xóa hay khôi phục tự động. |
| `src/components/learning/word-cards.tsx` | 32 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/learning/word-deck.tsx` | 16 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/shell/app-shell.tsx` | 25 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/shell/feature-menu.tsx` | 20 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/shell/logout-button.tsx` | 174 | **GIỮ** | Custom portal/focus/unsaved guard đang có; tránh lỗi popup bị cắt. |
| `src/components/shell/navigation-protection.tsx` | 79 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/shell/study-tracker.tsx` | 38 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/shell/theme-provider.tsx` | 17 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/shell/theme-toggle.tsx` | 58 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/components/shell/top-nav.tsx` | 17 | **GIỮ** | Facade dùng LandingNav; không tạo header song song. |
| `src/components/tutor/ai-tutor.tsx` | 321 | **CŨ** | Chưa được đồ thị route import runtime; không tách/xóa hay khôi phục tự động. |
| `src/components/ui/catalog-badge.tsx` | 5 | **GIỮ** | Custom UI dùng chung sẵn có; giữ props/theme/accessibility, không tạo bản khác. |
| `src/components/ui/catalog.tsx` | 44 | **GIỮ** | Bộ phân trang/filter sẵn có; không tạo list-pagination mới. |
| `src/components/ui/confirmation-dialog.tsx` | 67 | **GIỮ** | Custom UI dùng chung sẵn có; giữ props/theme/accessibility, không tạo bản khác. |
| `src/components/ui/empty-state.tsx` | 17 | **GIỮ** | Custom UI dùng chung sẵn có; giữ props/theme/accessibility, không tạo bản khác. |
| `src/components/ui/error-state.tsx` | 26 | **GIỮ** | Custom UI dùng chung sẵn có; giữ props/theme/accessibility, không tạo bản khác. |
| `src/components/ui/field-error.tsx` | 3 | **GIỮ** | Custom UI dùng chung sẵn có; giữ props/theme/accessibility, không tạo bản khác. |
| `src/components/ui/field.tsx` | 78 | **GIỮ** | Custom UI dùng chung sẵn có; giữ props/theme/accessibility, không tạo bản khác. |
| `src/components/ui/loading-spinner.tsx` | 8 | **GIỮ** | Custom UI dùng chung sẵn có; giữ props/theme/accessibility, không tạo bản khác. |
| `src/components/ui/not-found-state.tsx` | 16 | **GIỮ** | Custom UI dùng chung sẵn có; giữ props/theme/accessibility, không tạo bản khác. |
| `src/components/ui/refresh-button.tsx` | 11 | **GIỮ** | Custom UI dùng chung sẵn có; giữ props/theme/accessibility, không tạo bản khác. |
| `src/components/ui/stagger-group.tsx` | 31 | **CŨ** | Chưa được đồ thị route import runtime; không tách/xóa hay khôi phục tự động. |
| `src/components/ui/tilt-card.tsx` | 62 | **GIỮ** | Custom UI dùng chung sẵn có; giữ props/theme/accessibility, không tạo bản khác. |

### Hook

| File | Dòng | Quyết định | Nội dung |
| --- | ---: | --- | --- |
| `src/hooks/__tests__/use-async-action.test.tsx` | 53 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/hooks/__tests__/use-validated-form.test.tsx` | 23 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/hooks/use-async-action.ts` | 44 | **GIỮ** | Hook dùng chung hiện có; tái sử dụng đúng contract, không hook trùng chức năng. |
| `src/hooks/use-validated-form.ts` | 70 | **GIỮ** | Hook dùng chung hiện có; tái sử dụng đúng contract, không hook trùng chức năng. |

### Thư viện và API

| File | Dòng | Quyết định | Nội dung |
| --- | ---: | --- | --- |
| `src/lib/__tests__/attempt-domain.test.ts` | 82 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/lib/__tests__/audio-wav.test.ts` | 27 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/lib/__tests__/catalog-query.test.ts` | 40 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/lib/__tests__/celebration.test.ts` | 22 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/lib/__tests__/hanzi-data.test.ts` | 48 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/lib/__tests__/hanzi-render-target.test.ts` | 73 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/lib/__tests__/navigation-protection.test.ts` | 16 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/lib/__tests__/pk-contract.test.ts` | 21 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/lib/__tests__/topic-catalog.test.ts` | 14 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/lib/__tests__/user-display.test.ts` | 11 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/lib/__tests__/vocabulary-game.test.ts` | 17 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/lib/__tests__/writing-practice.test.ts` | 33 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/lib/api/__tests__/catalog.test.ts` | 114 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/lib/api/__tests__/integration.test.ts` | 146 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/lib/api/__tests__/pk-bridge.test.ts` | 123 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/lib/api/__tests__/pk-route.test.ts` | 31 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/lib/api/__tests__/question-adapter.test.ts` | 24 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/lib/api/__tests__/server-auth.test.ts` | 36 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/lib/api/__tests__/study-endpoints.test.ts` | 41 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/lib/api/__tests__/validation-errors.test.ts` | 51 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/lib/api/catalog.ts` | 107 | **GIỮ** | Cache request, bucket HSK và toàn bộ từ bài học; đo request trước đổi thuật toán. |
| `src/lib/api/client.ts` | 123 | **GIỮ** | Một ApiError và ánh xạ lỗi/transport; chưa cần helper file mới. |
| `src/lib/api/config.ts` | 33 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/lib/api/generated/learning-contract.ts` | 145 | **TYPE** | Contract TypeScript đang dùng; giữ cùng domain, cập nhật khi API đổi, không còn script sync. |
| `src/lib/api/learning.ts` | 294 | **TÁCH** | Loader testForTaking sang server attempts; hồ sơ/activity giữ (§10). |
| `src/lib/api/pk-bridge.ts` | 108 | **GIỮ** | Socket theo request; stream/ACK cleanup; giữ tương thích Vercel. |
| `src/lib/api/question-adapter.ts` | 37 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/lib/api/server.ts` | 62 | **GIỮ** | Auth/cookie server-only; cache theo request, private no-store. |
| `src/lib/api/session.ts` | 44 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/lib/api/types.ts` | 178 | **TYPE** | Giữ type theo domain; dùng import type, không suy ra là file thừa. |
| `src/lib/api/vocabulary-actions.ts` | 38 | **CŨ** | Server Actions từ vựng đã chuyển khỏi route; giữ hành vi, cập nhật import; cụm UI cũ chưa được route dùng. |
| `src/lib/attempt-routes.ts` | 65 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/lib/audio-wav.ts` | 26 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/lib/auth/current-user.ts` | 4 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/lib/auth/google.ts` | 26 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/lib/auth/login-destination.ts` | 13 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/lib/auth/require-onboarding.ts` | 8 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/lib/catalog-query.ts` | 48 | **GIỮ** | Một chuẩn page/filter/HSK ưu tiên, 9 mục danh mục. |
| `src/lib/celebration.ts` | 13 | **GIỮ** | Confetti đã import động và reduced motion; tái sử dụng. |
| `src/lib/daily-checkin.ts` | 22 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/lib/exam-timing.ts` | 14 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/lib/hanzi-data.ts` | 96 | **GIỮ** | CDN pinned/cache/dedupe/retry; không tải JSON vào repo. |
| `src/lib/hanzi-render-target.ts` | 65 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/lib/hsk-promotion.ts` | 6 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/lib/hsk.ts` | 19 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/lib/learning-history.ts` | 75 | **GIỮ** | Query/snapshot/format lịch sử; không sao chép adapter options. |
| `src/lib/learning-scores.ts` | 20 | **GIỮ** | Contract + timestamp invalidation; không store điểm client song song. |
| `src/lib/navigation-protection.ts` | 133 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/lib/navigation.ts` | 25 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/lib/practice-audio.ts` | 66 | **GIỮ** | Nhóm kỹ năng/passage/audio một lần; không duplicate player. |
| `src/lib/practice-scoring.ts` | 115 | **GIỮ** | Chuẩn hóa/chấm hiện có; không thêm bản chấm điểm mới. |
| `src/lib/toast.tsx` | 99 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/lib/topic-catalog.ts` | 33 | **GIỮ** | Sort tự nhiên và pagination dùng chung hiện có. |
| `src/lib/user-display.ts` | 5 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/lib/utils.ts` | 6 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/lib/validations/__tests__/auth.test.ts` | 29 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/lib/validations/__tests__/input-feedback.test.tsx` | 69 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/lib/validations/__tests__/profile.test.ts` | 108 | **TEST** | Giữ ca hành vi/contract hiện có; cập nhật import khi module liên quan di chuyển. |
| `src/lib/validations/assessment.ts` | 35 | **GIỮ** | Schema/feedback theo domain; không nhân đôi validation khi tách UI. |
| `src/lib/validations/auth.ts` | 37 | **GIỮ** | Schema/feedback theo domain; không nhân đôi validation khi tách UI. |
| `src/lib/validations/course.ts` | 18 | **CŨ** | Chưa được đồ thị route import runtime; không tách/xóa hay khôi phục tự động. |
| `src/lib/validations/files.ts` | 18 | **GIỮ** | Schema/feedback theo domain; không nhân đôi validation khi tách UI. |
| `src/lib/validations/form-errors.ts` | 25 | **GIỮ** | Schema/feedback theo domain; không nhân đôi validation khi tách UI. |
| `src/lib/validations/profile.ts` | 30 | **GIỮ** | Schema/feedback theo domain; không nhân đôi validation khi tách UI. |
| `src/lib/validations/support.ts` | 7 | **GIỮ** | Schema/feedback theo domain; không nhân đôi validation khi tách UI. |
| `src/lib/vocabulary-game.ts` | 11 | **CŨ** | Chưa được đồ thị route import runtime; không tách/xóa hay khôi phục tự động. |
| `src/lib/writing-practice.ts` | 30 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |

### Middleware, style và type

| File | Dòng | Quyết định | Nội dung |
| --- | ---: | --- | --- |
| `src/middleware.ts` | 97 | **GIỮ** | Trách nhiệm hiện gắn kết; giữ tại chỗ, cập nhật import nếu consumer liên quan thay đổi. |
| `src/styles/tokens.css` | 113 | **GIỮ** | Token palette/theme chung, không tạo bộ màu khác. |
| `src/types/assessment.ts` | 93 | **TYPE** | Giữ type theo domain; dùng import type, không suy ra là file thừa. |
| `src/types/community.ts` | 19 | **TYPE** | Giữ type theo domain; dùng import type, không suy ra là file thừa. |
| `src/types/courses.ts` | 63 | **TYPE** | Giữ type theo domain; dùng import type, không suy ra là file thừa. |
| `src/types/gamification.ts` | 36 | **TYPE** | Giữ type theo domain; dùng import type, không suy ra là file thừa. |
| `src/types/pk.ts` | 50 | **GIỮ** | Có Zod parser/command/message runtime và storage key; không phải chỉ file type. |
| `src/types/profile.ts` | 23 | **TYPE** | Giữ type theo domain; dùng import type, không suy ra là file thừa. |
| `src/types/vocab.ts` | 25 | **TYPE** | Giữ type theo domain; dùng import type, không suy ra là file thừa. |

### Cấu hình và tài liệu gốc được đối chiếu thêm

| File | Quyết định |
| --- | --- |
| `package.json`, `package-lock.json` | Giữ bộ version/dependency hiện có; lock dùng đối chiếu phiên bản, không rà thư viện bên trong như source ứng dụng |
| `next.config.mjs` | Giữ websocket externals, auth headers và giới hạn Server Actions; chưa thay framework/config để che lỗi |
| `tsconfig.json`, `tsconfig.typecheck.json`, `next-env.d.ts` | Giữ strict, alias, kiểm tra riêng source; `next-env` do Next quản lý |
| `tailwind.config.ts`, `postcss.config.mjs` | Giữ màu theo token và danh sách animation/class; không bỏ keyframe chỉ vì search JSX không thấy |
| `jest.config.js`, `.eslintrc.json` | Giữ gate, mở coverage cho phần logic chuyển đến khi cần; không hạ ngưỡng để test xanh |
| `.github/workflows/frontend.yml` | Giữ CI chạy trực tiếp các lệnh npm lint/typecheck/coverage/build; không phụ thuộc script đồng bộ |
| `.gitignore` | Không đưa cache/build/env/coverage vào thay đổi source |
| `README.md`, `DESIGN-PATTERNS.md` | Cập nhật mô tả kiến trúc sau khi triển khai thật; không ghi trước phần chưa xây |

## 16. Tiêu chí hoàn thành đợt triển khai sau

- Các file cần tách có trách nhiệm rõ và đường import một chiều; số module mới có lý do, không có một rừng wrapper/helper nhỏ.
- Source dễ đọc sau format, giữ custom components/folder hiện có; các thay đổi chỉ phục vụ bảo trì được ghi đúng là bảo trì.
- UI/route/submit/ghi âm/nét viết/PK/history/điểm danh/nâng HSK không hồi quy; dữ liệu tài khoản và token vẫn ở đúng boundary.
- Có kết quả đo trước/sau trên cùng điều kiện, phân biệt cold dev/warm dev/production; không suy tốc độ từ số dòng hoặc log ví dụ.
- Gate và smoke liên quan đạt; không chỉnh backend, DB, admin hay Android chỉ vì chia code frontend.

Lựa chọn khởi đầu hợp lý nhất sau khi chấp nhận plan là **Bước 0 rồi Bước 1**, chưa động đồng thời bài làm và PK. Tách cấu trúc và tối ưu thực thi là hai thay đổi có thể kiểm chứng riêng.
