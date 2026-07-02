#!/bin/bash
set -e

echo "📦 Building API serverless function with esbuild..."
mkdir -p .vercel/output/functions/api.func
node scripts/build-api.mjs

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
