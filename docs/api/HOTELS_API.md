# Hotels Module API Documentation

## Overview

The Hotels Module enables hotels to offer in-room dining and room service through QR code menus. This documentation covers all API endpoints for hotel management, room operations, guest authentication, menu management, and order processing.

**Base URL:** `/api/v1`

**Authentication:** Most endpoints require JWT authentication via `Authorization: Bearer <token>` header.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Hotel Management](#2-hotel-management)
3. [Room Management](#3-room-management)
4. [Guest Management](#4-guest-management)
5. [Guest Authentication (Public)](#5-guest-authentication-public)
6. [Menu Management](#6-menu-management)
7. [Order Management](#7-order-management)
8. [Error Handling](#8-error-handling)

---

## 1. Authentication

### Hotel Staff Login

Standard authentication using the existing auth system with hotel-specific roles.

**Roles:**
| Role | Description | Permissions |
|------|-------------|-------------|
| `hotel_owner` | Hotel owner | Full access to hotel |
| `hotel_manager` | Hotel manager | Operations + settings |
| `reception` | Reception staff | Guest check-in, orders view |
| `room_service` | Room service staff | Delivery + order status |
| `hotel_kitchen` | Kitchen staff | KDS + order status |

---

## 2. Hotel Management

### Get Current Hotel

Retrieve the hotel associated with the authenticated user.

```http
GET /hotels/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "6953b476b7da541fba33943e",
    "name": "Grand Hotel Paris",
    "slug": "grand-hotel-paris",
    "description": {
      "fr": "Un hôtel de luxe au cœur de Paris",
      "en": "A luxury hotel in the heart of Paris"
    },
    "starRating": 5,
    "address": {
      "street": "1 Avenue des Champs-Élysées",
      "city": "Paris",
      "postalCode": "75008",
      "country": "France"
    },
    "phone": "+33140000000",
    "email": "contact@grandhotelparis.com",
    "settings": {
      "currency": "EUR",
      "timezone": "Europe/Paris",
      "defaultLanguage": "fr",
      "availableLanguages": ["fr", "en"],
      "roomService": {
        "enabled": true,
        "availableHours": { "start": "06:00", "end": "23:00" },
        "minimumOrder": 0,
        "deliveryFee": 0,
        "serviceChargePercent": 10
      },
      "payment": {
        "roomCharge": true,
        "cardOnDelivery": true,
        "onlinePayment": false,
        "cashOnDelivery": true
      }
    },
    "isActive": true,
    "createdAt": "2024-12-29T10:00:00.000Z"
  }
}
```

### Get Hotel by Slug (Public)

Retrieve hotel information by slug for public access (QR code landing).

```http
GET /hotels/slug/:slug
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "6953b476b7da541fba33943e",
    "name": "Grand Hotel Paris",
    "slug": "grand-hotel-paris",
    "logo": "https://cdn.example.com/logo.png",
    "settings": {
      "currency": "EUR",
      "defaultLanguage": "fr",
      "roomService": {
        "enabled": true,
        "availableHours": { "start": "06:00", "end": "23:00" }
      },
      "guestAuth": {
        "pinLength": 4,
        "requirePinForOrders": true,
        "allowAccessCodeAuth": true
      }
    }
  }
}
```

### Update Hotel

Update hotel information (owner only).

```http
PUT /hotels/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Grand Hotel Paris - Updated",
  "description": {
    "fr": "Description mise à jour",
    "en": "Updated description"
  },
  "phone": "+33140000001"
}
```

### Update Hotel Settings

Update hotel settings only.

```http
PATCH /hotels/:id/settings
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "roomService": {
    "enabled": true,
    "availableHours": { "start": "07:00", "end": "22:00" },
    "minimumOrder": 20,
    "deliveryFee": 5,
    "serviceChargePercent": 15
  }
}
```

### Get Hotel Statistics

Get hotel dashboard statistics.

```http
GET /hotels/:id/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRooms": 150,
    "occupiedRooms": 120,
    "availableRooms": 25,
    "maintenanceRooms": 5,
    "activeGuests": 180,
    "todayOrders": 45,
    "todayRevenue": 2350.50,
    "pendingOrders": 8,
    "averageOrderValue": 52.23
  }
}
```

---

## 3. Room Management

### List Rooms

Get all rooms for a hotel with optional filtering.

```http
GET /hotels/:hotelId/rooms
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: `available`, `occupied`, `cleaning`, `maintenance` |
| `floor` | number | Filter by floor number |
| `building` | string | Filter by building name |
| `roomType` | string | Filter by room type |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6953b5b05500d593137bf5f3",
      "roomNumber": "101",
      "floor": 1,
      "building": "Main",
      "roomType": "standard",
      "capacity": 2,
      "status": "available",
      "isRoomServiceEnabled": true,
      "qrCode": "QR-HOTEL-101-ABC123"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50
  }
}
```

### Create Room

Create a new room.

```http
POST /hotels/:hotelId/rooms
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "roomNumber": "201",
  "floor": 2,
  "building": "Main",
  "roomType": "deluxe",
  "capacity": 3,
  "description": {
    "fr": "Chambre deluxe avec vue",
    "en": "Deluxe room with view"
  },
  "amenities": ["wifi", "tv", "minibar", "balcony"],
  "isRoomServiceEnabled": true,
  "pricePerNight": 250
}
```

### Bulk Create Rooms

Create multiple rooms at once.

```http
POST /hotels/:hotelId/rooms/bulk
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "prefix": "",
  "startNumber": 301,
  "count": 10,
  "floor": 3,
  "building": "Main",
  "roomType": "standard",
  "capacity": 2,
  "isRoomServiceEnabled": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "created": 10,
    "rooms": ["301", "302", "303", "304", "305", "306", "307", "308", "309", "310"]
  }
}
```

### Update Room

Update room details.

```http
PUT /hotels/:hotelId/rooms/:roomId
Authorization: Bearer <token>
Content-Type: application/json
```

### Update Room Status

Quick status update for a room.

```http
PATCH /hotels/:hotelId/rooms/:roomId/status
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "cleaning"
}
```

**Valid Status Values:**
- `available` - Room is ready for guests
- `occupied` - Room has active guest
- `cleaning` - Room is being cleaned
- `maintenance` - Room is under maintenance
- `blocked` - Room is temporarily blocked

### Delete Room

Delete a room (only if not occupied).

```http
DELETE /hotels/:hotelId/rooms/:roomId
Authorization: Bearer <token>
```

### Get Room Status Summary

Get summary of room statuses for dashboard.

```http
GET /hotels/:hotelId/rooms/status-summary
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "available": 25,
    "occupied": 120,
    "cleaning": 3,
    "maintenance": 2,
    "blocked": 0,
    "total": 150
  }
}
```

### Lookup Room by QR Code (Public)

Get room info from QR code for guest landing page.

```http
GET /hotels/:hotelId/rooms/qr/:qrCode
```

**Response:**
```json
{
  "success": true,
  "data": {
    "roomId": "6953b5b05500d593137bf5f3",
    "roomNumber": "101",
    "floor": 1,
    "hotelName": "Grand Hotel Paris",
    "hotelSlug": "grand-hotel-paris",
    "isRoomServiceEnabled": true
  }
}
```

---

## 4. Guest Management

### List Guests

Get all guests for a hotel.

```http
GET /hotels/:hotelId/guests
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | `checked_in`, `checked_out`, `pending` |
| `roomNumber` | string | Filter by room number |
| `floor` | number | Filter by floor |

### Check-In Guest

Register a new guest and assign to a room.

```http
POST /hotels/:hotelId/guests
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Jean Dupont",
  "email": "jean.dupont@email.com",
  "phone": "+33600000000",
  "roomId": "6953b5b05500d593137bf5f3",
  "roomNumber": "101",
  "checkInDate": "2024-12-30T14:00:00.000Z",
  "checkOutDate": "2025-01-02T11:00:00.000Z",
  "preferredLanguage": "fr",
  "pin": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "6953b478b7da541fba3394b3",
    "name": "Jean Dupont",
    "roomNumber": "101",
    "accessCode": "ACJD2024",
    "status": "checked_in",
    "checkInDate": "2024-12-30T14:00:00.000Z",
    "checkOutDate": "2025-01-02T11:00:00.000Z"
  }
}
```

### Get Guest Details

Get a specific guest's information.

```http
GET /hotels/:hotelId/guests/:guestId
Authorization: Bearer <token>
```

### Update Guest

Update guest information.

```http
PUT /hotels/:hotelId/guests/:guestId
Authorization: Bearer <token>
Content-Type: application/json
```

### Check-Out Guest

Process guest check-out.

```http
POST /hotels/:hotelId/guests/:guestId/checkout
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "guestId": "6953b478b7da541fba3394b3",
    "name": "Jean Dupont",
    "roomNumber": "101",
    "status": "checked_out",
    "checkedOutAt": "2025-01-02T10:30:00.000Z",
    "totalOrders": 5,
    "totalSpent": 245.50
  }
}
```

### Transfer Guest to Another Room

Move guest to a different room.

```http
POST /hotels/:hotelId/guests/:guestId/transfer
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "newRoomId": "6953b5b05500d593137bf5f4",
  "newRoomNumber": "205",
  "reason": "Room upgrade"
}
```

### Extend Guest Stay

Extend the check-out date.

```http
POST /hotels/:hotelId/guests/:guestId/extend
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "newCheckOutDate": "2025-01-05T11:00:00.000Z"
}
```

---

## 5. Guest Authentication (Public)

These endpoints are used by guests scanning QR codes to access room service.

### Verify Room Access

Verify that a room exists and room service is available.

```http
POST /hotels/:hotelId/guest/verify-room
Content-Type: application/json
```

**Request Body:**
```json
{
  "roomNumber": "101"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "roomId": "6953b5b05500d593137bf5f3",
    "roomNumber": "101",
    "floor": 1,
    "isRoomServiceEnabled": true,
    "requiresAuth": true,
    "authMethods": ["pin", "accessCode"]
  }
}
```

### Authenticate with PIN

Authenticate guest using room PIN.

```http
POST /hotels/:hotelId/guest/auth/pin
Content-Type: application/json
```

**Request Body:**
```json
{
  "roomNumber": "101",
  "pin": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "guestToken": "eyJhbGciOiJIUzI1NiIs...",
    "guest": {
      "id": "6953b478b7da541fba3394b3",
      "name": "Jean Dupont",
      "roomNumber": "101"
    },
    "expiresAt": "2025-01-02T11:00:00.000Z"
  }
}
```

### Authenticate with Access Code

Authenticate guest using check-in access code.

```http
POST /hotels/:hotelId/guest/auth/code
Content-Type: application/json
```

**Request Body:**
```json
{
  "accessCode": "ACJD2024"
}
```

### Get Guest Session

Get current guest session information (requires guest token).

```http
GET /hotels/:hotelId/guest/session
Authorization: Bearer <guest-token>
```

---

## 6. Menu Management

### List Menus

Get all menus for a hotel.

```http
GET /hotels/:hotelId/menus
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | `room_service`, `breakfast`, `minibar`, `poolside` |
| `active` | boolean | Filter by active status |

