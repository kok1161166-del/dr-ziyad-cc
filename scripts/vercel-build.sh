#!/bin/bash
set -e

echo "📦 Building API serverless function with esbuild..."
mkdir -p .vercel/output/functions/api.func

# Bundle app.ts into a single ESM file with all dependencies
# Use node to call esbuild's API directly (avoids binary lookup issues)
NODE_PATH=artifacts/api-server/node_modules node --input-type=module -e "
import { build } from 'esbuild';
import { createRequire } from 'node:module';

const cr = createRequire(import.meta.url);
const banner = [
  'import { createRequire as __bannerCrReq } from \"node:module\";',
  'import __bannerPath from \"node:path\";',
  'import __bannerUrl from \"node:url\";',
  'globalThis.require = __bannerCrReq(import.meta.url);',
  'globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);',
  'globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);',
].join('');

build({
  entryPoints: ['artifacts/api-server/src/app.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  banner: { js: banner },
  outfile: '.vercel/output/functions/api.func/index.mjs',
  external: [
    'sharp', 'better-sqlite3', 'sqlite3', 'canvas', 'bcrypt', 'argon2',
    'fsevents', 're2', 'farmhash', 'xxhash-addon', 'bufferutil',
    'utf-8-validate', 'ssh2', 'cpu-features', 'dtrace-provider',
    'isolated-vm', 'lightningcss', 'pg-native', 'oracledb',
    'mongodb-client-encryption', 'nodemailer', 'handlebars', 'knex',
    'typeorm', 'protobufjs', 'onnxruntime-node',
    '@tensorflow/*', '@prisma/client', '@mikro-orm/*', '@grpc/*',
    '@swc/*', '@aws-sdk/*', '@azure/*', '@opentelemetry/*',
    '@google-cloud/*', '@google/*', 'googleapis', 'firebase-admin',
    '@parcel/watcher', '@sentry/profiling-node', '@tree-sitter/*',
    'aws-sdk', 'classic-level', 'dd-trace', 'ffi-napi', 'grpc',
    'hiredis', 'kerberos', 'leveldown', 'miniflare', 'mysql2',
    'newrelic', 'odbc', 'piscina', 'realm', 'ref-napi', 'rocksdb',
    'sass-embedded', 'sequelize', 'serialport', 'snappy', 'tinypool',
    'usb', 'workerd', 'wrangler', 'zeromq', 'zeromq-prebuilt',
    'playwright', 'puppeteer', 'puppeteer-core', 'electron',
  ],
}).then(() => console.log('✅ esbuild bundle complete'))
  .catch(err => { console.error(err); process.exit(1); });
"

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
