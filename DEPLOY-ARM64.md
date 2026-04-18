# Triển khai trên VPS ARM64

Dự án đã được chuẩn hóa để không còn phụ thuộc vào runtime của Replit. Repo hiện có sẵn:

- `.env.production` cho mô hình chạy trực tiếp bằng Node.js + systemd
- `.env.production.docker` cho Docker Compose production
- `docker-compose.production.yml` cho stack production bằng Docker
- `deploy/nginx/content-audit-ai.conf` cho Nginx reverse proxy
- `deploy/systemd/content-audit-ai.service` cho systemd

Giá trị mẫu mặc định trong tài liệu:

- domain: `audit.example.com`
- thư mục ứng dụng: `/opt/content-audit-ai`
- cổng ứng dụng: `3000`

Hãy đổi lại các giá trị này trước khi triển khai thật.

## Cách 1: Docker

1. Cài `docker` và `docker compose` trên VPS ARM64.
2. Clone đúng nhánh cần deploy:

```bash
git clone --branch codex/remove-replit https://github.com/huynd94/Content-Audit-AI.git /opt/content-audit-ai
cd /opt/content-audit-ai
```

3. Sửa file env dành cho Docker:

```bash
nano .env.production.docker
```

4. Điền tối thiểu các biến sau trong `.env.production.docker`:

```bash
DATABASE_URL=postgresql://content_audit_ai:change-me@db:5432/content_audit_ai
OPENAI_API_KEY=sk-...
CORS_ORIGIN=https://audit.example.com
TRUST_PROXY=true
PORT=3000
```

5. Build và khởi động stack:

```bash
docker compose -f docker-compose.production.yml up -d --build
```

6. Nếu cần đẩy schema lên database:

```bash
docker compose -f docker-compose.production.yml exec app pnpm --filter @workspace/db run push
```

7. Kiểm tra trạng thái và log:

```bash
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs -f app
```

8. Đặt Nginx reverse proxy về `127.0.0.1:3000` bằng file `deploy/nginx/content-audit-ai.conf`, sau đó reload Nginx.

Trong mô hình này, backend sẽ phục vụ API và cả frontend đã build sẵn trên cùng cổng `3000`. Compose production chỉ bind cổng vào `127.0.0.1` để Nginx trên host là điểm truy cập duy nhất.

## Cách 2: Node.js trực tiếp

Yêu cầu:

- Node.js 24+
- Corepack hoặc pnpm 10+
- PostgreSQL 16+
- Nginx

Các bước cơ bản:

```bash
cp .env.production /opt/content-audit-ai/.env.production
corepack enable
pnpm install --frozen-lockfile
pnpm --filter @workspace/db run push
pnpm build
node --enable-source-maps artifacts/api-server/dist/index.mjs
```

Nếu chạy bằng `systemd`, không cần giữ tiến trình `node ...` thủ công. Dùng file `deploy/systemd/content-audit-ai.service`:

```bash
sudo cp deploy/systemd/content-audit-ai.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now content-audit-ai
sudo systemctl status content-audit-ai
```

Service này đọc biến môi trường từ `/opt/content-audit-ai/.env.production`.

## Biến môi trường chính

- `OPENAI_API_KEY`: bắt buộc. API key OpenAI dùng ở server.
- `OPENAI_BASE_URL`: tùy chọn. Chỉ dùng khi cần route qua gateway OpenAI-compatible.
- `OPENAI_MODEL`: mặc định là `gpt-5-mini`.
- `DATABASE_URL`: bắt buộc.
- `CORS_ORIGIN`: domain frontend được phép gọi API.
- `TRUST_PROXY`: nên đặt `true` khi chạy sau Nginx, Caddy hoặc Traefik.
- `PORT`: mặc định là `3000`.

## Reverse proxy với Nginx

Proxy ứng dụng về `http://127.0.0.1:3000` và bật TLS ở Nginx. Khi chạy production sau proxy, nên giữ `TRUST_PROXY=true` để rate limit và log lấy đúng IP client.

Các lệnh thường dùng:

```bash
sudo cp deploy/nginx/content-audit-ai.conf /etc/nginx/sites-available/content-audit-ai.conf
sudo ln -s /etc/nginx/sites-available/content-audit-ai.conf /etc/nginx/sites-enabled/content-audit-ai.conf
sudo nginx -t
sudo systemctl reload nginx
```

## Ghi chú build và vận hành

- Workspace không còn chặn `linux-arm64`, nên có thể `pnpm install` trên ARM64.
- Frontend không còn bắt buộc `BASE_PATH` hoặc `PORT` từ Replit để build.
- Nếu chạy dưới subpath, có thể set `BASE_PATH=/duong-dan-cua-ban` trước khi build frontend.
