#!/usr/bin/env bash
# Rebuild and publish the demo. Run on the server from anywhere.
set -euo pipefail
cd "$(dirname "$0")"
npm ci
npm run build
sudo mkdir -p /var/www/case-assistant
sudo rsync -a --delete dist/ /var/www/case-assistant/
sudo systemctl reload nginx
echo "Deployed."
