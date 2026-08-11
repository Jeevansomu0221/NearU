#!/usr/bin/env bash
# Vyaha marketing + partner portal static site on the same VPS as api.vyaha.com.
# Does NOT touch the backend PM2 app or api.vyaha.com nginx config.
#
# Usage on server:
#   bash /opt/vyaha/repo/scripts/vps-deploy-website.sh
#
# Env:
#   REPO_DIR=/opt/vyaha/repo
#   WEB_ROOT=/var/www/vyaha
#   DOMAIN=vyaha.com
#   WWW_DOMAIN=www.vyaha.com

set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/vyaha/repo}"
WEB_ROOT="${WEB_ROOT:-/var/www/vyaha}"
DOMAIN="${DOMAIN:-vyaha.com}"
WWW_DOMAIN="${WWW_DOMAIN:-www.vyaha.com}"
NODE_MAJOR="${NODE_MAJOR:-20}"

echo "==> Installing build prerequisites..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git nginx rsync

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt "${NODE_MAJOR}" ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y -qq nodejs
fi

if [[ ! -d "${REPO_DIR}/.git" ]]; then
  echo "ERROR: ${REPO_DIR} is not a git checkout. Clone NearU there first."
  exit 1
fi

echo "==> Updating repo..."
cd "${REPO_DIR}"
git fetch --depth 1 origin main
git reset --hard origin/main

echo "==> Installing dependencies..."
npm ci
npm ci --prefix vyaha-official

echo "==> Building unified vyaha.com site..."
npm run build:vyaha-site

echo "==> Publishing static files to ${WEB_ROOT}..."
mkdir -p "${WEB_ROOT}"
rsync -a --delete "${REPO_DIR}/vyaha-official/dist/" "${WEB_ROOT}/"

echo "==> Configuring nginx for ${DOMAIN} + ${WWW_DOMAIN}..."
cat > /etc/nginx/sites-available/vyaha-website <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} ${WWW_DOMAIN};

    root ${WEB_ROOT};
    index index.html;

    client_max_body_size 10m;

    # Bare /business and /order must NOT fall through to the marketing SPA.
    location = /business {
        return 301 /business/;
    }
    location = /order {
        return 301 /order/;
    }

    location /business/ {
        try_files \$uri \$uri/ /business/index.html;
    }

    location /order/ {
        try_files \$uri \$uri/ /order/index.html;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/vyaha-website /etc/nginx/sites-enabled/vyaha-website
nginx -t
systemctl reload nginx

echo "==> Website files deployed. Run restore-website-ssl.sh for HTTPS if needed."
echo "==> Local check:"
curl -fsS -H "Host: ${WWW_DOMAIN}" "http://127.0.0.1/business/login/" | grep -E "Vyaha for Restaurants|Sign in to continue" | head -n 1 || true
echo ""
