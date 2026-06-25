import { pgTable, serial, text, integer, boolean, timestamp, jsonb, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const patientsTable = pgTable("patients", {
  id: serial("id").primaryKey(),
  localCode: integer("local_code").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  gender: text("gender").notNull(),
  dateOfBirth: date("date_of_birth"),
  phones: jsonb("phones").$type<Array<{ number: string; owner?: string }>>().default([]),
  homePhone: text("home_phone"),
  maritalStatus: text("marital_status"),
  nationality: text("nationality").default("فلسطين"),
  address: text("address"),
  governorate: text("governorate"),
  birthPlace: text("birth_place"),
  occupation: text("occupation"),
  email: text("email"),
  insuranceStatus: text("insurance_status"),
  referredBy: text("referred_by"),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPatientSchema = createInsertSchema(patientsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patientsTable.$inferSelect;
