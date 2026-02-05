# Production Deployment Guide for finder.stacindex.org

This guide focuses on regular update procedures and documents the already-configured production environment.

## Server Information

- **Domain**: finder.stacindex.org
- **Server**: Debian Linux
- **User**: stac-finder
- **Services**: API (Port 4000), Web-UI (Port 8080)
- **Reverse Proxy**: Nginx with Let's Encrypt SSL

---

## Regular Updates (What You Need to Do)

These are the steps you need to perform when deploying code updates:

### Deploy Code Updates

```bash
# 1. Connect to server
ssh stac-finder@finder.stacindex.org

# 2. Navigate to project directory
cd ~/stac-finder

# 3. Pull latest changes
git pull

# 4. Update submodules
git submodule update --recursive

# 5. Rebuild and restart containers
docker compose down
docker compose up -d --build api web-ui

# 6. Check status
docker compose ps

# 7. View logs to verify everything is running
docker compose logs -f
```

### Quick Restart (Without Rebuild)

If you only need to restart the containers without rebuilding:

```bash
cd ~/stac-finder
docker compose restart api web-ui
```

### View Logs

```bash
# API logs
docker compose logs -f api

# Web-UI logs
docker compose logs -f web-ui

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## Already Configured (No Changes Needed)

The following configurations are **already in place** and working. These were set up during initial deployment and **do not need to be modified** during regular updates.

### 1. Server Software

**Status:** Installed and running  

The following software is installed on the server:
- Docker & Docker Compose
- Nginx (Reverse Proxy)
- Certbot (SSL Certificate Management)

**No action needed** - These are managed by the system.

---

### 2. Environment Variables (.env File)

**Status:** Configured  
**Location:** `~/stac-finder/.env`

The `.env` file contains database credentials and port configurations. This file is **already configured** with:
- `API_DB_HOST=172.17.0.1` - Docker Gateway IP for database access
- `API_PORT=4000` - API internal port
- `WEB_UI_PORT=8080` - Web-UI internal port
- Database credentials (sensitive information)

**No action needed** - Only modify if database credentials change.

---

### 3. Docker Compose Configuration

**Status:** Configured  
**Location:** `~/stac-finder/docker-compose.yml`

The docker-compose file has been configured with production settings:
- **API**: Uses `npm start` for production
- **Web-UI**: Configured with production API URL (`https://finder.stacindex.org/api`)
- **Web-UI**: Host check disabled for domain access (`DANGEROUSLY_DISABLE_HOST_CHECK=true`)

**No action needed** - Configuration is complete and working.

---

### 4. Web-UI Vue Configuration

**Status:** Configured  
**Location:** `~/stac-finder/web-ui/vue.config.js`

The Vue dev server is configured with:
- `allowedHosts: 'all'` - Allows access via domain
- WebSocket configuration for secure connection over HTTPS

**No action needed** - Configuration is complete and working.

---

### 5. Web-UI API Configuration

**Status:** Configured  
**Location:** `~/stac-finder/web-ui/config.js`

```bash
nano web-ui/config.js
```

**Set API URL with HTTPS:**

```javascript
stacFinderApiUrl: "https://finder.stacindex.org/api",
catalogUrl: null,
allowExternalAccess: true,
```

**Important:**
- Use `https://` (not `http://`)
- Leave `catalogUrl: null` for default homepage

## Step 7: Configure Nginx as Reverse Proxy (already configured)

### 7.1 Initial Konfiguration (without SSL)

```bash
sudo nano /etc/nginx/sites-available/stacfinder
```

**Initial HTTP configuration:**

```nginx
server {
    server_name finder.stacindex.org;

    location /api/ {
        proxy_pass http://localhost:4000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # Ersetze URLs in JSON-Responses
        sub_filter '"https://finder.stacindex.org/' '"https://finder.stacindex.org/api/';
        sub_filter '"http://finder.stacindex.org/' '"http://finder.stacindex.org/api/';
        sub_filter_once off;
        sub_filter_types application/json;
    }

    location / {
        proxy_pass http://localhost:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/finder.stacindex.org/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/finder.stacindex.org/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}
server {
    if ($host = finder.stacindex.org) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    listen 80;
    server_name finder.stacindex.org;
    return 404; # managed by Certbot


}
```

```bash
# Enable
sudo ln -s /etc/nginx/sites-available/stacfinder /etc/nginx/sites-enabled/

# Test and start
sudo nginx -t
sudo systemctl restart nginx
```

### 7.2 SSL Certificate with Let's Encrypt

```bash
sudo certbot --nginx -d finder.stacindex.org
```

- Enter email address (for expiration warnings)
- Accept Terms of Service: `Y`
- Newsletter optional: `N`

**Certbot automatically configures HTTPS and redirects!**

## Testing & Verification

After deploying updates, verify the application is working:

### In Browser:
- **Web-UI**: https://finder.stacindex.org
- **API**: https://finder.stacindex.org/api
- **Collections**: https://finder.stacindex.org/api/collections
- **Health Check**: https://finder.stacindex.org/api/health
