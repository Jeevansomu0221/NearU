#!/usr/bin/env bash
# Restore api.vyaha.com Nginx + Let's Encrypt so Cloudflare Full SSL (origin:443) works.
# Safe to re-run. Does not rebuild the Node app.
set -euo pipefail

DOMAIN="${DOMAIN:-api.vyaha.com}"
EMAIL="${CERTBOT_EMAIL:-jeevansomu.ch@gmail.com}"
UPSTREAM="${UPSTREAM:-http://127.0.0.1:5000}"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx

# Ensure backend is up before opening Cloudflare traffic
if command -v pm2 >/dev/null 2>&1; then
  pm2 resurrect 2>/dev/null || true
  pm2 restart vyaha-backend --update-env 2>/dev/null || true
fi

CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
if [[ -f "${CERT_DIR}/fullchain.pem" && -f "${CERT_DIR}/privkey.pem" ]]; then
  echo "==> Existing Let's Encrypt cert found for ${DOMAIN}; writing HTTPS nginx config"
  cat > /etc/nginx/sites-available/vyaha-backend <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    ssl_certificate ${CERT_DIR}/fullchain.pem;
    ssl_certificate_key ${CERT_DIR}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 10m;

    location / {
        proxy_pass ${UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }
}
NGINX
else
  echo "==> No cert yet; HTTP-only then certbot"
  cat > /etc/nginx/sites-available/vyaha-backend <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    client_max_body_size 10m;

    location / {
        proxy_pass ${UPSTREAM};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }
}
NGINX
fi

ln -sf /etc/nginx/sites-available/vyaha-backend /etc/nginx/sites-enabled/vyaha-backend
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# Open firewall ports Cloudflare needs
ufw allow OpenSSH || true
ufw allow 80/tcp || true
ufw allow 443/tcp || true
ufw --force enable || true

if [[ ! -f "${CERT_DIR}/fullchain.pem" ]]; then
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${EMAIL}" --redirect
else
  certbot renew --quiet || true
  # Re-apply HTTPS config in case renew changed nothing but listen 443 was missing
  if ! ss -lnt | grep -q ':443'; then
    echo "==> 443 still closed after renew; forcing certbot nginx install"
    certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${EMAIL}" --redirect || true
  fi
fi

nginx -t
systemctl reload nginx
systemctl enable nginx

echo "==> Listening ports:"
ss -lnt | grep -E ':80|:443|:5000' || true

echo "==> Local health checks:"
curl -fsS http://127.0.0.1:5000/health && echo ""
curl -fsSk "https://127.0.0.1/health" -H "Host: ${DOMAIN}" && echo "" || curl -fsS "http://127.0.0.1/health" -H "Host: ${DOMAIN}" && echo ""

echo "==> SSL restore complete for https://${DOMAIN}"
