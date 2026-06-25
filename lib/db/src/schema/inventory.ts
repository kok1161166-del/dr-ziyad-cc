import { pgTable, serial, text, numeric, boolean, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const inventoryItemsTable = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  barcode: text("barcode"),
  branch: text("branch").notNull(),
  name: text("name").notNull(),
  categoryId: integer("category_id"),
  quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull().default("0"),
  unit: text("unit").notNull().default("وحدة"),
  lowStockThreshold: numeric("low_stock_threshold", { precision: 10, scale: 3 }),
  expiryDate: date("expiry_date"),
  supplierName: text("supplier_name"),
  supplierContact: text("supplier_contact"),
  supplierAddress: text("supplier_address"),
  notifyLowStock: boolean("notify_low_stock").notNull().default(false),
  notifyExpiry: boolean("notify_expiry").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const inventoryTransactionsTable = pgTable("inventory_transactions", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull(),
  type: text("type").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
  note: text("note"),
  cost: numeric("cost", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const supplierDebtsTable = pgTable("supplier_debts", {
  id: serial("id").primaryKey(),
  supplierName: text("supplier_name").notNull(),
  itemName: text("item_name").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: date("due_date"),
  isPaid: boolean("is_paid").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InventoryItem = typeof inventoryItemsTable.$inferSelect;
export type InventoryTransaction = typeof inventoryTransactionsTable.$inferSelect;
export type SupplierDebt = typeof supplierDebtsTable.$inferSelect;
