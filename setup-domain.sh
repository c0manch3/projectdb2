#!/bin/bash
# Setup script for lencondb.ru domain with SSL

set -e

DOMAIN="lencondb.ru"
EMAIL="admin@lencondb.ru"  # Change this to your email

echo "=== Setting up $DOMAIN ==="

# Update system
echo "Updating system packages..."
apt-get update

# Install nginx if not installed
if ! command -v nginx &> /dev/null; then
    echo "Installing nginx..."
    apt-get install -y nginx
fi

# Install certbot
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    apt-get install -y certbot python3-certbot-nginx
fi

# Create certbot webroot directory
mkdir -p /var/www/certbot

# Create temporary nginx config for certbot verification
echo "Creating temporary nginx config..."
cat > /etc/nginx/sites-available/lencondb.ru << 'NGINX_TEMP'
server {
    listen 80;
    server_name lencondb.ru www.lencondb.ru;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'Setting up SSL...';
        add_header Content-Type text/plain;
    }
}
NGINX_TEMP

# Enable site
ln -sf /etc/nginx/sites-available/lencondb.ru /etc/nginx/sites-enabled/

# Remove default site if exists
rm -f /etc/nginx/sites-enabled/default

# Test and reload nginx
nginx -t
systemctl reload nginx

# Get SSL certificate
echo "Obtaining SSL certificate..."
certbot certonly --webroot -w /var/www/certbot \
    -d lencondb.ru -d www.lencondb.ru \
    --email $EMAIL \
    --agree-tos \
    --non-interactive

# Now apply full config with SSL
echo "Applying full nginx configuration..."
cat > /etc/nginx/sites-available/lencondb.ru << 'NGINX_FULL'
server {
    listen 80;
    server_name lencondb.ru www.lencondb.ru;

    location / {
        return 301 https://$server_name$request_uri;
    }

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}

server {
    listen 443 ssl http2;
    server_name lencondb.ru www.lencondb.ru;

    ssl_certificate /etc/letsencrypt/live/lencondb.ru/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lencondb.ru/privkey.pem;

    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    add_header Strict-Transport-Security "max-age=63072000" always;

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    location /socket.io {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;
}
NGINX_FULL

# Test and reload nginx
nginx -t
systemctl reload nginx

# Setup auto-renewal
echo "Setting up certificate auto-renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

echo ""
echo "=== Setup complete! ==="
echo "Domain: https://$DOMAIN"
echo ""
echo "Next steps:"
echo "1. Make sure DNS A records point to this server (45.131.42.199)"
echo "2. Run: cd /opt/projectdb2 && docker compose down && docker compose build --no-cache && docker compose up -d"
echo ""
