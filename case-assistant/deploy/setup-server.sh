#!/usr/bin/env bash
# One-time server setup for the Case Assistant demo (Ubuntu 22.04 / 24.04).
# Usage: ./deploy/setup-server.sh [DOMAIN] [--no-auth] [--https]
#   DOMAIN defaults to "_" (any host). --https needs a real domain pointing here.
set -euo pipefail
cd "$(dirname "$0")/.."

DOMAIN="_"; AUTH=yes; HTTPS=no
for a in "$@"; do
  case "$a" in
    --no-auth) AUTH=no ;;
    --https) HTTPS=yes ;;
    *) DOMAIN="$a" ;;
  esac
done

sudo apt-get update
sudo apt-get install -y curl ca-certificates gnupg nginx apache2-utils rsync
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node -v && npm -v
sudo ufw allow 'Nginx Full' 2>/dev/null || true

conf=/etc/nginx/sites-available/case-assistant
sed "s/__DOMAIN__/${DOMAIN}/" deploy/nginx-case-assistant.conf | sudo tee "$conf" >/dev/null
if [ "$AUTH" = no ]; then
  sudo sed -i '/auth_basic/d' "$conf"
elif [ ! -f /etc/nginx/.htpasswd-case-assistant ]; then
  echo "Choose a password for the demo user 'demo':"
  sudo htpasswd -c /etc/nginx/.htpasswd-case-assistant demo
fi
sudo ln -sf "$conf" /etc/nginx/sites-enabled/case-assistant

if [ "$DOMAIN" = "_" ] && [ -e /etc/nginx/sites-enabled/default ]; then
  echo "NOTE: /etc/nginx/sites-enabled/default also answers any host on port 80."
  echo "      Remove it only if nothing else uses it: sudo rm /etc/nginx/sites-enabled/default"
fi

sudo nginx -t
./deploy.sh   # builds, rsyncs to /var/www/case-assistant, reloads nginx


if [ "$HTTPS" = yes ]; then
  sudo apt-get install -y certbot python3-certbot-nginx
  sudo certbot --nginx -d "$DOMAIN" --redirect
fi

echo "Done. Check: curl -I http://${DOMAIN/_/localhost}/   (expect 200, or 401 with basic auth)"
