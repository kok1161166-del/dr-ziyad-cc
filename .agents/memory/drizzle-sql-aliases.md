---
name: Drizzle SQL join aliases
description: How to correctly write SQL template literals in Drizzle ORM when joining tables
---

## Rule
When using `sql\`...\`` template literals in Drizzle ORM queries that involve JOINs, always use Drizzle column references (e.g., `${paymentsTable.amount}`) NOT raw SQL table aliases (e.g., `p.amount`).

**Why:** Drizzle ORM does not create SQL aliases like `p` for table references. The generated SQL uses the full table name. Using `p.amount` causes a PostgreSQL "column p.amount does not exist" error.

**How to apply:**
```typescript
// WRONG - causes SQL error with JOINs
sql`coalesce(sum(p.amount), 0)::float`

// CORRECT - use Drizzle column reference
sql`coalesce(sum(${paymentsTable.amount}), 0)::float`
```
