---
name: Clinic system architecture
description: Key configuration and quirks for the العيادة clinic management system
---

## PORT env var required
Both services require PORT at startup:
- API Server: `PORT=8080 pnpm --filter @workspace/api-server run dev`
- Clinic Frontend: `PORT=20964 BASE_PATH=/ pnpm --filter @workspace/clinic run dev`
Workflows must include these env vars inline in the command.

**Why:** The express app and vite config both throw if PORT is missing.

**How to apply:** Any time you restart or configure these workflows, include the PORT env var.

## Schema layout
- `paymentsTable` is in `lib/db/src/schema/appointments.ts` (not financial.ts)
- All schema files exported from `lib/db/src/schema/index.ts`

## Seed
Run `pnpm --filter @workspace/scripts run seed` to seed sample data. The seed uses `onConflictDoNothing()` so it's safe to re-run.

## Branches
Two branches: فرع غزة, فرع خان يونس. Doctor name: د. زياد أبو دقة
