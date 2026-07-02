import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const esbuildPkg = path.join(rootDir, "artifacts/api-server/node_modules/esbuild/package.json");
const require = createRequire(esbuildPkg);
const { build } = require("esbuild");

const banner = [
  'import { createRequire as __bannerCrReq } from "node:module";',
  'import __bannerPath from "node:path";',
  'import __bannerUrl from "node:url";',
  "globalThis.require = __bannerCrReq(import.meta.url);",
  "globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);",
  "globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);",
].join("");

build({
  entryPoints: [path.join(rootDir, "artifacts/api-server/src/app.ts")],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  banner: { js: banner },
  outfile: path.join(rootDir, ".vercel/output/functions/api.func/index.mjs"),
  external: [
    "sharp", "better-sqlite3", "sqlite3", "canvas", "bcrypt", "argon2",
    "fsevents", "re2", "farmhash", "xxhash-addon", "bufferutil",
    "utf-8-validate", "ssh2", "cpu-features", "dtrace-provider",
    "isolated-vm", "lightningcss", "pg-native", "oracledb",
    "mongodb-client-encryption", "nodemailer", "handlebars", "knex",
    "typeorm", "protobufjs", "onnxruntime-node",
    "@tensorflow/*", "@prisma/client", "@mikro-orm/*", "@grpc/*",
    "@swc/*", "@aws-sdk/*", "@azure/*", "@opentelemetry/*",
    "@google-cloud/*", "@google/*", "googleapis", "firebase-admin",
    "@parcel/watcher", "@sentry/profiling-node", "@tree-sitter/*",
    "aws-sdk", "classic-level", "dd-trace", "ffi-napi", "grpc",
    "hiredis", "kerberos", "leveldown", "miniflare", "mysql2",
    "newrelic", "odbc", "piscina", "realm", "ref-napi", "rocksdb",
    "sass-embedded", "sequelize", "serialport", "snappy", "tinypool",
    "usb", "workerd", "wrangler", "zeromq", "zeromq-prebuilt",
    "playwright", "puppeteer", "puppeteer-core", "electron",
  ],
}).then(() => console.log("✅ esbuild bundle complete"))
  .catch(err => { console.error(err); process.exit(1); });
