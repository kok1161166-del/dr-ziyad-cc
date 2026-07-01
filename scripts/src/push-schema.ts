import { pool } from "@workspace/db";
import fs from "fs";
import path from "path";

const sqlPath = path.resolve(import.meta.dirname, "../../clinic_schema.sql");
const sql = fs.readFileSync(sqlPath, "utf-8");

async function main() {
  console.log("🚀 Pushing schema to database...");
  try {
    await pool.query(sql);
    console.log("✅ Schema pushed successfully!");
  } catch (err) {
    console.error("❌ Error pushing schema:", err);
  }
  await pool.end();
}

main();
