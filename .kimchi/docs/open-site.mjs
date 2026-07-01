import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const logDir = path.resolve(__dirname, "logs");
fs.mkdirSync(logDir, { recursive: true });

const apiLog = path.resolve(logDir, "api-open.log");
const clinicLog = path.resolve(logDir, "clinic-open.log");

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

function startDetached(cmd, args, logFile) {
  const outFd = fs.openSync(logFile, "w");
  const child = spawn(cmd, args, {
    cwd: rootDir,
    stdio: ["ignore", outFd, outFd],
    windowsHide: false,
    detached: true,
  });
  child.unref();
  return child;
}

async function main() {
  console.log("Starting API server in background...");
  const api = startDetached(
    "node.exe",
    [path.resolve(__dirname, "start-api-with-env.mjs"), "../../artifacts/api-server/.env"],
    apiLog,
  );

  try {
    await waitForUrl("http://localhost:8080/api/healthz", "API server", 60000);
    console.log("✅ API server ready");
  } catch (err) {
    console.error("❌ API server failed:", err.message);
    process.exit(1);
  }

  console.log("Starting frontend dev server in background...");
  const clinic = startDetached(
    "node.exe",
    [path.resolve(__dirname, "start-clinic-with-env.mjs")],
    clinicLog,
  );

  try {
    await waitForUrl("http://localhost:20964/", "Frontend dev server", 90000);
    console.log("✅ Frontend dev server ready");
  } catch (err) {
    console.error("❌ Frontend dev server failed:", err.message);
    process.exit(1);
  }

  console.log("Opening browser...");
  const browser = spawn("cmd.exe", ["/c", "start", "http://localhost:20964"], {
    cwd: rootDir,
    windowsHide: true,
    detached: false,
  });
  browser.unref();

  console.log("\n🚀 الموقع يعمل الآن على: http://localhost:20964");
  console.log("يمكنك فتح الرابط يدوياً إذا لم يفتح المتصفح تلقائياً.");
  console.log("\nلإيقاف الخدمات لاحقاً، شغّل: taskkill /F /IM node.exe");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
