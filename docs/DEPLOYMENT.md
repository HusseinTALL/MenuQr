# MenuQR Deployment Guide

Complete guide for deploying MenuQR to production.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Database Setup (MongoDB Atlas)](#database-setup-mongodb-atlas)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Domain & SSL Configuration](#domain--ssl-configuration)
7. [Post-Deployment Checklist](#post-deployment-checklist)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
                    ┌─────────────────┐
                    │   CloudFlare    │
                    │   (DNS + CDN)   │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────▼─────────┐        ┌──────────▼─────────┐
    │   Frontend PWA    │        │    Backend API     │
    │   (Netlify/       │        │    (Railway/       │
    │   Vercel)         │        │    Render/DO)      │
    │                   │        │                    │
    │ app.menuqr.bf     │        │ api.menuqr.bf      │
    └───────────────────┘        └─────────┬──────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
          ┌─────────▼─────────┐  ┌─────────▼─────────┐  ┌────────▼────────┐
          │   MongoDB Atlas   │  │    Cloudinary     │  │     Sentry      │
          │   (Database)      │  │   (Images)        │  │  (Monitoring)   │
          └───────────────────┘  └───────────────────┘  └─────────────────┘
```

---

## Prerequisites

Before deploying, ensure you have:

- [ ] Domain name configured (e.g., `menuqr.bf`)
- [ ] MongoDB Atlas account
- [ ] Cloudinary account (for image storage)
- [ ] Sentry account (for error tracking)
- [ ] Hosting accounts (Netlify + Railway/Render)

---

## Database Setup (MongoDB Atlas)

### 1. Create MongoDB Atlas Cluster

1. Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new project "MenuQR"
3. Create a free M0 cluster (or M10+ for production)
4. Choose a region close to your users (e.g., AWS EU West for Burkina Faso)

### 2. Configure Database Access

1. Go to **Database Access** > **Add New Database User**
2. Create a user with a strong password
3. Grant "Read and write to any database" role

### 3. Configure Network Access

1. Go to **Network Access** > **Add IP Address**
2. For development: Add your current IP
3. For production: Add `0.0.0.0/0` (allow from anywhere) or specific IPs from your hosting provider

### 4. Get Connection String

1. Go to **Database** > **Connect** > **Connect your application**
2. Copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<dbname>?retryWrites=true&w=majority
   ```
3. Replace `<username>`, `<password>`, and `<dbname>` with your values

### 5. Create Indexes (Recommended)

Connect to your database and create indexes for better performance:

```javascript
// Orders collection
db.orders.createIndex({ restaurantId: 1, createdAt: -1 });
db.orders.createIndex({ status: 1 });
db.orders.createIndex({ orderNumber: 1 }, { unique: true });

// Reservations collection
db.reservations.createIndex({ restaurantId: 1, date: 1 });
db.reservations.createIndex({ status: 1 });

// Customers collection
db.customers.createIndex({ phone: 1 }, { unique: true });
db.customers.createIndex({ email: 1 }, { sparse: true });

// Reviews collection
db.reviews.createIndex({ restaurantId: 1, status: 1 });
db.reviews.createIndex({ dishId: 1 });
```

---

## Backend Deployment

### Option A: Railway (Recommended)

Railway provides easy deployment with automatic scaling.

#### 1. Setup Project

1. Sign up at [railway.app](https://railway.app)
2. Create new project from GitHub repo
3. Select the `menuqr-api` directory

#### 2. Configure Build Settings

In Railway dashboard:
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Watch Paths**: `menuqr-api/**`

#### 3. Add Environment Variables

Add all variables from `docs/ENV.md` in Railway's Variables tab.

#### 4. Deploy

Railway auto-deploys on git push. Monitor logs for issues.

### Option B: Render

#### 1. Create Web Service

1. Sign up at [render.com](https://render.com)
2. New > Web Service
3. Connect GitHub repo
4. Configure:
   - **Root Directory**: `menuqr-api`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Starter ($7/mo) or higher

#### 2. Add Environment Variables

Add in Render's Environment tab.

### Option C: DigitalOcean App Platform

#### 1. Create App

1. Sign up at [digitalocean.com](https://www.digitalocean.com)
2. Apps > Create App
3. Connect GitHub repo
4. Configure component:
   - **Source Directory**: `menuqr-api`
   - **Build Command**: `npm run build`
   - **Run Command**: `npm start`

#### 2. Add Environment Variables

Add in App Settings > App-Level Environment Variables.

### Option D: VPS Manual Deployment

For full control, deploy to a VPS (DigitalOcean, Vultr, Linode).

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install nginx
sudo apt install -y nginx
```

#### 2. Clone and Build

```bash
cd /var/www
git clone <repository-url> menuqr
cd menuqr/menuqr-api

# Install dependencies
npm install

# Create .env file
nano .env
# Add all environment variables

# Build
npm run build
```

#### 3. Start with PM2

```bash
pm2 start dist/index.js --name menuqr-api
pm2 save
pm2 startup
```

#### 4. Configure Nginx

```nginx
# /etc/nginx/sites-available/api.menuqr.bf
server {
    listen 80;
    server_name api.menuqr.bf;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/api.menuqr.bf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Frontend Deployment

### Option A: Netlify (Recommended)

#### 1. Connect Repository

1. Sign up at [netlify.com](https://www.netlify.com)
2. New site from Git
3. Connect GitHub repo

#### 2. Configure Build Settings

- **Base directory**: `menuqr-app`
- **Build command**: `npm run build`
- **Publish directory**: `menuqr-app/dist`

#### 3. Add Environment Variables

In Site settings > Environment variables, add:
```
VITE_API_URL=https://api.menuqr.bf/api/v1
VITE_APP_NAME=MenuQR
VITE_APP_URL=https://app.menuqr.bf
# ... other variables
```

#### 4. Configure Redirects

Create `menuqr-app/public/_redirects`:
```
/*    /index.html   200
```

Or use `netlify.toml`:
```toml
[build]
  base = "menuqr-app"
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "no-cache"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### Option B: Vercel

#### 1. Connect Repository

1. Sign up at [vercel.com](https://vercel.com)
2. Import Git repository
3. Select `menuqr-app` as root directory

#### 2. Configure Settings

- **Framework Preset**: Vue.js
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

#### 3. Add Environment Variables

In Project Settings > Environment Variables.

### Option C: Cloudflare Pages

#### 1. Create Project

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com)
2. Pages > Create a project
3. Connect GitHub repo

#### 2. Configure Build

- **Root directory**: `menuqr-app`
- **Build command**: `npm run build`
- **Build output directory**: `dist`

#### 3. Add Environment Variables

In Settings > Environment variables.

---

## Domain & SSL Configuration

### DNS Configuration

Add these DNS records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | [Hosting IP] | 3600 |
| CNAME | api | [Backend URL] | 3600 |
| CNAME | app | [Frontend URL] | 3600 |

### SSL Certificate

#### Netlify/Vercel/Cloudflare
- SSL is automatically provisioned

#### VPS with Let's Encrypt
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificates
sudo certbot --nginx -d api.menuqr.bf -d app.menuqr.bf

# Auto-renewal is configured automatically
```

---

## Post-Deployment Checklist

### Backend

- [ ] Health check endpoint responds: `curl https://api.menuqr.bf/api/v1/health`
- [ ] Database connection working
- [ ] JWT authentication working
- [ ] CORS properly configured (no CORS errors from frontend)
- [ ] Rate limiting active
- [ ] Image upload working (Cloudinary)
- [ ] Error tracking active (Sentry)

### Frontend

- [ ] App loads without errors
- [ ] API calls succeed
- [ ] PWA installable
- [ ] Offline mode works
- [ ] All routes accessible
- [ ] HTTPS enforced

### Security

- [ ] All secrets are production values (not dev defaults)
- [ ] CAPTCHA enabled
- [ ] No sensitive data in logs
- [ ] Security headers present

### Performance

- [ ] Response times acceptable (<500ms for most endpoints)
- [ ] Images loading from CDN
- [ ] PWA caching working

---

## Monitoring & Maintenance

### Sentry Setup

1. Create project at [sentry.io](https://sentry.io)
2. Add DSN to environment variables
3. Configure alerts for critical errors

### Health Monitoring

Set up uptime monitoring with:
- [UptimeRobot](https://uptimerobot.com) (free)
- [Pingdom](https://www.pingdom.com)
- [Better Uptime](https://betteruptime.com)

Monitor:
- `https://api.menuqr.bf/api/v1/health`
- `https://app.menuqr.bf`

### Database Backups

MongoDB Atlas automatically backs up data. Configure:
1. Go to Cluster > Backup
2. Enable continuous backup
3. Set point-in-time recovery window (7-30 days)

### Log Aggregation

For production debugging, consider:
- [LogDNA](https://www.logdna.com)
- [Papertrail](https://www.papertrail.com)
- [Datadog](https://www.datadoghq.com)

---

## Troubleshooting

### Common Issues

#### CORS Errors
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution**: Verify `CORS_ORIGIN` includes your frontend URL.

#### 502 Bad Gateway
**Solution**: Check if backend is running and listening on correct port.

#### MongoDB Connection Failed
**Solution**:
1. Verify connection string
2. Check network access (IP whitelist)
3. Verify credentials

#### PWA Not Installing
**Solution**:
1. Ensure HTTPS is working
2. Check manifest.json is served correctly
3. Verify service worker registration

#### Images Not Loading
**Solution**:
1. Verify Cloudinary credentials
2. Check image URLs in database
3. Verify CORS on Cloudinary

### Debug Mode

Enable debug logging temporarily:

**Backend:**
```env
NODE_ENV=development
```

**Frontend:**
```env
VITE_DEBUG=true
```

### View Logs

**Railway:**
```bash
railway logs
```

**Render:**
View in dashboard > Logs

**PM2:**
```bash
pm2 logs menuqr-api
```

---

## Scaling Considerations

### When to Scale

- Response times > 500ms consistently
- Database connections maxed out
- Memory usage > 80%
- CPU usage > 70%

### Horizontal Scaling

1. **Backend**: Add more instances (Railway/Render auto-scale)
2. **Database**: Upgrade MongoDB Atlas tier
3. **CDN**: Cloudflare for static assets

### Vertical Scaling

1. Upgrade instance size (more RAM/CPU)
2. Upgrade database cluster

### Caching Strategy

Consider adding Redis for:
- Session storage
- API response caching
- Rate limiting data

---

## Rollback Procedure

### Railway/Render/Vercel
1. Go to Deployments
2. Find last working deployment
3. Click "Rollback" or "Redeploy"

### Manual (VPS)
```bash
cd /var/www/menuqr
git log --oneline -5  # Find last working commit
git checkout <commit-hash>
npm run build
pm2 restart menuqr-api
```

---

## Cost Estimation

### Minimum Production Setup (~$20-30/month)

| Service | Plan | Cost |
|---------|------|------|
| MongoDB Atlas | M10 | $57/mo (or free M0 for low traffic) |
| Railway/Render | Starter | $0-7/mo |
| Netlify | Free | $0 |
| Cloudinary | Free | $0 |
| Sentry | Free | $0 |
| Domain | .bf | ~$15/year |

### Recommended Production Setup (~$100/month)

| Service | Plan | Cost |
|---------|------|------|
| MongoDB Atlas | M10 | $57/mo |
| Railway | Pro | $20/mo |
| Netlify | Pro | $19/mo |
| Cloudinary | Plus | $0-99/mo |
| Sentry | Team | $0-26/mo |
| Domain + SSL | - | ~$30/year |
