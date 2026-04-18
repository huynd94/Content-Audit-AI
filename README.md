# Content Audit AI

Ứng dụng kiểm duyệt landing page bằng AI theo từng danh mục sản phẩm. Người dùng nhập URL, chọn danh mục, hệ thống sẽ phân tích nội dung theo đúng checklist của danh mục đó và trả về điểm `SEO`, `Ads`, `Shopping`, `GDN`, `Tổng thể` cùng danh sách lỗi và hướng sửa.

## 1. Ứng dụng này dùng để làm gì?

Ứng dụng phù hợp khi bạn cần:

- kiểm tra một landing page trước khi chạy quảng cáo
- rà nội dung theo từng nhóm sản phẩm như mỹ phẩm, thực phẩm chức năng, máy massage
- xem vấn đề nào cần sửa trước
- lưu lịch sử kiểm duyệt để đối chiếu sau này

Luồng làm việc:

1. Nhập URL bài viết hoặc landing page.
2. Chọn danh mục sản phẩm.
3. AI kiểm duyệt theo đúng tiêu chí của danh mục đã chọn.
4. Xem báo cáo và danh sách việc cần sửa.

## 2. Thành phần chính

- `artifacts/content-reviewer`: giao diện người dùng
- `artifacts/api-server`: API backend
- `lib/db`: PostgreSQL + Drizzle
- `docker-compose.yml`: chạy bằng Docker ở máy local
- `docker-compose.production.yml`: chạy bằng Docker trên VPS

## 3. Yêu cầu tối thiểu

### Cách A: Chạy bằng Docker

- Docker
- Docker Compose

### Cách B: Cài thông thường

- Node.js `24+`
- Corepack hoặc `pnpm`
- PostgreSQL `16+`

## 4. Biến môi trường quan trọng

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `DATABASE_URL` | Có | Chuỗi kết nối PostgreSQL |
| `OPENAI_API_KEY` | Có | API key OpenAI dùng ở server |
| `OPENAI_BASE_URL` | Không | Chỉ dùng khi đi qua gateway OpenAI-compatible |
| `OPENAI_MODEL` | Không | Mặc định `gpt-5-mini` |
| `CORS_ORIGIN` | Không | Domain frontend được phép gọi API |
| `PORT` | Không | Cổng API, mặc định `3000` |
| `TRUST_PROXY` | Không | Đặt `true` nếu chạy sau Nginx |

## 5. Cài ở máy local bằng Docker

Đây là cách đơn giản nhất nếu máy đã có Docker.

### Bước 1: Clone repo

```bash
git clone https://github.com/huynd94/Content-Audit-AI.git
cd Content-Audit-AI
```

### Bước 2: Tạo file `.env`

```bash
cp .env.example .env
```

Sửa các giá trị tối thiểu:

```env
NODE_ENV=production
PORT=3000
TRUST_PROXY=false
CORS_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@db:5432/content_audit_ai
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=
OPENAI_MODEL=gpt-5-mini
```

Lưu ý:

- Khi chạy Docker local bằng `docker-compose.yml`, `DATABASE_URL` phải dùng host `db`
- Không dùng `127.0.0.1:5432` trong container `app`

### Bước 3: Khởi động

```bash
docker compose up -d --build
```

### Bước 4: Đẩy schema database

```bash
docker compose exec app pnpm --filter @workspace/db run push
```

### Bước 5: Mở ứng dụng

Mở trình duyệt:

```text
http://localhost:3000
```

### Bước 6: Kiểm tra log khi có lỗi

```bash
docker compose ps
docker compose logs --tail=200 app
docker compose logs --tail=200 db
```

## 6. Cài ở máy local theo cách thông thường

Cách này phù hợp khi bạn muốn chạy frontend và backend riêng để phát triển.

### Bước 1: Clone repo

```bash
git clone https://github.com/huynd94/Content-Audit-AI.git
cd Content-Audit-AI
```

### Bước 2: Cài dependency

```bash
corepack enable
corepack pnpm install --frozen-lockfile
```

### Bước 3: Tạo file `.env`

```bash
cp .env.example .env
```

Ví dụ:

```env
NODE_ENV=production
PORT=3000
TRUST_PROXY=false
CORS_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/content_audit_ai
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=
OPENAI_MODEL=gpt-5-mini
```

Lưu ý:

- Với cách cài thông thường, `DATABASE_URL` thường dùng `127.0.0.1`
- Khác với Docker, lúc này database chạy trên máy host thật

### Bước 4: Đẩy schema

```bash
corepack pnpm --filter @workspace/db run push
```

### Bước 5: Chạy backend

```bash
corepack pnpm --filter @workspace/api-server run dev
```

### Bước 6: Chạy frontend

Mở terminal khác:

```bash
corepack pnpm --filter @workspace/content-reviewer run dev
```

