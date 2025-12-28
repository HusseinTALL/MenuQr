# MenuQR API

Backend API for the MenuQR restaurant menu management system.

> **Full Documentation**: See [../docs/API.md](../docs/API.md) for complete API reference.

## Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js 5
- **Database**: MongoDB 7+ with Mongoose 9
- **Authentication**: JWT with refresh token rotation
- **Real-time**: Socket.IO
- **Validation**: express-validator
- **Security**: Helmet, CORS, bcrypt, rate limiting
- **Image Storage**: Cloudinary
- **Error Tracking**: Sentry

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 7+ (local or Docker)
- npm 9+

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration (see ../docs/ENV.md)
```

### Start MongoDB with Docker

```bash
docker-compose up -d
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Seed database with sample data
npm run seed
```

### Production

```bash
# Build
npm run build

# Start
npm start
```

## Available Scripts

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Build for production
npm start            # Start production server
npm run seed         # Seed database with sample data
npm run lint         # Run ESLint
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

## API Endpoints Overview

| Domain | Base Path | Description |
|--------|-----------|-------------|
| Auth | `/api/v1/auth` | Admin/Staff authentication |
| Customer Auth | `/api/v1/customer/auth` | Customer authentication |
| Restaurants | `/api/v1/restaurants` | Restaurant management |
| Categories | `/api/v1/categories` | Menu categories |
| Dishes | `/api/v1/dishes` | Menu dishes |
| Orders | `/api/v1/orders` | Order management |
| Scheduled Orders | `/api/v1/scheduled-orders` | Pre-scheduled orders |
| Reservations | `/api/v1/reservations` | Table reservations |
| Tables | `/api/v1/tables` | Table management |
| Reviews | `/api/v1/reviews` | Review system |
| Loyalty | `/api/v1/loyalty` | Loyalty program |
| Campaigns | `/api/v1/campaigns` | SMS campaigns |
| Upload | `/api/v1/upload` | Image upload |
| Customer | `/api/v1/customer/*` | Customer endpoints |
| Super Admin | `/api/v1/superadmin` | Super admin management |

> **Complete API Documentation**: [../docs/API.md](../docs/API.md)

## Environment Variables

See [../docs/ENV.md](../docs/ENV.md) for complete reference.

### Minimum Required

```env
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/menuqr
JWT_SECRET=your-secret-key-minimum-32-characters
CORS_ORIGIN=http://localhost:5173
```

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
│   └── superAdmin/  # Super admin controllers
├── middleware/      # Express middleware
├── models/          # Mongoose models
├── routes/          # API routes
├── services/        # Business logic services
├── types/           # TypeScript types
├── utils/           # Utility functions
├── validators/      # Request validators
├── app.ts           # Express app setup
└── index.ts         # Entry point
```

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

## Deployment

See [../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) for deployment instructions.

## License

MIT
