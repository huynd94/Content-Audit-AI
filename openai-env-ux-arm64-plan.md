# Kế hoạch OpenAI Env, UX và ARM64

## Mục tiêu

Thay phụ thuộc OpenAI integration của Replit bằng cấu hình `.env` tiêu chuẩn, nâng cấp UX/UI cho luồng audit nội dung, và làm cho dự án triển khai được trên VPS ARM64.

## Hạng mục công việc

- [x] Chuẩn hóa OpenAI client ở backend: đổi `AI_INTEGRATIONS_OPENAI_*` sang `OPENAI_API_KEY`, thêm `OPENAI_BASE_URL` tùy chọn, gom khởi tạo client vào một adapter duy nhất và bỏ thông điệp lỗi gắn với Replit.
- [x] Gia cố lớp bảo vệ backend: chặn SSRF cho URL analyze, thêm timeout và retry hợp lý, cấu hình CORS theo env và thêm rate limit cho `POST /api/reviews` cùng `POST /api/reviews/analyze`.
- [x] Tách model và token config ra env: thêm `OPENAI_MODEL`, `OPENAI_MAX_COMPLETION_TOKENS` và `.env.example`; xem `.env` là key của operator, không phải BYOK đa tenant.
- [x] Dọn phụ thuộc Replit ở frontend và build: bỏ bắt buộc `BASE_PATH` khi không cần, chuyển plugin Replit sang optional dev-only và loại bỏ giả định runtime chỉ đúng trên Replit.
- [x] Mở đường build trên ARM64: gỡ các override khóa `linux-arm64` trong `pnpm-workspace.yaml`, kiểm tra các native package còn lại và chuẩn hóa hướng dẫn build cho Ubuntu ARM64.
- [x] Cải thiện homepage theo hướng task-first UX: làm rõ hero, mô tả 3 bước, validate URL sớm, hiển thị tiến trình phân tích và làm CTA rõ ràng hơn.
- [x] Cải thiện history và detail theo hướng decision UX: thêm search và filter thật ở API, summary rõ hơn, grouping lỗi tốt hơn và loading state nhất quán hơn.
- [x] Chuẩn hóa deploy: thêm `Dockerfile`, `docker-compose.yml`, `docker-compose.production.yml`, file env mẫu, Nginx config, systemd service và tài liệu triển khai.

## Tiêu chí hoàn thành

- [x] Ứng dụng khởi động và phân tích nội dung bằng OpenAI key trong `.env`
- [x] Build và deploy không còn phụ thuộc Replit hoặc Linux x64
- [x] Luồng chính từ nhập URL đến xem kết quả mạch lạc hơn và ít thao tác thừa hơn

## Ghi chú triển khai

- Verification đã chạy với `corepack pnpm build` và pass toàn workspace.
- `OPENAI_BASE_URL` để trống nếu dùng OpenAI trực tiếp.
- Nếu triển khai bằng Docker production, dùng `.env.production.docker`.
- Nếu triển khai bằng Nginx + systemd trên host, dùng `.env.production`.
