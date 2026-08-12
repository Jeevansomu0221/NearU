#!/usr/bin/env bash
# Serve vyaha.com / www.vyaha.com on HTTP + HTTPS without touching api.vyaha.com.
# Uses Let's Encrypt if available; otherwise a local self-signed cert so Cloudflare
# "Full" SSL can fetch the static site from origin :443 (instead of the API 404).
set -euo pipefail

DOMAIN="${DOMAIN:-vyaha.com}"
WWW_DOMAIN="${WWW_DOMAIN:-www.vyaha.com}"
EMAIL="${CERTBOT_EMAIL:-jeevansomu.ch@gmail.com}"
WEB_ROOT="${WEB_ROOT:-/var/www/vyaha}"
REPO_DIR="${REPO_DIR:-/opt/vyaha/repo}"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx openssl certbot python3-certbot-nginx

mkdir -p "${WEB_ROOT}" /etc/nginx/certs

CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
SSL_CERT=""
SSL_KEY=""

if [[ -f "${CERT_DIR}/fullchain.pem" && -f "${CERT_DIR}/privkey.pem" ]]; then
  SSL_CERT="${CERT_DIR}/fullchain.pem"
  SSL_KEY="${CERT_DIR}/privkey.pem"
  echo "==> Using Let's Encrypt cert for ${DOMAIN}"
else
  # Ensure HTTP site is live first, then try HTTP-01 via Cloudflare Flexible/proxy.
  echo "==> Attempting Let's Encrypt for ${DOMAIN} ${WWW_DOMAIN}"
  cat > /etc/nginx/sites-available/vyaha-website <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} ${WWW_DOMAIN};
    root ${WEB_ROOT};
    index index.html;

    location ^~ /.well-known/acme-challenge/ {
        default_type text/plain;
        root ${WEB_ROOT};
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX
  ln -sf /etc/nginx/sites-available/vyaha-website /etc/nginx/sites-enabled/vyaha-website
  nginx -t
  systemctl reload nginx

  if certbot certonly --webroot -w "${WEB_ROOT}" -d "${DOMAIN}" -d "${WWW_DOMAIN}" \
      --non-interactive --agree-tos -m "${EMAIL}"; then
    SSL_CERT="${CERT_DIR}/fullchain.pem"
    SSL_KEY="${CERT_DIR}/privkey.pem"
    echo "==> Let's Encrypt issued"
  else
    echo "==> Let's Encrypt failed; generating self-signed cert for Cloudflare Full SSL"
    openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
      -keyout /etc/nginx/certs/vyaha-website.key \
      -out /etc/nginx/certs/vyaha-website.crt \
      -subj "/CN=${WWW_DOMAIN}" \
      -addext "subjectAltName=DNS:${DOMAIN},DNS:${WWW_DOMAIN}"
    SSL_CERT="/etc/nginx/certs/vyaha-website.crt"
    SSL_KEY="/etc/nginx/certs/vyaha-website.key"
  fi
fi

SSL_EXTRA=""
if [[ -f /etc/letsencrypt/options-ssl-nginx.conf ]]; then
  SSL_EXTRA="${SSL_EXTRA}
    include /etc/letsencrypt/options-ssl-nginx.conf;"
fi

cat > /etc/nginx/sites-available/vyaha-website <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} ${WWW_DOMAIN};
    root ${WEB_ROOT};

    location ^~ /.well-known/acme-challenge/ {
        default_type text/plain;
        root ${WEB_ROOT};
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${DOMAIN} ${WWW_DOMAIN};

    ssl_certificate ${SSL_CERT};
    ssl_certificate_key ${SSL_KEY};${SSL_EXTRA}

    root ${WEB_ROOT};
    index index.html;
    client_max_body_size 10m;

    location = /business { return 301 /business/; }
    location = /order { return 301 /order/; }

    location /business/ {
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
        try_files \$uri \$uri/ /business/index.html;
    }

    location /order/ {
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
        try_files \$uri \$uri/ /order/index.html;
    }

    location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
    }

    location / {
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
        try_files \$uri \$uri/ /index.html;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/vyaha-website /etc/nginx/sites-enabled/vyaha-website
nginx -t
systemctl reload nginx
systemctl enable nginx

echo "==> Fingerprint:"
curl -fsS -H "Host: ${WWW_DOMAIN}" "http://127.0.0.1/business/login/" | grep -oE 'assets/index-[^"]+' | head -n 1 || true
curl -fsSk -H "Host: ${WWW_DOMAIN}" "https://127.0.0.1/business/login/" | grep -oE 'assets/index-[^"]+' | head -n 1 || true
echo "==> Website SSL ready for ${DOMAIN} / ${WWW_DOMAIN}"
