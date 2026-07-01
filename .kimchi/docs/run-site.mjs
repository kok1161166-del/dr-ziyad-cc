import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const logDir = path.resolve(__dirname, "logs");
fs.mkdirSync(logDir, { recursive: true });

const apiLog = path.resolve(logDir, "api.log");
const clinicLog = path.resolve(logDir, "clinic.log");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForUrl(url, label, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return res;
    } catch {
      // ignore
    }
    await sleep(500);
  }
  throw new Error(`${label} did not become ready within ${timeoutMs}ms`);
}

function startProcess(cmd, args, logFile) {
  const logStream = fs.createWriteStream(logFile, { flags: "w" });
  const child = spawn(cmd, args, {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);
  return { child, logStream };
}

async function main() {
  console.log("Starting API server...");
  const api = startProcess(
    "node.exe",
    [path.resolve(__dirname, "start-api-with-env.mjs"), "../../artifacts/api-server/.env"],
    apiLog,
  );

  try {
    await waitForUrl("http://localhost:8080/api/healthz", "API server", 60000);
    console.log("✅ API server ready");
  } catch (err) {
    console.error("❌ API server failed to start:", err.message);
    api.child.kill("SIGTERM");
    api.logStream.end();
    process.exit(1);
  }

  console.log("Starting frontend dev server...");
  const clinic = startProcess(
    "node.exe",
    [path.resolve(__dirname, "start-clinic-with-env.mjs")],
    clinicLog,
  );

  try {
    await waitForUrl("http://localhost:20964/", "Frontend dev server", 90000);
    console.log("✅ Frontend dev server ready");
  } catch (err) {
    console.error("❌ Frontend dev server failed to start:", err.message);
    clinic.child.kill("SIGTERM");
    clinic.logStream.end();
    api.child.kill("SIGTERM");
    api.logStream.end();
    process.exit(1);
  }

  console.log("\nVerifying site functionality...");
  const checks = [
    ["Frontend index", "http://localhost:20964/"],
    ["Proxied API health", "http://localhost:20964/api/healthz"],
    ["Proxied dashboard stats", "http://localhost:20964/api/dashboard/stats"],
    ["Proxied patients", "http://localhost:20964/api/patients"],
  ];

  for (const [label, url] of checks) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      console.log(`${res.ok ? "✅" : "❌"} ${label}: HTTP ${res.status} (${text.length} bytes)`);
    } catch (err) {
      console.log(`❌ ${label}: ${err.message}`);
    }
  }

  console.log("\nStopping services...");
  clinic.child.kill("SIGTERM");
  api.child.kill("SIGTERM");
  await sleep(2000);
  if (!clinic.child.killed) clinic.child.kill("SIGKILL");
  if (!api.child.killed) api.child.kill("SIGKILL");
  clinic.logStream.end();
  api.logStream.end();

  console.log("\n--- API log tail ---");
  console.log(fs.readFileSync(apiLog, "utf8").slice(-2000));
  console.log("\n--- Frontend log tail ---");
  console.log(fs.readFileSync(clinicLog, "utf8").slice(-2000));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
