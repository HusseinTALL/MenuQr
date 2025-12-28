# Environment Variables Reference

Complete reference for all environment variables used in MenuQR.

---

## Backend (`menuqr-api/.env`)

### Server Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Server port |
| `NODE_ENV` | No | `development` | Environment: `development`, `production`, `test` |

### Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | **Yes** | - | MongoDB connection string |
| `MONGODB_URI_TEST` | No | - | MongoDB connection string for tests |

**Examples:**
```env
# Local MongoDB
MONGODB_URI=mongodb://localhost:27017/menuqr

# MongoDB with authentication
MONGODB_URI=mongodb://user:password@localhost:27017/menuqr

# MongoDB Atlas
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/menuqr?retryWrites=true&w=majority

# Docker MongoDB (from docker-compose)
MONGODB_URI=mongodb://menuqr:menuqr123@localhost:27017/menuqr?authSource=menuqr
```

### JWT Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **Yes** | - | Secret key for JWT signing (min 32 characters) |
| `JWT_EXPIRES_IN` | No | `7d` | Access token expiration (e.g., `1h`, `7d`, `30d`) |
| `JWT_REFRESH_EXPIRES_IN` | No | `30d` | Refresh token expiration |

**Security Note:** Generate a strong secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### CORS

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed origins (comma-separated for multiple) |

**Examples:**
```env
# Single origin
CORS_ORIGIN=http://localhost:5173

# Multiple origins
CORS_ORIGIN=http://localhost:5173,https://app.menuqr.bf

# Production
CORS_ORIGIN=https://app.menuqr.bf,https://admin.menuqr.bf
```

