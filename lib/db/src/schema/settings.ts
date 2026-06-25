import { pgTable, serial, text, boolean, integer, numeric, timestamp } from "drizzle-orm/pg-core";

export const branchesTable = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const referralProvidersTable = pgTable("referral_providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  specialty: text("specialty"),
  phone: text("phone"),
  address: text("address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const taxSettingsTable = pgTable("tax_settings", {
  id: serial("id").primaryKey(),
  branch: text("branch").notNull().default("all"),
  taxType: text("tax_type").notNull().default("on_request"),
  taxTitle: text("tax_title").notNull().default("ضريبة القيمة المضافة"),
  taxPercentage: numeric("tax_percentage", { precision: 5, scale: 2 }).notNull().default("0"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const systemSettingsTable = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  activeBranch: text("active_branch").notNull().default("غزة"),
  appointmentOrder: text("appointment_order").notNull().default("by_time"),
  autoRefreshMinutes: integer("auto_refresh_minutes").notNull().default(10),
  displayBranch: text("display_branch"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Branch = typeof branchesTable.$inferSelect;
export type ReferralProvider = typeof referralProvidersTable.$inferSelect;
