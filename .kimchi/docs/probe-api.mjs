import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const envFile = process.argv[2] || "../../.env";
const wrapperPath = path.resolve(__dirname, "start-api-with-env.mjs");
const logPath = path.resolve(__dirname, "api-probe.log");

// Optional: load env into parent process.env so any spawned children inherit it.
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

const logFile = fs.createWriteStream(logPath, { flags: "w" });

const child = spawn("node.exe", [wrapperPath, envFile], {
  cwd: rootDir,
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});

child.stdout.pipe(logFile);
child.stderr.pipe(logFile);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      return res;
    } catch {
      await sleep(250);
    }
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms`);
}

const endpoints = [
  "/api/healthz",
  "/api/dashboard/stats",
  "/api/dashboard/funnel",
  "/api/patients",
  "/api/settings/branches",
  "/api/settings/system",
  "/api/settings/tax",
  "/api/appointments",
  "/api/financial/summary",
  "/api/services",
  "/api/inventory",
];

try {
  const health = await waitForServer("http://localhost:8080/api/healthz");
  console.log("health:", health.status, await health.text());

  for (const ep of endpoints.slice(1)) {
    const res = await fetch(`http://localhost:8080${ep}`);
    const text = await res.text();
    console.log(`${ep}:`, res.status, text.slice(0, 500));
  }
} catch (err) {
  console.error("Probe failed:", err.message);
} finally {
  child.kill("SIGTERM");
  await sleep(1000);
  if (!child.killed) child.kill("SIGKILL");
  logFile.end();
  console.log("\n--- server log ---");
  console.log(fs.readFileSync(logPath, "utf8"));
}
