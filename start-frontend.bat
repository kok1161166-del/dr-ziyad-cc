@echo off
title Frontend - عيادة د. زياد أبو دقة
cd /d "%~dp0"
set PORT=20964
set BASE_PATH=/

echo Starting frontend on port %PORT%...
cd /d "%~dp0artifacts\clinic"
pnpm run dev
pause
