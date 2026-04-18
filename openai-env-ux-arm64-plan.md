# OpenAI Env, UX, ARM64 Plan

## Goal
Thay phụ thuộc Replit OpenAI integration bằng cấu hình `.env` chuẩn, nâng UX/UI cho luồng audit nội dung, và làm dự án deploy được trên VPS ARM64.

## Tasks
- [ ] Chuẩn hóa backend OpenAI client: đổi `AI_INTEGRATIONS_OPENAI_*` sang `OPENAI_API_KEY`, thêm `OPENAI_BASE_URL` tùy chọn, gom khởi tạo client vào một adapter duy nhất, và bỏ thông điệp lỗi phụ thuộc Replit. Verify: `artifacts/api-server/src/routes/reviews.ts` vẫn gọi được client mới và project typecheck pass.
- [ ] Gia cố lớp bảo vệ backend: chặn SSRF cho URL analyze, thêm timeout/retry hợp lý, giới hạn CORS theo env, và thêm rate limit cho `POST /api/reviews` + `POST /api/reviews/analyze`. Verify: request URL private/internal bị từ chối, health/check route vẫn hoạt động.
- [ ] Tách model/config ra env: thêm `OPENAI_MODEL`, `OPENAI_MAX_COMPLETION_TOKENS`, và `.env.example`; coi `.env` là key của operator, không phải BYOK đa tenant. Verify: app khởi động chỉ với `.env` + `DATABASE_URL` + `PORT` mà không cần Replit provisioning.
- [ ] Dọn phụ thuộc Replit ở frontend/build: bỏ bắt buộc `BASE_PATH` khi không cần, chuyển plugin Replit sang optional dev-only, và xóa các ghi chú/cấu hình runtime chỉ có ý nghĩa trên Replit. Verify: `pnpm build` chạy được trên môi trường Linux thường.
- [ ] Sửa readiness cho ARM64: gỡ các override khóa `linux-arm64` trong `pnpm-workspace.yaml`, kiểm tra các native package còn lại, và thêm hướng dẫn build/runtime cho Ubuntu ARM64. Verify: dependency resolution không còn chặn `esbuild`, `rollup`, `tailwindcss oxide` trên ARM64.
- [ ] Cải thiện homepage theo task-first UX: thêm hero ngắn, giải thích 3 bước, validate URL sớm, preview domain, trạng thái phân tích theo step, và CTA rõ hơn. Verify: người dùng mới có thể hiểu luồng trong một màn hình mà không cần thử sai.
- [ ] Cải thiện history/detail theo decision UX: thêm search/filter thực sự ở API, summary sticky, quick actions, severity grouping rõ hơn, và skeleton/loading/error states nhất quán. Verify: recent reviews không tải toàn bộ dữ liệu và detail page dễ quét vấn đề hơn.
- [ ] Chuẩn hóa vận hành deploy: thêm `Dockerfile`, `docker-compose.yml` hoặc hướng dẫn `systemd + nginx`, cùng biến môi trường tối thiểu và lệnh migrate/start. Verify: có một runbook đủ để dựng app mới trên VPS mà không cần Replit.

## Done When
- [ ] Ứng dụng khởi động và phân tích nội dung bằng OpenAI key trong `.env`.
- [ ] Build/deploy không còn phụ thuộc Replit hoặc Linux x64.
- [ ] Luồng chính từ nhập URL đến xem kết quả mạch lạc hơn, ít thao tác thừa hơn.