### Get Menu (Public)

Get menu with categories and dishes for guest ordering.

```http
GET /hotels/:hotelId/menus/:menuId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "6953b478b7da541fba339467",
    "name": { "fr": "Room Service", "en": "Room Service" },
    "type": "room_service",
    "availability": {
      "isAlwaysAvailable": false,
      "schedule": {
        "start": "06:00",
        "end": "23:00"
      }
    },
    "categories": [
      {
        "_id": "6953b478b7da541fba33946c",
        "name": { "fr": "Petits déjeuners", "en": "Breakfast" },
        "dishes": [
          {
            "_id": "6953b478b7da541fba339481",
            "name": { "fr": "Croissant", "en": "Croissant" },
            "price": 4.50,
            "isAvailable": true
          }
        ]
      }
    ]
  }
}
```

### Create Menu

Create a new menu.

```http
POST /hotels/:hotelId/menus
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": { "fr": "Menu Piscine", "en": "Pool Menu" },
  "type": "poolside",
  "description": { "fr": "Snacks et boissons à la piscine" },
  "availability": {
    "isAlwaysAvailable": false,
    "schedule": { "start": "10:00", "end": "18:00" }
  },
  "isActive": true
}
```

### Create Category

Add a category to a menu.

```http
POST /hotels/:hotelId/menus/:menuId/categories
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": { "fr": "Salades", "en": "Salads" },
  "description": { "fr": "Salades fraîches" },
  "icon": "🥗",
  "order": 2,
  "isActive": true
}
```

