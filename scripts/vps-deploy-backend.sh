#!/usr/bin/env bash
# Vyaha backend — one-shot deploy on Ubuntu 24.04 VPS.
# Usage (on server as root):
#   curl -fsSL https://raw.githubusercontent.com/Jeevansomu0221/NearU/main/scripts/vps-deploy-backend.sh | bash
# Or after copying repo + .env:
#   APP_DIR=/opt/vyaha/backend bash scripts/vps-deploy-backend.sh

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/vyaha/backend}"
REPO_URL="${REPO_URL:-https://github.com/Jeevansomu0221/NearU.git}"
BRANCH="${BRANCH:-main}"
NODE_MAJOR="${NODE_MAJOR:-20}"

echo "==> Installing system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git nginx ufw

echo "==> Installing Node.js ${NODE_MAJOR}..."
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt "${NODE_MAJOR}" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi

echo "==> Installing PM2..."
npm install -g pm2

echo "==> Preparing app directory ${APP_DIR}..."
mkdir -p "$(dirname "$APP_DIR")"

if [[ ! -f "${APP_DIR}/package.json" ]]; then
  echo "Cloning repository..."
  rm -rf /tmp/nearu-clone
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" /tmp/nearu-clone
  rm -rf "$APP_DIR"
  mv /tmp/nearu-clone/backend "$APP_DIR"
  rm -rf /tmp/nearu-clone
fi

cd "$APP_DIR"

if [[ ! -f .env ]]; then
  echo "ERROR: ${APP_DIR}/.env not found. Copy your production .env before running this script."
  exit 1
fi

echo "==> Building backend..."
npm ci
npm run build

echo "==> Starting with PM2..."
pm2 delete vyaha-backend 2>/dev/null || true
pm2 start dist/server.js --name vyaha-backend --cwd "$APP_DIR"
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo "==> Configuring Nginx..."
cat > /etc/nginx/sites-available/vyaha-backend <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/vyaha-backend /etc/nginx/sites-enabled/vyaha-backend
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
systemctl enable nginx

echo "==> Firewall..."
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable || true

echo "==> Health check..."
sleep 2
curl -fsS "http://127.0.0.1:5000/health" && echo ""
curl -fsS "http://127.0.0.1/health" && echo ""

echo "==> Deploy complete. Backend running at http://$(curl -4 -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
