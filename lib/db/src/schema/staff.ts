import { pgTable, serial, integer, text, numeric, date, jsonb, timestamp } from "drizzle-orm/pg-core";
import { systemUsersTable } from "./users";

export const staffDetailsTable = pgTable("staff_details", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => systemUsersTable.id, { onDelete: "cascade" }),
  position: text("position"),
  specialty: text("specialty"),
  phone: text("phone"),
  salary: numeric("salary", { precision: 12, scale: 2 }),
  joiningDate: date("joining_date"),
  workDays: jsonb("work_days").$type<string[]>().default([]),
  shiftStart: text("shift_start"),
  shiftEnd: text("shift_end"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type StaffDetails = typeof staffDetailsTable.$inferSelect;
