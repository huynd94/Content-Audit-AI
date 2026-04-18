# Deploy tren VPS ARM64

Ung dung da duoc chuan hoa de khong phu thuoc vao Replit runtime. Repo da kem san:

- `.env.production` cho deploy that tren may.
- `.env.production.docker` cho Docker Compose production.
- `docker-compose.production.yml` cho Docker production.
- `deploy/nginx/content-audit-ai.conf` cho Nginx reverse proxy.
- `deploy/systemd/content-audit-ai.service` cho `systemd`.

Mac dinh cac file mau dung:

- domain: `audit.example.com`
- thu muc app: `/opt/content-audit-ai`
- cong app: `3000`

Doi lai truoc khi deploy that.

## Cach 1: Docker

1. Cai `docker` va `docker compose` tren VPS ARM64.
2. Edit file env Docker:

```bash
nano .env.production.docker
```

3. Dien it nhat cac bien sau trong `.env.production.docker`:

```bash
DATABASE_URL=postgresql://content_audit_ai:change-me@db:5432/content_audit_ai
OPENAI_API_KEY=sk-...
CORS_ORIGIN=https://audit.example.com
TRUST_PROXY=true
PORT=3000
```

4. Build va chay:

```bash
docker compose -f docker-compose.production.yml up -d --build
```

5. Neu can day schema len database:

```bash
docker compose -f docker-compose.production.yml exec app pnpm --filter @workspace/db run push
```

6. Dat Nginx proxy vao `127.0.0.1:3000` bang file `deploy/nginx/content-audit-ai.conf`, sau do reload Nginx.

App backend se phuc vu API va file frontend build san tren cung cong `PORT`. Docker compose production map cong vao `127.0.0.1` de Nginx o host la diem vao duy nhat.

## Cach 2: Node.js truc tiep

Yeu cau:

- Node.js 24+
- Corepack hoac pnpm 10+
- Postgres 16+
- Nginx

Lenh cai va chay:

```bash
cp .env.production /opt/content-audit-ai/.env.production
corepack enable
pnpm install --frozen-lockfile
pnpm --filter @workspace/db run push
pnpm build
node --enable-source-maps artifacts/api-server/dist/index.mjs
```

Neu chay bang `systemd`, khong chay `node ...` thu cong. Dung file `deploy/systemd/content-audit-ai.service`:

```bash
sudo cp deploy/systemd/content-audit-ai.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now content-audit-ai
sudo systemctl status content-audit-ai
```

Service nay doc env tu `/opt/content-audit-ai/.env.production`.

## Bien moi truong chinh

- `OPENAI_API_KEY`: bat buoc. Server key duoc doc tu `.env`, khong con phu thuoc `AI_INTEGRATIONS_OPENAI_*`.
- `OPENAI_BASE_URL`: tuy chon. Dung khi can route qua OpenAI-compatible gateway.
- `OPENAI_MODEL`: mac dinh `gpt-5-mini`.
- `DATABASE_URL`: bat buoc.
- `CORS_ORIGIN`: domain frontend duoc phep goi API.
- `TRUST_PROXY`: dat `true` khi chay sau Nginx/Caddy/Traefik.
- `PORT`: mac dinh `3000`.

## Reverse proxy

Dat reverse proxy ve `http://127.0.0.1:3000` va bat TLS tai Nginx/Caddy. Khi proxy o production, giu `TRUST_PROXY=true` de rate limit va logging lay dung IP client.

Lenh gan dung cho Nginx:

```bash
sudo cp deploy/nginx/content-audit-ai.conf /etc/nginx/sites-available/content-audit-ai.conf
sudo ln -s /etc/nginx/sites-available/content-audit-ai.conf /etc/nginx/sites-enabled/content-audit-ai.conf
sudo nginx -t
sudo systemctl reload nginx
```

## Ghi chu build

- Workspace khong con khoa `linux-arm64`, nen co the `pnpm install` tren ARM64.
- Frontend khong con bat buoc `BASE_PATH` hay `PORT` tu Replit de build.
- Neu deploy duoi subpath, co the set `BASE_PATH=/your-subpath` truoc khi build frontend.
