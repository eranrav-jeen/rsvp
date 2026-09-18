#!/usr/bin/env bash
# Simple deploy script for the Oracle server.
# Usage: ./deploy.sh   (run from the repo root on the server)
set -euo pipefail

echo "==> Pulling latest from git"
git pull --ff-only

echo "==> Installing backend dependencies"
cd backend
npm ci --omit=dev
echo "==> Running DB migrations + seed (idempotent)"
npm run migrate
npm run seed
cd ..

echo "==> Building frontend"
cd frontend
npm ci
npm run build
cd ..

echo "==> Restarting API via pm2"
pm2 restart jeen-event-api --update-env || pm2 start ecosystem.config.js

echo "==> Deploy complete."
echo "    Frontend built to frontend/dist (served by nginx)."
