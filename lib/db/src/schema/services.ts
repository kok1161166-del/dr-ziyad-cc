import { pgTable, serial, text, numeric, boolean, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const serviceGroupsTable = pgTable("service_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("private"),
  validFrom: date("valid_from"),
  validTo: date("valid_to"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const servicesTable = pgTable("services", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id"),
  branch: text("branch").notNull(),
  name: text("name").notNull(),
  isVisible: boolean("is_visible").notNull().default(true),
  priceType: text("price_type").notNull().default("fixed"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  units: integer("units").notNull().default(1),
  patientFee: numeric("patient_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  durationMinutes: integer("duration_minutes"),
  usesConsumables: boolean("uses_consumables").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Service = typeof servicesTable.$inferSelect;
export type ServiceGroup = typeof serviceGroupsTable.$inferSelect;
