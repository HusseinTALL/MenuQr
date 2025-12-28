# MenuQR API Reference

Complete API documentation for the MenuQR backend.

**Base URL**: `http://localhost:3001/api/v1`

**Content-Type**: `application/json`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Customer Authentication](#customer-authentication)
3. [Restaurants](#restaurants)
4. [Menu](#menu)
5. [Categories](#categories)
6. [Dishes](#dishes)
7. [Orders](#orders)
8. [Scheduled Orders](#scheduled-orders)
9. [Reservations](#reservations)
10. [Tables](#tables)
11. [Reviews](#reviews)
12. [Loyalty Program](#loyalty-program)
13. [Campaigns](#campaigns)
14. [Customer Profile](#customer-profile)
15. [Upload](#upload)
16. [Health Check](#health-check)

---

## Authentication Headers

### Admin/Staff Authentication
```
Authorization: Bearer <access_token>
```

### Customer Authentication
```
Authorization: Bearer <customer_access_token>
```

---

## Response Format

All responses follow this structure:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

Error responses:
```json
{
  "success": false,
  "message": "Error description",
  "errors": [{ "field": "email", "message": "Invalid email" }]
}
```

---

## 1. Authentication

Admin and staff authentication endpoints.

### Register Admin
```
POST /auth/register
```

**Body:**
```json
{
  "email": "admin@restaurant.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+22670123456"
}
```

### Login
```
POST /auth/login
```

**Body:**
```json
{
  "email": "admin@restaurant.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "role": "owner" },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

### Refresh Token
```
POST /auth/refresh-token
```

**Body:**
```json
{
  "refreshToken": "eyJhbG..."
}
```

### Logout
```
POST /auth/logout
Authorization: Bearer <token>
```

### Get Profile
```
GET /auth/profile
Authorization: Bearer <token>
```

### Update Profile
```
PUT /auth/profile
Authorization: Bearer <token>
```

**Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+22670123456"
}
```

### Change Password
```
PUT /auth/change-password
Authorization: Bearer <token>
```

**Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

---

## 2. Customer Authentication

Customer (end-user) authentication endpoints.

### Send OTP
```
POST /customer/auth/send-otp
```

**Body:**
```json
{
  "phone": "+22670123456"
}
```

### Verify OTP
```
POST /customer/auth/verify-otp
```

**Body:**
```json
{
  "phone": "+22670123456",
  "code": "123456"
}
```

### Register Customer
```
POST /customer/auth/register
```

**Body:**
```json
{
  "phone": "+22670123456",
  "email": "customer@email.com",
  "firstName": "Jane",
  "lastName": "Doe",
  "password": "SecurePass123!"
}
```

### Login Customer
```
POST /customer/auth/login
```

**Body:**
```json
{
  "phone": "+22670123456",
  "password": "SecurePass123!"
}
```

### Customer Refresh Token
```
POST /customer/auth/refresh-token
```

### Customer Logout
```
POST /customer/auth/logout
Authorization: Bearer <customer_token>
```

### Get Customer Profile
```
GET /customer/auth/profile
Authorization: Bearer <customer_token>
```

### Update Customer Profile
```
PUT /customer/auth/profile
Authorization: Bearer <customer_token>
```

### Forgot Password
```
POST /customer/auth/forgot-password
```

### Reset Password
```
POST /customer/auth/reset-password
```

---

## 3. Restaurants

### List All Restaurants
```
GET /restaurants
```

**Query Parameters:**
- `page` (number) - Page number
- `limit` (number) - Items per page
- `search` (string) - Search term

### Get Restaurant by ID
```
GET /restaurants/:id
```

### Get Restaurant by Slug
```
GET /restaurants/slug/:slug
```

### Get Restaurant Menu
```
GET /restaurants/:id/menu
```

Returns full menu with categories and dishes.

### Create Restaurant (Auth Required)
```
POST /restaurants
Authorization: Bearer <token>
```

**Body:**
```json
{
  "name": "Restaurant Name",
  "slug": "restaurant-name",
  "description": "Description",
  "address": "123 Main St",
  "phone": "+22670123456",
  "whatsappNumber": "+22670123456",
  "openingHours": {
    "monday": { "open": "08:00", "close": "22:00" }
  }
}
```

### Update Restaurant (Auth Required)
```
PUT /restaurants/:id
Authorization: Bearer <token>
```

### Delete Restaurant (Auth Required)
```
DELETE /restaurants/:id
Authorization: Bearer <token>
```

---

## 4. Menu

### Get Full Menu by Restaurant ID
```
GET /menu/restaurant/:id
```

### Get Full Menu by Slug
```
GET /menu/slug/:slug
```

---

## 5. Categories

### List Categories by Restaurant
```
GET /categories/restaurant/:restaurantId
```

### Get Category by ID
```
GET /categories/:id
```

### Create Category (Auth Required)
```
POST /categories
Authorization: Bearer <token>
```

**Body:**
```json
{
  "name": "Entrées",
  "description": "Appetizers",
  "restaurantId": "...",
  "order": 1,
  "isActive": true
}
```

### Update Category (Auth Required)
```
PUT /categories/:id
Authorization: Bearer <token>
```

### Delete Category (Auth Required)
```
DELETE /categories/:id
Authorization: Bearer <token>
```

### Reorder Categories (Auth Required)
```
PUT /categories/reorder
Authorization: Bearer <token>
```

**Body:**
```json
{
  "categories": [
    { "id": "...", "order": 1 },
    { "id": "...", "order": 2 }
  ]
}
```

---

## 6. Dishes

### List Dishes by Restaurant
```
GET /dishes/restaurant/:restaurantId
```

**Query Parameters:**
- `category` (string) - Filter by category ID
- `available` (boolean) - Filter by availability
- `search` (string) - Search term

### Get Dish by ID
```
GET /dishes/:id
```

### Create Dish (Auth Required)
```
POST /dishes
Authorization: Bearer <token>
```

**Body:**
```json
{
  "name": "Poulet Braisé",
  "description": "Grilled chicken with plantains",
  "price": 3500,
  "categoryId": "...",
  "restaurantId": "...",
  "image": "https://...",
  "isAvailable": true,
  "options": [
    {
      "name": "Sauce",
      "type": "single",
      "required": false,
      "choices": [
        { "name": "Piment", "price": 0 },
        { "name": "Tomate", "price": 200 }
      ]
    }
  ]
}
```

### Update Dish (Auth Required)
```
PUT /dishes/:id
Authorization: Bearer <token>
```

### Delete Dish (Auth Required)
```
DELETE /dishes/:id
Authorization: Bearer <token>
```

### Toggle Dish Availability (Auth Required)
```
PATCH /dishes/:id/availability
Authorization: Bearer <token>
```

---

## 7. Orders

### Create Order (Public)
```
POST /orders
```

**Body:**
```json
{
  "restaurantId": "...",
  "items": [
    {
      "dishId": "...",
      "quantity": 2,
      "selectedOptions": [
        { "optionName": "Sauce", "choiceName": "Piment" }
      ],
      "specialInstructions": "Extra spicy"
    }
  ],
  "tableNumber": "5",
  "customerPhone": "+22670123456",
  "orderType": "dine-in",
  "specialInstructions": "Birthday celebration"
}
```

### List Orders (Auth Required)
```
GET /orders
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` - pending, confirmed, preparing, ready, served, completed, cancelled
- `orderType` - dine-in, takeaway, delivery
- `startDate` - ISO date string
- `endDate` - ISO date string
- `page` (number)
- `limit` (number)

### Get Active Orders (Auth Required)
```
GET /orders/active
Authorization: Bearer <token>
```

### Get Order Statistics (Auth Required)
```
GET /orders/stats
Authorization: Bearer <token>
```

### Get Order by ID
```
GET /orders/:id
```

### Get Order by Number
```
GET /orders/number/:orderNumber
```

### Update Order Status (Auth Required)
```
PATCH /orders/:id/status
Authorization: Bearer <token>
```

**Body:**
```json
{
  "status": "preparing"
}
```

---

## 8. Scheduled Orders

### Get Availability (Public)
```
GET /scheduled-orders/:restaurantId/availability
```

### Get Time Slots (Public)
```
GET /scheduled-orders/:restaurantId/slots
```

**Query Parameters:**
- `date` - YYYY-MM-DD format

### Get Settings (Auth Required)
```
GET /scheduled-orders/settings
Authorization: Bearer <token>
```

### Update Settings (Auth Required)
```
PUT /scheduled-orders/settings
Authorization: Bearer <token>
```

### Get Scheduled Orders (Auth Required)
```
GET /scheduled-orders
Authorization: Bearer <token>
```

### Get Calendar Data (Auth Required)
```
GET /scheduled-orders/calendar
Authorization: Bearer <token>
```

### Customer: Get My Scheduled Orders
```
GET /customer/scheduled-orders
Authorization: Bearer <customer_token>
```

### Customer: Cancel Scheduled Order
```
PUT /customer/scheduled-orders/:id/cancel
Authorization: Bearer <customer_token>
```

---

## 9. Reservations

### Customer Endpoints

#### Get Available Dates (Public)
```
GET /customer/reservations/:restaurantId/availability/dates
```

#### Get Available Slots (Public)
```
GET /customer/reservations/:restaurantId/availability/slots
```

**Query Parameters:**
- `date` - YYYY-MM-DD format

#### Create Reservation
```
POST /customer/reservations/:restaurantId
Authorization: Bearer <customer_token> (optional)
```

**Body:**
```json
{
  "date": "2025-01-15",
  "time": "19:00",
  "partySize": 4,
  "customerName": "John Doe",
  "customerPhone": "+22670123456",
  "customerEmail": "john@email.com",
  "specialRequests": "Birthday celebration"
}
```

#### Get My Reservations
```
GET /customer/reservations/me
Authorization: Bearer <customer_token>
```

#### Get My Reservation
```
GET /customer/reservations/me/:id
Authorization: Bearer <customer_token>
```

#### Cancel My Reservation
```
PUT /customer/reservations/me/:id/cancel
Authorization: Bearer <customer_token>
```

### Admin Endpoints

#### Get Today's Reservations
```
GET /reservations/today
Authorization: Bearer <token>
```

#### Get Reservation Statistics
```
GET /reservations/stats
Authorization: Bearer <token>
```

#### List All Reservations
```
GET /reservations
Authorization: Bearer <token>
```

#### Create Reservation (Admin)
```
POST /reservations
Authorization: Bearer <token>
```

#### Get Reservation
```
GET /reservations/:id
Authorization: Bearer <token>
```

#### Update Reservation
```
PUT /reservations/:id
Authorization: Bearer <token>
```

#### Confirm Reservation
```
PUT /reservations/:id/confirm
Authorization: Bearer <token>
```

#### Assign Table
```
PUT /reservations/:id/assign-table
Authorization: Bearer <token>
```

**Body:**
```json
{
  "tableId": "..."
}
```

#### Mark Arrived
```
PUT /reservations/:id/arrived
Authorization: Bearer <token>
```

#### Mark Seated
```
PUT /reservations/:id/seated
Authorization: Bearer <token>
```

#### Mark Completed
```
PUT /reservations/:id/completed
Authorization: Bearer <token>
```

#### Mark No-Show
```
PUT /reservations/:id/no-show
Authorization: Bearer <token>
```

#### Cancel Reservation (Admin)
```
PUT /reservations/:id/cancel
Authorization: Bearer <token>
```

---

## 10. Tables

All endpoints require authentication.

### List Tables
```
GET /tables
Authorization: Bearer <token>
```

### Get Table Statistics
```
GET /tables/stats
Authorization: Bearer <token>
```

### Get Tables by Location
```
GET /tables/location/:location
Authorization: Bearer <token>
```

### Get Table by ID
```
GET /tables/:id
Authorization: Bearer <token>
```

### Create Table
```
POST /tables
Authorization: Bearer <token>
```

**Body:**
```json
{
  "number": "T1",
  "capacity": 4,
  "location": "terrace",
  "isActive": true
}
```

### Bulk Create Tables
```
POST /tables/bulk
Authorization: Bearer <token>
```

**Body:**
```json
{
  "tables": [
    { "number": "T1", "capacity": 4, "location": "terrace" },
    { "number": "T2", "capacity": 2, "location": "indoor" }
  ]
}
```

### Reorder Tables
```
PUT /tables/reorder
Authorization: Bearer <token>
```

### Update Table
```
PUT /tables/:id
Authorization: Bearer <token>
```

### Toggle Table Status
```
PUT /tables/:id/toggle
Authorization: Bearer <token>
```

### Delete Table
```
DELETE /tables/:id
Authorization: Bearer <token>
```

---

## 11. Reviews

### Public Endpoints

#### Get Restaurant Reviews
```
GET /reviews/restaurant/:restaurantId
```

**Query Parameters:**
- `page` (number)
- `limit` (number)
- `sort` - recent, rating_high, rating_low, helpful

#### Get Dish Reviews
```
GET /reviews/dish/:dishId
```

#### Get Restaurant Review Statistics
```
GET /reviews/restaurant/:restaurantId/stats
```

#### Get Review by ID
```
GET /reviews/:id
```

#### Check if Customer Can Review
```
GET /reviews/can-review
Authorization: Bearer <customer_token> (optional)
```

### Customer Endpoints

#### Get My Reviews
```
GET /customer/reviews/me
Authorization: Bearer <customer_token>
```

#### Create Review
```
POST /customer/reviews
Authorization: Bearer <customer_token>
```

**Body:**
```json
{
  "restaurantId": "...",
  "orderId": "...",
  "dishId": "...",
  "rating": 5,
  "comment": "Excellent food and service!",
  "photos": ["https://..."]
}
```

#### Update Review
```
PUT /customer/reviews/:id
Authorization: Bearer <customer_token>
```

#### Delete Review
```
DELETE /customer/reviews/:id
Authorization: Bearer <customer_token>
```

#### Mark Review as Helpful
```
POST /customer/reviews/:id/helpful
Authorization: Bearer <customer_token>
```

#### Report Review
```
POST /customer/reviews/:id/report
Authorization: Bearer <customer_token>
```

**Body:**
```json
{
  "reason": "inappropriate"
}
```

### Admin Endpoints

#### Get All Reviews
```
GET /admin/reviews
Authorization: Bearer <token>
```

#### Get Pending Reviews
```
GET /admin/reviews/pending
Authorization: Bearer <token>
```

#### Get Admin Statistics
```
GET /admin/reviews/stats
Authorization: Bearer <token>
```

#### Approve Review
```
PUT /admin/reviews/:id/approve
Authorization: Bearer <token>
```

#### Reject Review
```
PUT /admin/reviews/:id/reject
Authorization: Bearer <token>
```

**Body:**
```json
{
  "reason": "Violates community guidelines"
}
```

#### Respond to Review
```
PUT /admin/reviews/:id/respond
Authorization: Bearer <token>
```

**Body:**
```json
{
  "response": "Thank you for your feedback!"
}
```

#### Delete Review (Admin)
```
DELETE /admin/reviews/:id
Authorization: Bearer <token>
```

---

## 12. Loyalty Program

### Customer Endpoints

#### Get My Loyalty Info
```
GET /customer/loyalty/me
Authorization: Bearer <customer_token>
```

#### Get My Points History
```
GET /customer/loyalty/me/history
Authorization: Bearer <customer_token>
```

**Query Parameters:**
- `page` (number)
- `limit` (number)
- `type` - earn, redeem, expire, bonus, adjust

#### Redeem Points
```
POST /customer/loyalty/me/redeem
Authorization: Bearer <customer_token>
```

**Body:**
```json
{
  "points": 500,
  "rewardId": "..."
}
```

#### Get Expiring Points
```
GET /customer/loyalty/me/expiring
Authorization: Bearer <customer_token>
```

### Admin Endpoints

#### Get Loyalty Statistics
```
GET /loyalty/stats
Authorization: Bearer <token>
```

#### Get Customers with Loyalty Info
```
GET /loyalty/customers
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number)
- `limit` (number)
- `tier` - bronze, silver, gold, platinum
- `search` (string)

#### Get Customer Loyalty Info
```
GET /loyalty/customers/:customerId
Authorization: Bearer <token>
```

#### Get Customer History
```
GET /loyalty/customers/:customerId/history
Authorization: Bearer <token>
```

#### Adjust Customer Points
```
POST /loyalty/customers/:customerId/adjust
Authorization: Bearer <token>
```

**Body:**
```json
{
  "points": -100,
  "reason": "Correction for invalid transaction"
}
```

#### Add Bonus Points
```
POST /loyalty/customers/:customerId/bonus
Authorization: Bearer <token>
```

**Body:**
```json
{
  "points": 500,
  "reason": "Birthday bonus"
}
```

#### Trigger Point Expiration
```
POST /loyalty/expire-points
Authorization: Bearer <token>
```

---

## 13. Campaigns

All endpoints require owner/admin authentication.

### Create Campaign
```
POST /campaigns
Authorization: Bearer <token>
```

**Body:**
```json
{
  "name": "Weekend Special",
  "type": "sms",
  "content": "Get 20% off this weekend!",
  "targetAudience": {
    "tier": ["gold", "platinum"],
    "minPoints": 100
  },
  "scheduledAt": "2025-01-15T10:00:00Z"
}
```

### List Campaigns
```
GET /campaigns
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` - draft, scheduled, sending, completed, cancelled
- `type` - sms, email, push
- `page` (number)
- `limit` (number)

### Get Campaign Statistics
```
GET /campaigns/stats
Authorization: Bearer <token>
```

### Get Campaign by ID
```
GET /campaigns/:id
Authorization: Bearer <token>
```

### Update Campaign
```
PUT /campaigns/:id
Authorization: Bearer <token>
```

### Delete Campaign
```
DELETE /campaigns/:id
Authorization: Bearer <token>
```

### Send Campaign
```
POST /campaigns/:id/send
Authorization: Bearer <token>
```

### Cancel Campaign
```
POST /campaigns/:id/cancel
Authorization: Bearer <token>
```

---

## 14. Customer Profile

All endpoints require customer authentication.

### Favorites

#### Get Favorites
```
GET /customer/favorites
Authorization: Bearer <customer_token>
```

#### Add Favorite
```
POST /customer/favorites/:dishId
Authorization: Bearer <customer_token>
```

#### Remove Favorite
```
DELETE /customer/favorites/:dishId
Authorization: Bearer <customer_token>
```

#### Check if Favorite
```
GET /customer/favorites/:dishId/check
Authorization: Bearer <customer_token>
```

### Addresses

#### Get Addresses
```
GET /customer/addresses
Authorization: Bearer <customer_token>
```

#### Add Address
```
POST /customer/addresses
Authorization: Bearer <customer_token>
```

**Body:**
```json
{
  "label": "Home",
  "address": "123 Main Street",
  "city": "Ouagadougou",
  "instructions": "Gate code: 1234"
}
```

#### Update Address
```
PUT /customer/addresses/:addressId
Authorization: Bearer <customer_token>
```

#### Delete Address
```
DELETE /customer/addresses/:addressId
Authorization: Bearer <customer_token>
```

#### Set Default Address
```
PUT /customer/addresses/:addressId/default
Authorization: Bearer <customer_token>
```

### Order History

#### Get Order History
```
GET /customer/orders
Authorization: Bearer <customer_token>
```

**Query Parameters:**
- `page` (number)
- `limit` (number, max 50)
- `status` - pending, confirmed, preparing, ready, served, completed, cancelled

#### Get Order Details
```
GET /customer/orders/:orderId
Authorization: Bearer <customer_token>
```

#### Reorder
```
POST /customer/orders/:orderId/reorder
Authorization: Bearer <customer_token>
```

### Statistics

#### Get Customer Statistics
```
GET /customer/stats
Authorization: Bearer <customer_token>
```

---

## 15. Upload

### Upload Image
```
POST /upload/image
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `image` - Image file (JPEG, PNG, WebP, max 5MB)

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/...",
    "publicId": "menuqr/..."
  }
}
```

### Delete Image
```
DELETE /upload/image
Authorization: Bearer <token>
```

**Body:**
```json
{
  "url": "https://res.cloudinary.com/..."
}
```

---

## 16. Health Check

### API Health
```
GET /health
```

**Response:**
```json
{
  "success": true,
  "message": "MenuQR API is running",
  "timestamp": "2025-01-01T12:00:00.000Z"
}
```

### CAPTCHA Configuration
```
GET /captcha-config
```

Returns CAPTCHA configuration for frontend.

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 409 | Conflict - Duplicate resource |
| 422 | Unprocessable Entity - Validation failed |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| Authentication | 10 req/min |
| Public | 100 req/min |
| Authenticated | 300 req/min |
| Admin | 500 req/min |
