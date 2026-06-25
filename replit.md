# العيادة - Clinic Management System

نظام إدارة عيادة طبية متكامل باللغة العربية (RTL) يغطي 10+ وحدات لإدارة العيادات الطبية.

## Run & Operate

- `PORT=8080 pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `PORT=20964 BASE_PATH=/ pnpm --filter @workspace/clinic run dev` — run the clinic frontend (port 20964)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed` — seed the database with sample data
- Required env: `DATABASE_URL` — Postgres connection string

## Workflows

- **API Server**: `PORT=8080 pnpm --filter @workspace/api-server run dev` — Express API on port 8080, proxied at `/api`
- **العيادة**: `PORT=20964 BASE_PATH=/ pnpm --filter @workspace/clinic run dev` — Vite React frontend on port 20964

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + Drizzle ORM + PostgreSQL
- Frontend: React + Vite + Shadcn/UI + Tajawal font + Arabic RTL
- Charts: Recharts
- Routing: Wouter
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `lib/db/src/schema/` — Drizzle ORM schema files (patients, appointments, financial, services, inventory, templates, users, settings)
- `lib/api-client-react/src/generated/api.ts` — Generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — Generated Zod schemas
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/clinic/src/pages/` — React pages (all 16 pages)
- `artifacts/clinic/src/components/layout/` — MainLayout, Sidebar, Navbar

## Modules

1. **لوحة التحكم** — Dashboard with KPI cards, daily funnel, danger zone
2. **المرضى** — Patient management (list, new, archived, patient file)
3. **الحجوزات** — Appointment queue with status management
4. **المالية** — Financial suite (summary, vaults, expenses, receivables)
5. **الخدمات** — Services & pricing management
6. **المخزون** — Inventory management + supplier debts
7. **التحليلات** — Analytics (patients, appointments, clinical)
8. **القوالب الطبية** — Medical templates (prescriptions, investigations)
9. **الصلاحيات** — Roles & users management
10. **الإعدادات** — System settings, tax, referral providers

## Architecture decisions

- Arabic RTL UI first — Tajawal font, `dir="rtl"` on HTML, logical CSS properties
- Contract-first API: OpenAPI spec → Orval codegen → Zod validation in routes
- Soft-delete for patients (isDeleted flag), permanent delete available
- Vaults track clinic cash; expenses auto-deduct from vault balance
- Visits auto-created when appointment status → completed/session_done
- Branches: فرع غزة, فرع خان يونس

## User preferences

- Deep navy blue theme (--primary: hsl(220 70% 25%))
- No emojis in UI
- Fully Arabic RTL — all labels in Arabic
- Doctor name: د. زياد أبو دقة
- Dense, information-rich UI like a medical cockpit

## Gotchas

- Always pass `PORT` env var when starting either service manually
- Run `pnpm --filter @workspace/db run push` after schema changes before seeding
- Run `pnpm --filter @workspace/api-spec run codegen` after OpenAPI spec changes
- The `payments` table is defined in `lib/db/src/schema/appointments.ts` (not financial.ts)
- Use Drizzle column references (not `p.amount` aliases) in SQL template literals for joins

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
