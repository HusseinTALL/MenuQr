# MenuQR API

Backend API for the MenuQR restaurant menu management system.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js 5
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: express-validator
- **Security**: Helmet, CORS, bcrypt

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 6+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
```

### Development

```bash
# Start development server with hot reload
npm run dev
```

### Production

```bash
# Build
npm run build

# Start
npm start
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/refresh-token` | Refresh access token |
| POST | `/api/v1/auth/logout` | User logout |
| GET | `/api/v1/auth/profile` | Get user profile |
| PUT | `/api/v1/auth/profile` | Update profile |
| PUT | `/api/v1/auth/change-password` | Change password |

### Restaurants

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/restaurants` | List all restaurants |
| GET | `/api/v1/restaurants/:id` | Get restaurant by ID |
| GET | `/api/v1/restaurants/:id/menu` | Get full menu with categories and dishes |
| GET | `/api/v1/restaurants/slug/:slug` | Get restaurant by slug |
| POST | `/api/v1/restaurants` | Create restaurant (auth) |
| PUT | `/api/v1/restaurants/:id` | Update restaurant (auth) |
| DELETE | `/api/v1/restaurants/:id` | Delete restaurant (auth) |

### Menu

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/menu/restaurant/:id` | Get full menu by restaurant ID |
| GET | `/api/v1/menu/slug/:slug` | Get full menu by restaurant slug |

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/categories/restaurant/:restaurantId` | List categories by restaurant |
| GET | `/api/v1/categories/:id` | Get category by ID |
| POST | `/api/v1/categories` | Create category (auth) |
| PUT | `/api/v1/categories/:id` | Update category (auth) |
| DELETE | `/api/v1/categories/:id` | Delete category (auth) |
| PUT | `/api/v1/categories/reorder` | Reorder categories (auth) |

### Dishes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/dishes/restaurant/:restaurantId` | List dishes by restaurant |
| GET | `/api/v1/dishes/:id` | Get dish by ID |
| POST | `/api/v1/dishes` | Create dish (auth) |
| PUT | `/api/v1/dishes/:id` | Update dish (auth) |
| DELETE | `/api/v1/dishes/:id` | Delete dish (auth) |
| PATCH | `/api/v1/dishes/:id/availability` | Toggle availability (auth) |

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/orders` | Create order (public) |
| GET | `/api/v1/orders` | List orders (auth) |
| GET | `/api/v1/orders/active` | Get active orders (auth) |
| GET | `/api/v1/orders/stats` | Get order statistics (auth) |
| GET | `/api/v1/orders/:id` | Get order by ID |
| GET | `/api/v1/orders/number/:orderNumber` | Get order by number |
| PATCH | `/api/v1/orders/:id/status` | Update order status (auth) |

## Environment Variables

```env
# Server
PORT=3001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/menuqr

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# CORS
CORS_ORIGIN=http://localhost:3000
```

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Express middleware
├── models/          # Mongoose models
├── routes/          # API routes
├── types/           # TypeScript types
├── utils/           # Utility functions
├── validators/      # Request validators
├── app.ts           # Express app setup
└── index.ts         # Entry point
```

## License

MIT