### Create Dish

Add a dish to a category.

```http
POST /hotels/:hotelId/menus/:menuId/categories/:categoryId/dishes
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": { "fr": "Salade César", "en": "Caesar Salad" },
  "description": { "fr": "Laitue romaine, croûtons, parmesan" },
  "price": 18.50,
  "image": "https://cdn.example.com/caesar.jpg",
  "preparationTime": 15,
  "allergens": ["gluten", "dairy"],
  "options": [
    {
      "name": { "fr": "Supplément poulet", "en": "Add chicken" },
      "price": 5.00
    }
  ],
  "isAvailable": true,
  "isActive": true
}
```

### Update Dish Availability

Quick toggle for dish availability.

```http
PATCH /hotels/:hotelId/dishes/:dishId/availability
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "isAvailable": false
}
```

---

## 7. Order Management

### Create Order (Guest)

Place a new order.

```http
POST /hotels/:hotelId/orders
Authorization: Bearer <guest-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "items": [
    {
      "dishId": "6953b478b7da541fba339481",
      "quantity": 2,
      "selectedOptions": [0],
      "specialInstructions": "Extra sauce please"
    }
  ],
  "paymentMethod": "room_charge",
  "deliveryInstructions": "Please knock quietly",
  "scheduledFor": null
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "6953e4f5985385db963b7a86",
    "orderNumber": "H-20241230-001",
    "roomNumber": "101",
    "status": "pending",
    "items": [...],
    "subtotal": 47.00,
    "serviceCharge": 4.70,
    "total": 51.70,
    "estimatedDeliveryTime": "2024-12-30T15:30:00.000Z",
    "createdAt": "2024-12-30T15:05:00.000Z"
  }
}
```

