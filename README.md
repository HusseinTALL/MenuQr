# MenuQR - Digital Menu Platform

A comprehensive digital menu and restaurant management platform designed for restaurants in Burkina Faso. MenuQR enables customers to browse menus, place orders, make reservations, and earn loyalty points via a modern PWA interface.

## Features

### Customer Features
- **Digital Menu** - Interactive menu with categories, dishes, and customization options
- **Order via WhatsApp** - Direct order submission via WhatsApp
- **Scheduled Orders** - Pre-order for future pickup/delivery
- **Reservations** - Table booking with real-time availability
- **Loyalty Program** - Earn and redeem points on purchases
- **Reviews** - Rate restaurants and dishes
- **PWA Support** - Install as native app, works offline

### Admin Features
- **Dashboard** - Analytics and key metrics overview
- **Menu Management** - Categories, dishes, availability
- **Order Management** - Real-time order tracking and status updates
- **Table Management** - Configure tables and locations
- **Reservation System** - Manage bookings and table assignments
- **Campaign System** - SMS marketing campaigns
- **Review Moderation** - Approve/reject customer reviews
- **QR Code Generation** - Generate menu QR codes

### Super Admin Features
- **Multi-Restaurant Management** - Manage multiple restaurants
- **User Management** - Admin user CRUD
- **System Monitoring** - Health checks and alerts

---

## Tech Stack

### Backend (`menuqr-api`)
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js 5
- **Database**: MongoDB 7+ with Mongoose 9
- **Authentication**: JWT with refresh tokens
- **Real-time**: Socket.IO
- **Image Storage**: Cloudinary
- **Security**: Helmet, CORS, rate limiting, bcrypt
- **Validation**: express-validator

### Frontend (`menuqr-app`)
- **Framework**: Vue 3 with TypeScript
- **Build Tool**: Vite 7
- **UI Library**: Ant Design Vue 4 + Tailwind CSS 4
- **State Management**: Pinia with persisted state
- **Routing**: Vue Router 4
- **i18n**: Vue I18n (FR/EN)
- **PWA**: vite-plugin-pwa + Workbox
- **Charts**: Chart.js + vue-chartjs
- **QR Codes**: qrcode + vue-qrcode-reader

---

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 7+ (local or Docker)
- npm 9+

### 1. Clone and Setup

```bash
git clone <repository-url>
cd MenuQR
```

### 2. Start MongoDB (using Docker)

```bash
cd menuqr-api
docker-compose up -d
```

Or install MongoDB locally and start the service.

### 3. Setup Backend

```bash
cd menuqr-api

# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env
# Edit .env with your settings (see docs/ENV.md for details)

# Seed database with sample data (optional)
npm run seed

# Start development server
npm run dev
```

The API will be available at `http://localhost:3001`

### 4. Setup Frontend

```bash
cd menuqr-app

# Install dependencies
npm install

# Copy environment file and configure
cp .env.example .env
# Edit .env with your settings

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

---

## Project Structure

```
MenuQR/
├── menuqr-api/           # Backend API
│   ├── src/
│   │   ├── config/       # Configuration (database, env)
│   │   ├── controllers/  # Route handlers
│   │   ├── middleware/   # Express middleware
│   │   ├── models/       # Mongoose models
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── validators/   # Request validation
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Utilities
│   ├── docker-compose.yml
│   └── package.json
│
├── menuqr-app/           # Frontend PWA
│   ├── src/
│   │   ├── components/   # Vue components
│   │   ├── composables/  # Vue composables
│   │   ├── layouts/      # Page layouts
│   │   ├── plugins/      # Vue plugins
│   │   ├── router/       # Vue Router config
│   │   ├── services/     # API services
│   │   ├── stores/       # Pinia stores
│   │   ├── styles/       # Global styles
│   │   ├── types/        # TypeScript types
│   │   ├── utils/        # Utilities
│   │   └── views/        # Page views
│   ├── public/           # Static assets
│   └── package.json
│
├── docs/                 # Documentation
│   ├── API.md            # API endpoints reference
│   ├── ENV.md            # Environment variables
│   └── DEPLOYMENT.md     # Deployment guide
│
└── README.md             # This file
```

---

## Available Scripts

### Backend (`menuqr-api`)

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm start            # Start production server
npm run seed         # Seed database with sample data
npm run lint         # Run ESLint
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

### Frontend (`menuqr-app`)

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run type-check   # TypeScript type checking
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run format       # Format code with Prettier
npm test             # Run unit tests
npm run test:run     # Run tests once
npm run test:coverage # Run tests with coverage
npm run test:e2e     # Run E2E tests with Playwright
```

---

## API Documentation

See [docs/API.md](docs/API.md) for complete API reference.

### Quick Reference

| Domain | Base Path | Description |
|--------|-----------|-------------|
| Auth | `/api/v1/auth` | Admin/Staff authentication |
| Customer Auth | `/api/v1/customer/auth` | Customer authentication |
| Restaurants | `/api/v1/restaurants` | Restaurant management |
| Categories | `/api/v1/categories` | Menu categories |
| Dishes | `/api/v1/dishes` | Menu dishes |
| Orders | `/api/v1/orders` | Order management |
| Reservations | `/api/v1/reservations` | Reservation management |
| Tables | `/api/v1/tables` | Table management |
| Reviews | `/api/v1/reviews` | Review system |
| Loyalty | `/api/v1/loyalty` | Loyalty program |
| Campaigns | `/api/v1/campaigns` | SMS campaigns |

---

## Environment Variables

See [docs/ENV.md](docs/ENV.md) for complete environment variables reference.

### Minimum Required

**Backend (.env)**
```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/menuqr
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:3001/api/v1
VITE_APP_NAME=MenuQR
```

---

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for complete deployment guide.

### Quick Deploy

**Backend**: Deploy to any Node.js hosting (Railway, Render, DigitalOcean, AWS)
**Frontend**: Deploy to any static hosting (Netlify, Vercel, Cloudflare Pages)
**Database**: MongoDB Atlas (recommended) or self-hosted

---

## Security Features

- JWT authentication with refresh token rotation
- Token blacklisting on logout
- Password hashing with bcrypt
- Rate limiting on all endpoints
- Account lockout after failed attempts
- CAPTCHA support (reCAPTCHA, hCaptcha, Turnstile)
- XSS protection
- NoSQL injection prevention
- Security headers (Helmet)
- CORS configuration

---

## Contributing

This project is currently in private development.

## License

Proprietary - All rights reserved (c) 2024-2025 MenuQR

---

## Support

- Email: contact@menuqr.bf
- Documentation: See `/docs` folder

---

Developed with care in Burkina Faso
