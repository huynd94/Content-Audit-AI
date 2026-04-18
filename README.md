# Content Audit AI

AI-powered content audit application for reviewing page URLs against category-specific guidelines.

This README reflects the current `codex/remove-replit` branch, where the project has been converted from Replit-specific runtime assumptions to a standalone `.env`-driven deployment model.

## Features

- Submit a page URL for audit by content category.
- Fetch page content, analyze it with OpenAI, and store the review result.
- Browse review history with filtering and search.
- Inspect detailed findings and remediation priorities in the UI.
- Run as a standard pnpm monorepo without Replit-only OpenAI bindings.
- Deploy to a VPS ARM64 using either Docker or Nginx + systemd.

## Monorepo Layout

```text
.
|-- artifacts/
|   |-- api-server/         # Express API server
|   |-- content-reviewer/   # React + Vite frontend
|   `-- mockup-sandbox/     # UI sandbox
|-- lib/
|   |-- api-client-react/   # generated React API client
|   |-- api-spec/           # OpenAPI source + codegen config
|   |-- api-zod/            # generated Zod contracts
|   |-- db/                 # Drizzle schema + DB access
|   `-- integrations-openai-ai-server/
|                          # shared OpenAI server adapter
|-- deploy/
|   |-- nginx/
|   `-- systemd/
|-- Dockerfile
|-- docker-compose.production.yml
`-- DEPLOY-ARM64.md
```

## Stack

- Node.js 24
- pnpm workspaces
- TypeScript
- Express 5
- PostgreSQL + Drizzle ORM
- React + Vite + Tailwind CSS
- OpenAPI + Orval + Zod
- OpenAI API via `OPENAI_API_KEY`

## Quick Start

### Prerequisites

- Node.js 24+
- Corepack or pnpm 10+
- PostgreSQL 16+

### Local Setup

```bash
corepack enable
corepack pnpm install --frozen-lockfile
cp .env.example .env
```

Fill at least these values in `.env`:

```bash
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/content_audit_ai
OPENAI_API_KEY=sk-...
CORS_ORIGIN=http://localhost:5173
PORT=3000
```

Push the schema and build the workspace:

```bash
corepack pnpm --filter @workspace/db run push
corepack pnpm build
```

Start the frontend and API in separate terminals:

```bash
corepack pnpm --filter @workspace/content-reviewer run dev
```

```bash
corepack pnpm --filter @workspace/api-server run dev
```

Default ports:

- Frontend: `http://localhost:5173`
- API: `http://localhost:3000`

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `OPENAI_API_KEY` | Yes | Server-side OpenAI API key |
| `OPENAI_BASE_URL` | No | Optional OpenAI-compatible gateway |
| `OPENAI_MODEL` | No | Defaults to `gpt-5-mini` |
| `CORS_ORIGIN` | No | Comma-separated allowed frontend origins |
| `PORT` | No | API server port, defaults to `3000` |
| `TRUST_PROXY` | No | Enable when running behind Nginx/Caddy/Traefik |
| `FETCH_CONTENT_TIMEOUT_MS` | No | URL fetch timeout |
| `FETCH_CONTENT_MAX_ATTEMPTS` | No | Retry count for content fetch |
| `FETCH_CONTENT_MAX_CHARS` | No | Max extracted content length sent to analysis |
| `RATE_LIMIT_WINDOW_MS` | No | Rate-limit window in milliseconds |
| `CREATE_REVIEW_RATE_LIMIT_MAX` | No | Max create-review requests per window |
| `ANALYZE_RATE_LIMIT_MAX` | No | Max analyze requests per window |

## Key Commands

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm run typecheck
corepack pnpm build
corepack pnpm --filter @workspace/api-spec run codegen
corepack pnpm --filter @workspace/db run push
corepack pnpm --filter @workspace/content-reviewer run dev
corepack pnpm --filter @workspace/api-server run dev
```

## Production Deployment

Two production flows are prepared in this branch:

### VPS + Docker from `codex/remove-replit`

For a fresh VPS deployment directly from this branch:

```bash
git clone --branch codex/remove-replit https://github.com/huynd94/Content-Audit-AI.git /opt/content-audit-ai
cd /opt/content-audit-ai
cp .env.production.docker .env.production.docker.local
```

Edit `.env.production.docker.local` with your real values, then point Compose to that file:

```bash
cp .env.production.docker.local .env.production.docker
docker compose -f docker-compose.production.yml up -d --build
docker compose -f docker-compose.production.yml exec app pnpm --filter @workspace/db run push
```

Recommended production flow:

1. Clone the `codex/remove-replit` branch into `/opt/content-audit-ai`.
2. Set `OPENAI_API_KEY`, `CORS_ORIGIN`, and Docker database credentials in `.env.production.docker`.
3. Start the stack with `docker compose -f docker-compose.production.yml up -d --build`.
4. Push the schema with `pnpm --filter @workspace/db run push` inside the app container.
5. Put Nginx in front of `127.0.0.1:3000` using `deploy/nginx/content-audit-ai.conf`.

### Docker

- Edit `.env.production.docker`
- Run `docker compose -f docker-compose.production.yml up -d --build`
- Run `docker compose -f docker-compose.production.yml exec app pnpm --filter @workspace/db run push`

### Nginx + systemd

- Edit `.env.production`
- Use `deploy/systemd/content-audit-ai.service`
- Use `deploy/nginx/content-audit-ai.conf`

Full deployment steps are documented in [DEPLOY-ARM64.md](./DEPLOY-ARM64.md).

## Security Notes

- The backend now reads OpenAI credentials from `.env` instead of Replit integration variables.
- URL analysis is guarded with SSRF checks, public-host validation, and in-memory rate limiting.
- This branch is prepared for single-operator deployment. It does not yet implement per-end-user BYOK storage or user authentication.

## Branch Notes

The `codex/remove-replit` branch focuses on:

- removing Replit-specific OpenAI runtime assumptions
- making Vite and backend startup portable outside Replit
- enabling ARM64-friendly install/build behavior
- improving the main UX/UI flow for review submission and result inspection

## License

MIT
