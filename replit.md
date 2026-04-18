# Thông tin workspace

## Tổng quan

Đây là monorepo dùng `pnpm workspace` và TypeScript. Mỗi package quản lý vai trò riêng nhưng cùng chia sẻ một quy trình build và typecheck thống nhất.

## Stack chính

- Công cụ monorepo: pnpm workspaces
- Node.js: 24
- Trình quản lý package: pnpm
- TypeScript: 5.9
- API framework: Express 5
- Cơ sở dữ liệu: PostgreSQL + Drizzle ORM
- Validation: Zod và drizzle-zod
- Codegen API: Orval từ OpenAPI spec
- Build backend: esbuild

## Lệnh quan trọng

- `corepack pnpm run typecheck`: chạy typecheck cho toàn bộ workspace
- `corepack pnpm build`: typecheck và build toàn bộ package
- `corepack pnpm --filter @workspace/api-spec run codegen`: generate lại React client và Zod schema từ OpenAPI
- `corepack pnpm --filter @workspace/db run push`: đẩy schema database ở môi trường dev
- `corepack pnpm --filter @workspace/api-server run dev`: chạy API server cục bộ

## Ghi chú

- Nhánh hiện tại đã loại bỏ phụ thuộc runtime của Replit ở các phần chính.
- Cấu hình OpenAI hiện đọc từ `.env`.
- Repo đã có sẵn tài liệu triển khai trong `README.md` và `DEPLOY-ARM64.md`.
