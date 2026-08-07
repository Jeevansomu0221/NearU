#!/usr/bin/env bash
# Configure api.vyaha.com with Nginx + Let's Encrypt SSL.
set -euo pipefail

DOMAIN="${DOMAIN:-api.vyaha.com}"
EMAIL="${CERTBOT_EMAIL:-jeevansomu.ch@gmail.com}"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx

cat > /etc/nginx/sites-available/vyaha-backend <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:5000;
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

ln -sf /etc/nginx/sites-available/vyaha-backend /etc/nginx/sites-enabled/vyaha-backend
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

if ! certbot certificates 2>/dev/null | grep -q "${DOMAIN}"; then
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${EMAIL}" --redirect
else
  certbot renew --quiet || true
fi

nginx -t
systemctl reload nginx

echo "SSL setup complete for https://${DOMAIN}"
