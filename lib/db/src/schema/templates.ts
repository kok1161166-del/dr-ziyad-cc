import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const prescriptionTemplatesTable = pgTable("prescription_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  category: text("category"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const investigationTemplatesTable = pgTable("investigation_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull().default("labs"),
  tests: jsonb("tests").$type<string[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PrescriptionTemplate = typeof prescriptionTemplatesTable.$inferSelect;
export type InvestigationTemplate = typeof investigationTemplatesTable.$inferSelect;
