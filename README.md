# Content Audit AI

Ứng dụng kiểm duyệt nội dung bằng AI, cho phép gửi URL bài viết hoặc trang đích để phân tích theo từng nhóm tiêu chí nội dung.

README này phản ánh trạng thái hiện tại của nhánh `codex/remove-replit`, nơi dự án đã được tách khỏi các giả định runtime của Replit và chuyển sang mô hình cấu hình độc lập bằng `.env`.

## Tính năng chính

- Gửi URL cần kiểm duyệt theo danh mục nội dung.
- Tải nội dung trang, phân tích bằng OpenAI và lưu kết quả đánh giá.
- Xem lịch sử review với bộ lọc và ô tìm kiếm.
- Xem chi tiết lỗi, mức độ ưu tiên và hướng xử lý trong giao diện.
- Chạy như một monorepo pnpm chuẩn, không còn phụ thuộc OpenAI integration của Replit.
- Có sẵn đường triển khai trên VPS ARM64 bằng Docker hoặc Nginx + systemd.

## Cấu trúc monorepo

```text
.
|-- artifacts/
|   |-- api-server/         # API server Express
|   |-- content-reviewer/   # Frontend React + Vite
|   `-- mockup-sandbox/     # Khu vực thử nghiệm UI
|-- lib/
|   |-- api-client-react/   # React client được generate từ OpenAPI
|   |-- api-spec/           # OpenAPI source và cấu hình codegen
|   |-- api-zod/            # Contract Zod được generate
|   |-- db/                 # Truy cập DB và schema Drizzle
|   `-- integrations-openai-ai-server/
|                          # Adapter OpenAI dùng ở phía server
|-- deploy/
|   |-- nginx/
|   `-- systemd/
|-- Dockerfile
|-- docker-compose.production.yml
`-- DEPLOY-ARM64.md
```

## Công nghệ sử dụng

- Node.js 24
- pnpm workspaces
- TypeScript
- Express 5
- PostgreSQL + Drizzle ORM
- React + Vite + Tailwind CSS
- OpenAPI + Orval + Zod
- OpenAI API qua `OPENAI_API_KEY`

## Khởi động nhanh

### Yêu cầu

- Node.js 24+
- Corepack hoặc pnpm 10+
- PostgreSQL 16+

### Thiết lập cục bộ

```bash
corepack enable
corepack pnpm install --frozen-lockfile
cp .env.example .env
```

Điền tối thiểu các biến sau vào `.env`:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/content_audit_ai
OPENAI_API_KEY=sk-...
CORS_ORIGIN=http://localhost:5173
PORT=3000
```

Đẩy schema lên cơ sở dữ liệu và build toàn bộ workspace:

```bash
corepack pnpm --filter @workspace/db run push
corepack pnpm build
```

Chạy frontend và API ở hai terminal riêng:

```bash
corepack pnpm --filter @workspace/content-reviewer run dev
```

```bash
corepack pnpm --filter @workspace/api-server run dev
```

Cổng mặc định:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`

## Biến môi trường

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `DATABASE_URL` | Có | Chuỗi kết nối PostgreSQL |
| `OPENAI_API_KEY` | Có | API key OpenAI dùng ở server |
| `OPENAI_BASE_URL` | Không | Gateway OpenAI-compatible tùy chọn |
| `OPENAI_MODEL` | Không | Mặc định là `gpt-5-mini` |
| `CORS_ORIGIN` | Không | Danh sách origin frontend được phép gọi API, phân tách bằng dấu phẩy |
| `PORT` | Không | Cổng API server, mặc định `3000` |
| `TRUST_PROXY` | Không | Bật khi chạy sau Nginx, Caddy hoặc Traefik |
| `FETCH_CONTENT_TIMEOUT_MS` | Không | Timeout khi tải nội dung URL |
| `FETCH_CONTENT_MAX_ATTEMPTS` | Không | Số lần thử lại khi tải nội dung |
| `FETCH_CONTENT_MAX_CHARS` | Không | Số ký tự tối đa gửi vào bước phân tích |
| `RATE_LIMIT_WINDOW_MS` | Không | Cửa sổ thời gian rate limit tính theo mili giây |
| `CREATE_REVIEW_RATE_LIMIT_MAX` | Không | Số lần tạo review tối đa trong một cửa sổ |
| `ANALYZE_RATE_LIMIT_MAX` | Không | Số lần phân tích tối đa trong một cửa sổ |

## Lệnh quan trọng

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm run typecheck
corepack pnpm build
corepack pnpm --filter @workspace/api-spec run codegen
corepack pnpm --filter @workspace/db run push
corepack pnpm --filter @workspace/content-reviewer run dev
corepack pnpm --filter @workspace/api-server run dev
```

## Triển khai production

Nhánh này đã chuẩn bị sẵn hai hướng triển khai production.

### VPS + Docker từ nhánh `codex/remove-replit`

Triển khai mới trực tiếp từ nhánh này:

```bash
git clone --branch codex/remove-replit https://github.com/huynd94/Content-Audit-AI.git /opt/content-audit-ai
cd /opt/content-audit-ai
cp .env.production.docker .env.production.docker.local
```

Sửa `.env.production.docker.local` theo thông tin thực tế, sau đó áp dụng lại vào file mà Compose sử dụng:

```bash
cp .env.production.docker.local .env.production.docker
docker compose -f docker-compose.production.yml up -d --build
docker compose -f docker-compose.production.yml exec app pnpm --filter @workspace/db run push
```

Luồng triển khai khuyến nghị:

1. Clone nhánh `codex/remove-replit` vào `/opt/content-audit-ai`.
2. Cấu hình `OPENAI_API_KEY`, `CORS_ORIGIN` và thông tin database trong `.env.production.docker`.
3. Khởi động stack bằng `docker compose -f docker-compose.production.yml up -d --build`.
4. Đẩy schema bằng `pnpm --filter @workspace/db run push` bên trong container app.
5. Đặt Nginx trước `127.0.0.1:3000` bằng `deploy/nginx/content-audit-ai.conf`.

### Docker

- Sửa `.env.production.docker`
- Chạy `docker compose -f docker-compose.production.yml up -d --build`
- Chạy `docker compose -f docker-compose.production.yml exec app pnpm --filter @workspace/db run push`

### Nginx + systemd

- Sửa `.env.production`
- Dùng `deploy/systemd/content-audit-ai.service`
- Dùng `deploy/nginx/content-audit-ai.conf`

Chi tiết từng bước có trong [DEPLOY-ARM64.md](./DEPLOY-ARM64.md).

## Ghi chú bảo mật

- Backend hiện đọc thông tin OpenAI từ `.env`, không còn dùng biến tích hợp của Replit.
- Luồng phân tích URL có thêm chặn SSRF, kiểm tra host công khai và rate limit trong bộ nhớ.
- Nhánh này phù hợp với mô hình một operator tự vận hành. Chưa có xác thực người dùng cuối hoặc cơ chế BYOK đa tenant.

## Phạm vi của nhánh `codex/remove-replit`

Nhánh này tập trung vào:

- loại bỏ các giả định runtime gắn với Replit
- chuyển cấu hình OpenAI sang `.env`
- làm cho frontend, backend và build chạy được ngoài Replit
- mở đường cài đặt trên VPS ARM64
- cải thiện UX/UI cho luồng gửi review và xem kết quả

## Giấy phép

MIT
