import { pgTable, serial, text, boolean, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const rolesTable = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  permissions: jsonb("permissions").$type<Record<string, boolean>>().notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const systemUsersTable = pgTable("system_users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  email: text("email"),
  roleId: integer("role_id").notNull(),
  branch: text("branch"),
  isFrozen: boolean("is_frozen").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Role = typeof rolesTable.$inferSelect;
export type SystemUser = typeof systemUsersTable.$inferSelect;
