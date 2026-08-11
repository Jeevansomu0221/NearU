#!/usr/bin/env bash
# HTTPS for vyaha.com / www.vyaha.com (static site). Safe to re-run.
# Does not modify api.vyaha.com backend config.
set -euo pipefail

DOMAIN="${DOMAIN:-vyaha.com}"
WWW_DOMAIN="${WWW_DOMAIN:-www.vyaha.com}"
EMAIL="${CERTBOT_EMAIL:-jeevansomu.ch@gmail.com}"
WEB_ROOT="${WEB_ROOT:-/var/www/vyaha}"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx

CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"
SSL_EXTRA=""
if [[ -f /etc/letsencrypt/options-ssl-nginx.conf ]]; then
  SSL_EXTRA="${SSL_EXTRA}
    include /etc/letsencrypt/options-ssl-nginx.conf;"
fi
if [[ -f /etc/letsencrypt/ssl-dhparams.pem ]]; then
  SSL_EXTRA="${SSL_EXTRA}
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;"
fi

write_https_config() {
  cat > /etc/nginx/sites-available/vyaha-website <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} ${WWW_DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${DOMAIN} ${WWW_DOMAIN};

    ssl_certificate ${CERT_DIR}/fullchain.pem;
    ssl_certificate_key ${CERT_DIR}/privkey.pem;${SSL_EXTRA}

    root ${WEB_ROOT};
    index index.html;
    client_max_body_size 10m;

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
}

if [[ -f "${CERT_DIR}/fullchain.pem" && -f "${CERT_DIR}/privkey.pem" ]]; then
  echo "==> Existing cert for ${DOMAIN}; writing HTTPS website config"
  write_https_config
else
  echo "==> No cert yet; writing HTTP config then requesting cert"
  cat > /etc/nginx/sites-available/vyaha-website <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} ${WWW_DOMAIN};

    root ${WEB_ROOT};
    index index.html;

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
fi

ln -sf /etc/nginx/sites-available/vyaha-website /etc/nginx/sites-enabled/vyaha-website
nginx -t
systemctl reload nginx

if [[ ! -f "${CERT_DIR}/fullchain.pem" ]]; then
  if certbot --nginx -d "${DOMAIN}" -d "${WWW_DOMAIN}" --non-interactive --agree-tos -m "${EMAIL}" --redirect; then
    write_https_config
    nginx -t
    systemctl reload nginx
  else
    echo "==> Certbot failed (DNS may still point to Render/Cloudflare). Website remains on HTTP."
    echo "==> Point vyaha.com and www.vyaha.com A records to this VPS, then re-run this script."
  fi
fi

systemctl enable nginx
echo "==> Website SSL ready for ${DOMAIN} and ${WWW_DOMAIN}"