### Bước 7: Mở ứng dụng

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`

## 7. Deploy VPS bằng Docker Compose

Đây là cách khuyến nghị nếu bạn muốn chạy ổn định trên VPS.

### Bước 1: Chuẩn bị VPS

Cài sẵn:

- Docker
- Docker Compose
- Git

### Bước 2: Clone repo

```bash
git clone --branch codex/remove-replit https://github.com/huynd94/Content-Audit-AI.git /opt/content-audit-ai
cd /opt/content-audit-ai
```

### Bước 3: Chuẩn bị file env cho Docker

```bash
cp .env.production.docker .env.production.docker.local
nano .env.production.docker.local
```

Ví dụ tối thiểu:

```env
NODE_ENV=production
PORT=3000
TRUST_PROXY=true
CORS_ORIGIN=https://ten-mien-cua-ban.com
DATABASE_URL=postgresql://content_audit_ai:change-me@db:5432/content_audit_ai
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=
OPENAI_MODEL=gpt-5-mini
```

Sau khi sửa xong:

```bash
cp .env.production.docker.local .env.production.docker
```

Lưu ý rất quan trọng:

- Trên VPS chạy Docker Compose, `DATABASE_URL` phải dùng `@db:5432`
- Nếu dùng `@127.0.0.1:5432`, container `app` sẽ không kết nối được database

### Bước 4: Khởi động

```bash
docker compose -f docker-compose.production.yml up -d --build
```

### Bước 5: Đẩy schema

```bash
docker compose -f docker-compose.production.yml exec app pnpm --filter @workspace/db run push
```

### Bước 6: Kiểm tra

```bash
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs --tail=200 app
docker compose -f docker-compose.production.yml logs --tail=200 db
```

### Bước 7: Test API từ VPS

```bash
curl -i http://127.0.0.1:3000/api/categories
curl -i "http://127.0.0.1:3000/api/reviews?limit=1"
curl -i http://127.0.0.1:3000/api/reviews/stats
```

Nếu 3 API trên trả `200`, ứng dụng thường đã chạy đúng.

## 8. Deploy VPS theo cách cài thông thường

Cách này dành cho người muốn tự quản lý Node.js và PostgreSQL trên VPS.

### Bước 1: Cài phần mềm cần thiết

- Node.js `24+`
- Corepack hoặc `pnpm`
- PostgreSQL `16+`
- Git
- Nginx nếu muốn public qua domain

### Bước 2: Clone repo

```bash
git clone --branch codex/remove-replit https://github.com/huynd94/Content-Audit-AI.git /opt/content-audit-ai
cd /opt/content-audit-ai
```

### Bước 3: Cài dependency

```bash
corepack enable
corepack pnpm install --frozen-lockfile
```

### Bước 4: Tạo file env

```bash
cp .env.production .env
nano .env
```

Ví dụ:

```env
NODE_ENV=production
PORT=3000
TRUST_PROXY=true
CORS_ORIGIN=https://ten-mien-cua-ban.com
DATABASE_URL=postgresql://content_audit_ai:change-me@127.0.0.1:5432/content_audit_ai
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=
OPENAI_MODEL=gpt-5-mini
```

Lưu ý:

- Với cách cài thông thường trên VPS, dùng `127.0.0.1:5432` nếu PostgreSQL cài cùng máy

### Bước 5: Đẩy schema và build

```bash
corepack pnpm --filter @workspace/db run push
corepack pnpm build
```

### Bước 6: Chạy ứng dụng

```bash
node --enable-source-maps artifacts/api-server/dist/index.mjs
```

Nếu muốn giữ tiến trình chạy nền, nên dùng `systemd` hoặc `pm2`.

## 9. Cách cập nhật phiên bản mới

### Docker Compose

```bash
git pull
docker compose -f docker-compose.production.yml up -d --build
docker compose -f docker-compose.production.yml exec app pnpm --filter @workspace/db run push
```

### Cài thông thường

```bash
git pull
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @workspace/db run push
corepack pnpm build
```

## 10. Xử lý lỗi nhanh

### Lỗi `HTTP 500` ở `/api/categories`, `/api/reviews`, `/api/reviews/stats`

Kiểm tra:

```bash
docker compose -f docker-compose.production.yml logs --tail=200 app
```

Nếu thấy:

```text
connect ECONNREFUSED 127.0.0.1:5432
```

thì `DATABASE_URL` đang sai.

### Nếu chạy Docker

Phải sửa thành:

```env
DATABASE_URL=postgresql://content_audit_ai:change-me@db:5432/content_audit_ai
```

Rồi chạy lại:

```bash
docker compose -f docker-compose.production.yml up -d --build --force-recreate app
```

### Nếu app báo `unhealthy`

Kiểm tra:

```bash
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs --tail=200 app
docker compose -f docker-compose.production.yml logs --tail=200 db
```

Nguyên nhân thường gặp:

- sai `DATABASE_URL`
- chưa chạy `pnpm --filter @workspace/db run push`
- `OPENAI_API_KEY` thiếu hoặc sai

### Kiểm tra app có đang thấy đúng env hay không

```bash
docker compose -f docker-compose.production.yml exec app printenv DATABASE_URL
```

## 11. Build và kiểm tra code

```bash
corepack pnpm run typecheck
corepack pnpm build
```

## 12. Giấy phép

MIT
