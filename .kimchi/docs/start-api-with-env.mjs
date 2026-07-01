import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envFile = process.argv[2] || "../../.env";
const envPath = path.resolve(__dirname, envFile);
const envContent = fs.readFileSync(envPath, "utf8");

for (const line of envContent.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const value = trimmed.slice(idx + 1).trim();
  process.env[key] = value;
}

await import(pathToFileURL(path.resolve(__dirname, "../../artifacts/api-server/dist/index.mjs")).href);
