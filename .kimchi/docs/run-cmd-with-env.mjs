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

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node run-cmd-with-env.mjs <command> [args...]");
  process.exit(1);
}

const [cmd, ...cmdArgs] = args;
const child = spawn(cmd, cmdArgs, {
  cwd: rootDir,
  stdio: "inherit",
  windowsHide: true,
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
