#!/bin/bash
set -e

echo "📦 Building API serverless function with esbuild..."
mkdir -p .vercel/output/functions/api.func

# Bundle app.ts into a single ESM file with all dependencies
BANNER="import { createRequire as __bannerCrReq } from 'node:module'; import __bannerPath from 'node:path'; import __bannerUrl from 'node:url'; globalThis.require = __bannerCrReq(import.meta.url); globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url); globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);"

npx esbuild artifacts/api-server/src/app.ts \
  --bundle \
  --platform=node \
  --target=node22 \
  --format=esm \
  --banner:js="$BANNER" \
  --outfile=.vercel/output/functions/api.func/index.mjs \
  --external:sharp \
  --external:better-sqlite3 \
  --external:sqlite3 \
  --external:canvas \
  --external:bcrypt \
  --external:argon2 \
  --external:fsevents \
  --external:re2 \
  --external:farmhash \
  --external:xxhash-addon \
  --external:bufferutil \
  --external:utf-8-validate \
  --external:ssh2 \
  --external:cpu-features \
  --external:dtrace-provider \
  --external:isolated-vm \
  --external:lightningcss \
  --external:pg-native \
  --external:oracledb \
  --external:mongodb-client-encryption \
  --external:nodemailer \
  --external:handlebars \
  --external:knex \
  --external:typeorm \
  --external:protobufjs \
  --external:onnxruntime-node \
  --external:@tensorflow/* \
  --external:@prisma/client \
  --external:@mikro-orm/* \
  --external:@grpc/* \
  --external:@swc/* \
  --external:@aws-sdk/* \
  --external:@azure/* \
  --external:@opentelemetry/* \
  --external:@google-cloud/* \
  --external:@google/* \
  --external:googleapis \
  --external:firebase-admin \
  --external:@parcel/watcher \
  --external:@sentry/profiling-node \
  --external:@tree-sitter/* \
  --external:aws-sdk \
  --external:classic-level \
  --external:dd-trace \
  --external:ffi-napi \
  --external:grpc \
  --external:hiredis \
  --external:kerberos \
  --external:leveldown \
  --external:miniflare \
  --external:mysql2 \
  --external:newrelic \
  --external:odbc \
  --external:piscina \
  --external:realm \
  --external:ref-napi \
  --external:rocksdb \
  --external:sass-embedded \
  --external:sequelize \
  --external:serialport \
  --external:snappy \
  --external:tinypool \
  --external:usb \
  --external:workerd \
  --external:wrangler \
  --external:zeromq \
  --external:zeromq-prebuilt \
  --external:playwright \
  --external:puppeteer \
  --external:puppeteer-core \
  --external:electron

echo "⚙️ Creating function config..."
cat > .vercel/output/functions/api.func/.vc-config.json << 'ENDCONFIG'
{
  "runtime": "nodejs22.x",
  "handler": "index.mjs",
  "launcherType": "Nodejs"
}
ENDCONFIG

echo "📦 Building Vite frontend..."
pnpm --filter @workspace/clinic run build

echo "📂 Copying static files..."
rm -rf .vercel/output/static
mkdir -p .vercel/output/static
cp -r artifacts/clinic/dist/* .vercel/output/static/

echo "🌐 Creating route config..."
cat > .vercel/output/config.json << 'ENDCONFIG'
{
  "version": 3,
  "routes": [
    { "handle": "filesystem" },
    { "src": "/api(?:/(.*))?", "dest": "/api" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
ENDCONFIG

echo "✅ Build output created successfully!"
