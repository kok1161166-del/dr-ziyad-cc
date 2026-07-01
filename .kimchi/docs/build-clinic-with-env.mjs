import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

const envPath = path.resolve(rootDir, ".env");
if (fs.existsSync(envPath)) {
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
}

process.env.PORT = "20964";
process.env.BASE_PATH = "/";
process.env.API_SERVER_URL = process.env.API_SERVER_URL || "http://localhost:8080";

const child = spawn(
  "node.exe",
  ["C:\\Users\\MOH\\AppData\\Roaming\\npm\\node_modules\\pnpm\\bin\\pnpm.mjs", "--filter", "@workspace/clinic", "run", "build"],
  {
    cwd: rootDir,
    stdio: "inherit",
    windowsHide: true,
    env: process.env,
  },
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
