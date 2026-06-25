import { pgTable, serial, text, boolean, date, timestamp } from "drizzle-orm/pg-core";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  assignedTo: text("assigned_to"),
  priority: text("priority").notNull().default("normal"),
  isCompleted: boolean("is_completed").notNull().default(false),
  dueDate: date("due_date"),
  branch: text("branch"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Task = typeof tasksTable.$inferSelect;