### List Orders (Staff)

Get orders for kitchen display or management.

```http
GET /hotels/:hotelId/orders
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `floor` | number | Filter by floor |
| `roomNumber` | string | Filter by room |
| `date` | string | Filter by date (YYYY-MM-DD) |
| `assignedTo` | string | Filter by staff ID |

### Get Active Orders (KDS)

Get orders for kitchen display system.

```http
GET /hotels/:hotelId/orders/kitchen
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pending": [...],
    "confirmed": [...],
    "preparing": [...],
    "ready": [...]
  }
}
```

### Get Order Details

Get full order information.

```http
GET /hotels/:hotelId/orders/:orderId
Authorization: Bearer <token>
```

### Update Order Status

Update order status through workflow.

```http
PUT /hotels/:hotelId/orders/:orderId/status
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "preparing"
}
```

**Valid Status Transitions:**
| From | To |
|------|-----|
| `pending` | `confirmed`, `cancelled` |
| `confirmed` | `preparing`, `cancelled` |
| `preparing` | `ready`, `cancelled` |
| `ready` | `picked_up` |
| `picked_up` | `delivered` |
| `delivered` | `completed` |

### Assign Order to Staff

Assign order to room service staff.

```http
PUT /hotels/:hotelId/orders/:orderId/assign
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "staffId": "6953b476b7da541fba339440"
}
```

### Mark Order Delivered

Complete delivery with optional signature.

```http
POST /hotels/:hotelId/orders/:orderId/deliver
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "signature": "data:image/png;base64,...",
  "deliveryNote": "Left at door per guest request"
}
```

### Cancel Order

Cancel an order.

```http
POST /hotels/:hotelId/orders/:orderId/cancel
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "Guest requested cancellation"
}
```

### Rate Order (Guest)

Submit order rating and feedback.

```http
POST /hotels/:hotelId/orders/:orderId/rate
Authorization: Bearer <guest-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "rating": 5,
  "feedback": "Excellent service, very fast delivery!"
}
```

### Get Guest Order History

Get orders for current guest session.

```http
GET /hotels/:hotelId/guest/orders
Authorization: Bearer <guest-token>
```

---

## 8. Error Handling

### Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid room number",
    "details": {
      "field": "roomNumber",
      "reason": "Room does not exist"
    }
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `ROOM_NOT_AVAILABLE` | 400 | Room service not available |
| `GUEST_NOT_CHECKED_IN` | 400 | Guest not currently checked in |
| `INVALID_PIN` | 401 | Incorrect room PIN |
| `ORDER_CANNOT_CANCEL` | 400 | Order status doesn't allow cancellation |
| `MENU_NOT_AVAILABLE` | 400 | Menu not available at current time |
| `DISH_NOT_AVAILABLE` | 400 | Dish is out of stock |

### Rate Limiting

API endpoints are rate limited:
- Guest auth endpoints: 5 requests/minute per IP
- Order creation: 10 requests/minute per guest
- Staff endpoints: 100 requests/minute per user

---

## WebSocket Events

Real-time updates are available via Socket.io.

### Namespace: `/hotel`

**Join Events:**
```javascript
socket.emit('join:hotel', hotelId);
socket.emit('join:floor', { hotelId, floor: 1 });
socket.emit('join:room', { hotelId, roomNumber: '101' });
```

**Listen Events:**
| Event | Description |
|-------|-------------|
| `hotel:order:new` | New order created |
| `hotel:order:status` | Order status changed |
| `hotel:order:assigned` | Order assigned to staff |
| `hotel:order:delivered` | Order delivered |
| `hotel:guest:checkin` | Guest checked in |
| `hotel:guest:checkout` | Guest checked out |

---

## Appendix

### Data Types

#### Room Types
- `standard` - Standard room
- `superior` - Superior room
- `deluxe` - Deluxe room
- `suite` - Suite
- `penthouse` - Penthouse

#### Menu Types
- `room_service` - Main room service menu
- `breakfast` - Breakfast menu
- `minibar` - In-room minibar
- `poolside` - Pool area menu
- `spa` - Spa menu
- `special` - Special/seasonal menu

#### Payment Methods
- `room_charge` - Charge to room bill
- `card` - Credit/debit card
- `cash` - Cash on delivery
- `mobile_pay` - Mobile payment (Apple Pay, Google Pay)

---

*Last updated: December 2024*