### Rate Limiting

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window in milliseconds (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per window |

### File Upload

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MAX_FILE_SIZE` | No | `5242880` | Max file size in bytes (5MB) |
| `ALLOWED_FILE_TYPES` | No | `image/jpeg,image/png,image/webp` | Allowed MIME types |

### Security - Account Lockout

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MAX_FAILED_LOGIN_ATTEMPTS` | No | `5` | Failed attempts before lockout |
| `LOCKOUT_DURATION_MINUTES` | No | `30` | Lockout duration in minutes |

### CAPTCHA (Optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CAPTCHA_ENABLED` | No | `false` | Enable CAPTCHA verification |
| `CAPTCHA_PROVIDER` | No | `recaptcha` | Provider: `recaptcha`, `hcaptcha`, `turnstile` |
| `CAPTCHA_SITE_KEY` | No | - | Public site key |
| `CAPTCHA_SECRET_KEY` | No | - | Secret key for server verification |

### Cloudinary (Image Storage)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLOUDINARY_CLOUD_NAME` | No | - | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | No | - | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | No | - | Cloudinary API secret |

**Note:** Required only if using image upload features.

### SMS Service (Optional)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SMS_PROVIDER` | No | - | SMS provider (e.g., `twilio`, `orange`) |
| `SMS_API_KEY` | No | - | SMS provider API key |
| `SMS_API_SECRET` | No | - | SMS provider API secret |
| `SMS_FROM_NUMBER` | No | - | Sender phone number |

### Sentry (Error Tracking)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SENTRY_DSN` | No | - | Sentry DSN for error tracking |

---

## Frontend (`menuqr-app/.env`)

### App Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_APP_NAME` | No | `MenuQR` | Application name |
| `VITE_APP_URL` | No | - | Public app URL |
| `VITE_APP_VERSION` | No | `1.0.0` | App version |

### API Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | **Yes** | - | Backend API base URL |
| `VITE_API_VERSION` | No | `v1` | API version |

**Examples:**
```env
# Development
VITE_API_URL=http://localhost:3001/api/v1

# Production
VITE_API_URL=https://api.menuqr.bf/api/v1
```

### Restaurant Configuration (Static Mode)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_RESTAURANT_SLUG` | No | - | Default restaurant slug |
| `VITE_WHATSAPP_NUMBER` | No | - | Default WhatsApp number |

### Cloudinary

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_CLOUDINARY_CLOUD_NAME` | No | - | Cloudinary cloud name |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | No | - | Unsigned upload preset |

### Analytics & Monitoring

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_SENTRY_DSN` | No | - | Sentry DSN for frontend errors |
| `VITE_GA_TRACKING_ID` | No | - | Google Analytics tracking ID |

### Feature Flags

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_ENABLE_PWA` | No | `true` | Enable PWA features |
| `VITE_ENABLE_OFFLINE` | No | `true` | Enable offline mode |
| `VITE_ENABLE_ANALYTICS` | No | `false` | Enable analytics |

### Debug Mode

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_DEBUG` | No | `false` | Enable debug mode |

---

## Complete Example Files

### Backend `.env` (Development)

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/menuqr
MONGODB_URI_TEST=mongodb://localhost:27017/menuqr_test

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production-minimum-32-characters
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp

# Security - Account Lockout
MAX_FAILED_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30

# CAPTCHA Configuration (optional - disabled by default)
CAPTCHA_ENABLED=false
CAPTCHA_PROVIDER=recaptcha
CAPTCHA_SITE_KEY=your-captcha-site-key
CAPTCHA_SECRET_KEY=your-captcha-secret-key

# Cloudinary (optional)
# CLOUDINARY_CLOUD_NAME=your-cloud-name
# CLOUDINARY_API_KEY=your-api-key
# CLOUDINARY_API_SECRET=your-api-secret

# Sentry (optional)
# SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Backend `.env` (Production)

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# MongoDB Configuration
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/menuqr?retryWrites=true&w=majority

# JWT Configuration (use strong, unique secrets)
JWT_SECRET=generate-a-64-character-random-hex-string-for-production
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=https://app.menuqr.bf,https://admin.menuqr.bf

# Rate Limiting (stricter for production)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50

# File Upload
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp

# Security - Account Lockout
MAX_FAILED_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30

# CAPTCHA Configuration (enabled for production)
CAPTCHA_ENABLED=true
CAPTCHA_PROVIDER=turnstile
CAPTCHA_SITE_KEY=your-production-site-key
CAPTCHA_SECRET_KEY=your-production-secret-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=menuqr
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Frontend `.env` (Development)

```env
# App Configuration
VITE_APP_NAME=MenuQR
VITE_APP_URL=http://localhost:5173
VITE_APP_VERSION=1.0.0

# API Configuration
VITE_API_URL=http://localhost:3001/api/v1

# Restaurant Configuration (for static mode)
VITE_RESTAURANT_SLUG=garbadrome-patte-doie
VITE_WHATSAPP_NUMBER=22606336696

# Cloudinary
VITE_CLOUDINARY_CLOUD_NAME=menuqr
VITE_CLOUDINARY_UPLOAD_PRESET=menuqr-upload

# Feature Flags
VITE_ENABLE_PWA=true
VITE_ENABLE_OFFLINE=true
VITE_ENABLE_ANALYTICS=false

# Debug Mode
VITE_DEBUG=true
```

### Frontend `.env` (Production)

```env
# App Configuration
VITE_APP_NAME=MenuQR
VITE_APP_URL=https://app.menuqr.bf
VITE_APP_VERSION=1.0.0

# API Configuration
VITE_API_URL=https://api.menuqr.bf/api/v1

# Restaurant Configuration
VITE_RESTAURANT_SLUG=garbadrome-patte-doie
VITE_WHATSAPP_NUMBER=22606336696

# Cloudinary
VITE_CLOUDINARY_CLOUD_NAME=menuqr
VITE_CLOUDINARY_UPLOAD_PRESET=menuqr-upload

# Analytics & Monitoring
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
VITE_GA_TRACKING_ID=G-XXXXXXXXXX

# Feature Flags
VITE_ENABLE_PWA=true
VITE_ENABLE_OFFLINE=true
VITE_ENABLE_ANALYTICS=true

# Debug Mode
VITE_DEBUG=false
```

---

## Security Best Practices

1. **Never commit `.env` files** - They are in `.gitignore` by default
2. **Use strong secrets** - Generate with `openssl rand -hex 64`
3. **Rotate secrets periodically** - Especially JWT secrets
4. **Use different secrets per environment** - Dev, staging, production
5. **Store production secrets securely** - Use secret managers (AWS Secrets Manager, HashiCorp Vault, etc.)
6. **Limit CORS origins** - Only allow your domains in production
7. **Enable CAPTCHA in production** - Prevents automated attacks
