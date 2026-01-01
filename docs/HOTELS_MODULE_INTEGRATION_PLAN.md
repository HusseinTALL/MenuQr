# Hotels Module Integration Plan

## Executive Summary

This document outlines the comprehensive integration plan for adding a **Hotels Module** to the MenuQR platform. The module will enable hotels to offer in-room dining and room service through QR code menus, leveraging the existing ordering infrastructure while adding hotel-specific features like room mapping, guest authentication, and internal delivery workflows.

---

## 1. Current System Analysis

### 1.1 Existing Architecture Overview

#### Backend (menuqr-api)
| Component | Description |
|-----------|-------------|
| **Models** | User, Customer, Restaurant, Order, Dish, Category, Table, Delivery, DeliveryDriver, Reservation, Review, Campaign, LoyaltyTransaction |
| **Controllers** | 28+ controllers handling auth, orders, menu, delivery, admin functions |
| **Routes** | Admin, customer, delivery, super-admin route groups |
| **Services** | Email, SMS, delivery tracking, routing, audit, GDPR, etc. |

#### Frontend (menuqr-app - Vue 3)
| View Group | Components |
|------------|------------|
| **Customer** | MenuView, CartView, CheckoutView, DeliveryTracking, Loyalty, Reservations |
| **Admin** | Dashboard, Orders, KDS, Dishes, Categories, Tables, Settings, Staff |
| **SuperAdmin** | Restaurants, Users, Subscriptions, Analytics, SystemMonitoring |
| **Driver** | Dashboard, Deliveries, Earnings, Login |

#### Key Existing Features
- **Multi-tenancy**: Each restaurant is isolated with its own data
- **RBAC**: Fine-grained permission system with 7 roles
- **Order Types**: `dine-in`, `pickup`, `delivery`
- **Multilingual**: French/English support throughout
- **Loyalty Program**: Points-based with tier system
- **Delivery System**: Full driver management with live tracking

### 1.2 Relevant Existing Models

#### Order Model (menuqr-api/src/models/Order.ts)
```typescript
interface IOrder {
  restaurantId: ObjectId;
  tableNumber?: string;          // Used for dine-in
  fulfillmentType: 'dine-in' | 'pickup' | 'delivery';
  deliveryAddress?: IDeliveryAddress;
  // ... other fields
}
```

#### Table Model (menuqr-api/src/models/Table.ts)
```typescript
interface ITable {
  restaurantId: ObjectId;
  name: string;
  capacity: number;
  location: 'indoor' | 'outdoor' | 'terrace' | 'private';
}
```

---

## 2. Hotels Module Data Structures

### 2.1 New Models Required

#### Hotel Model
```typescript
// menuqr-api/src/models/Hotel.ts
interface IHotel extends Document {
  _id: ObjectId;
  name: string;
  slug: string;
  description?: { fr: string; en?: string };
  logo?: string;
  coverImage?: string;

  // Contact & Location
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  };
  phone?: string;
  email?: string;
  website?: string;
  starRating?: number; // 1-5 stars

  // Structure
  buildings: IBuilding[];
  totalRooms: number;
  totalFloors: number;

  // Operating Hours
  roomServiceHours?: {
    day: string;
    open: string;
    close: string;
    is24h: boolean;
    isClosed: boolean;
  }[];

  // Settings
  settings: IHotelSettings;

  // Links
  ownerId: ObjectId;                    // User who owns this hotel
  linkedRestaurantId?: ObjectId;        // Optional link to restaurant for shared menu

  // Subscription & Status
  subscriptionId?: ObjectId;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

interface IBuilding {
  _id: ObjectId;
  name: string;           // "Main Building", "Tower A", etc.
  code: string;           // "MB", "TA"
  floors: IFloor[];
}

interface IFloor {
  number: number;         // 1, 2, 3... or -1 for basement
  name?: string;          // "Lobby", "Pool Level"
  zones?: string[];       // "North Wing", "South Wing"
}

interface IHotelSettings {
  currency: string;
  timezone: string;
  defaultLanguage: string;
  availableLanguages: string[];

  // Room Service Settings
  roomService: {
    enabled: boolean;
    minOrderAmount?: number;
    deliveryFee: number;
    deliveryFeeType: 'fixed' | 'percentage';
    estimatedDeliveryMinutes: number;
    autoAcceptOrders: boolean;
    maxActiveOrdersPerRoom: number;
    allowScheduledOrders: boolean;
    requireGuestVerification: boolean;
  };

  // Guest Settings
  guestAuth: {
    method: 'room_pin' | 'check_in_code' | 'pms_integration' | 'open_access';
    pinLength?: number;
    codeExpiresWithCheckout: boolean;
    allowMultipleDevices: boolean;
  };

  // Billing
  billing: {
    allowRoomCharge: boolean;
    requirePaymentUpfront: boolean;
    acceptedPaymentMethods: string[];
  };

  // Notifications
  notifications: {
    orderNotifications: boolean;
    notifyReception: boolean;
    notifyKitchen: boolean;
    smsNotifications: boolean;
  };
}
```

#### Room Model
```typescript
// menuqr-api/src/models/Room.ts
interface IRoom extends Document {
  _id: ObjectId;
  hotelId: ObjectId;

  // Room Identity
  roomNumber: string;           // "101", "1205", "PH-A"
  displayName?: string;         // "Deluxe Suite", "Presidential Suite"

  // Location
  building?: string;            // Building code
  floor: number;
  zone?: string;               // "North Wing"

  // Room Details
  type: 'standard' | 'superior' | 'deluxe' | 'suite' | 'penthouse';
  maxOccupancy: number;

  // QR Code
  qrCode: string;              // Unique QR code for this room
  qrCodeUrl?: string;          // URL to QR code image

  // Service Settings
  roomServiceEnabled: boolean;
  specialInstructions?: string; // "Leave at door", "Call before delivery"

  // Current Status
  status: 'vacant' | 'occupied' | 'checkout' | 'maintenance' | 'blocked';

  // Current Guest (if occupied)
  currentGuest?: {
    guestId?: ObjectId;
    name: string;
    checkInDate: Date;
    checkOutDate: Date;
    pin?: string;             // Hashed room PIN
  };

  // Preferences
  deliveryPreferences?: {
    defaultTip?: number;
    preferredTime?: string;
    dietaryRestrictions?: string[];
    allergies?: string[];
  };

  isActive: boolean;
  order: number;               // Sort order

  createdAt: Date;
  updatedAt: Date;
}
```

#### HotelGuest Model
```typescript
// menuqr-api/src/models/HotelGuest.ts
interface IHotelGuest extends Document {
  _id: ObjectId;
  hotelId: ObjectId;

  // Guest Identity
  name: string;
  email?: string;
  phone?: string;

  // Stay Information
  reservationNumber?: string;
  roomId: ObjectId;
  roomNumber: string;
  checkInDate: Date;
  checkOutDate: Date;

  // Authentication
  pin?: string;                 // Hashed
  accessCode?: string;          // Check-in code
  isVerified: boolean;

  // Preferences
  language: string;
  dietaryPreferences?: string[];
  allergens?: string[];

  // Statistics
  totalOrders: number;
  totalSpent: number;

  // Loyalty (optional - link to customer)
  linkedCustomerId?: ObjectId;

  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### HotelMenu Model (for hotel-specific menus)
```typescript
// menuqr-api/src/models/HotelMenu.ts
interface IHotelMenu extends Document {
  _id: ObjectId;
  hotelId: ObjectId;

  name: { fr: string; en?: string };
  slug: string;
  description?: { fr: string; en?: string };

  // Menu Type
  type: 'room_service' | 'breakfast' | 'minibar' | 'poolside' | 'spa' | 'special';

  // Availability
  availableFrom?: string;      // "06:00"
  availableTo?: string;        // "23:00"
  availableDays?: string[];    // ["monday", "tuesday", ...]

  // Menu Source
  source: 'custom' | 'linked_restaurant';
  linkedRestaurantId?: ObjectId;

  // Categories (if custom)
  categories?: ObjectId[];     // HotelCategory IDs

  // Pricing Rules
  pricingRules?: {
    type: 'markup' | 'fixed' | 'same';
    markupPercent?: number;
    markupFixed?: number;
  };

  isActive: boolean;
  order: number;

  createdAt: Date;
  updatedAt: Date;
}
```

#### HotelOrder Model (extends Order concept)
```typescript
// menuqr-api/src/models/HotelOrder.ts
interface IHotelOrder extends Document {
  _id: ObjectId;
  orderNumber: string;
  hotelId: ObjectId;

  // Room Information
  roomId: ObjectId;
  roomNumber: string;
  floor: number;
  building?: string;

  // Guest Information
  guestId?: ObjectId;
  guestName: string;
  guestPhone?: string;

  // Menu Source
  menuType: 'room_service' | 'breakfast' | 'minibar' | 'other';
  sourceRestaurantId?: ObjectId;

  // Items
  items: IHotelOrderItem[];

  // Pricing
  subtotal: number;
  serviceCharge: number;
  deliveryFee: number;
  tax: number;
  total: number;

  // Status
  status: HotelOrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: 'room_charge' | 'card' | 'cash' | 'mobile_pay';

  // Delivery
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  deliveryInstructions?: string;

  // Staff Assignment
  assignedTo?: {
    staffId: ObjectId;
    staffName: string;
    assignedAt: Date;
  };
  deliveredBy?: {
    staffId: ObjectId;
    staffName: string;
    deliveredAt: Date;
    signature?: string;       // Guest signature if required
  };

  // Scheduling
  isScheduled: boolean;
  scheduledFor?: Date;

  // Feedback
  rating?: number;
  feedback?: string;

  // Timestamps
  confirmedAt?: Date;
  preparedAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

type HotelOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'picked_up'      // Staff picked up from kitchen
  | 'delivering'     // On the way to room
  | 'delivered'
  | 'completed'
  | 'cancelled';

interface IHotelOrderItem {
  dishId: ObjectId;
  name: { fr: string; en?: string };
  price: number;
  quantity: number;
  options?: { name: string; price: number }[];
  specialInstructions?: string;
  subtotal: number;
}
```

#### HotelStaff Model (extends User for hotel-specific roles)
```typescript
// Extended permissions for hotel staff in permissions.ts
const HOTEL_PERMISSIONS = {
  // Hotel Management
  HOTEL_READ: 'hotel:read',
  HOTEL_UPDATE: 'hotel:update',
  HOTEL_SETTINGS: 'hotel:settings',

  // Room Management
  ROOMS_READ: 'rooms:read',
  ROOMS_CREATE: 'rooms:create',
  ROOMS_UPDATE: 'rooms:update',
  ROOMS_DELETE: 'rooms:delete',
  ROOMS_ASSIGN_GUEST: 'rooms:assign_guest',

  // Guest Management
  GUESTS_READ: 'guests:read',
  GUESTS_CREATE: 'guests:create',
  GUESTS_UPDATE: 'guests:update',
  GUESTS_CHECKOUT: 'guests:checkout',

  // Hotel Orders
  HOTEL_ORDERS_READ: 'hotel_orders:read',
  HOTEL_ORDERS_CREATE: 'hotel_orders:create',
  HOTEL_ORDERS_UPDATE: 'hotel_orders:update',
  HOTEL_ORDERS_DELIVER: 'hotel_orders:deliver',
  HOTEL_ORDERS_CANCEL: 'hotel_orders:cancel',

  // Room Service Staff
  ROOM_SERVICE_ACCESS: 'room_service:access',
  ROOM_SERVICE_DELIVER: 'room_service:deliver',
};

// New hotel-specific roles
const HOTEL_ROLES = {
  HOTEL_OWNER: 'hotel_owner',
  HOTEL_MANAGER: 'hotel_manager',
  RECEPTION: 'reception',
  ROOM_SERVICE: 'room_service',
  HOTEL_KITCHEN: 'hotel_kitchen',
  CONCIERGE: 'concierge',
};
```

---

## 3. Integration Points with Existing System

### 3.1 Order Flow Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                     UNIFIED ORDER FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Restaurant Orders          Hotel Orders                       │
│   ┌──────────────┐          ┌──────────────┐                   │
│   │ fulfillment: │          │ context:     │                   │
│   │ - dine-in    │          │ - hotel      │                   │
│   │ - pickup     │          │              │                   │
│   │ - delivery   │          │ roomId       │                   │
│   └──────┬───────┘          │ guestId      │                   │
│          │                  └──────┬───────┘                   │
│          │                         │                           │
│          └──────────┬──────────────┘                           │
│                     │                                           │
│                     ▼                                           │
│            ┌───────────────┐                                   │
│            │    Kitchen    │  (Same KDS System)                │
│            │   Display     │                                   │
│            └───────┬───────┘                                   │
│                    │                                           │
│          ┌─────────┴─────────┐                                 │
│          │                   │                                 │
│          ▼                   ▼                                 │
│   ┌─────────────┐     ┌─────────────┐                         │
│   │  External   │     │   Hotel     │                         │
│   │  Delivery   │     │   Staff     │                         │
│   │  (Drivers)  │     │  Delivery   │                         │
│   └─────────────┘     └─────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Authentication Flow

```
Guest Authentication Options:
─────────────────────────────────────────────────────────────────

Option 1: Room PIN (Simple)
┌────────────┐    ┌─────────────┐    ┌────────────┐
│  Scan QR   │───▶│  Enter PIN  │───▶│   Order    │
│  in Room   │    │  (4 digits) │    │   Menu     │
└────────────┘    └─────────────┘    └────────────┘

Option 2: Check-in Code (Secure)
┌────────────┐    ┌─────────────┐    ┌─────────────┐    ┌────────────┐
│  Scan QR   │───▶│ Enter Code  │───▶│ Verify via  │───▶│   Order    │
│  in Room   │    │ from Front  │    │    PMS      │    │   Menu     │
└────────────┘    │   Desk      │    └─────────────┘    └────────────┘
                  └─────────────┘

Option 3: PMS Integration (Enterprise)
┌────────────┐    ┌─────────────┐    ┌─────────────┐    ┌────────────┐
│  Scan QR   │───▶│ Auto-detect │───▶│ Verify via  │───▶│   Order    │
│  in Room   │    │  Room Info  │    │  Hotel PMS  │    │   Menu     │
└────────────┘    └─────────────┘    └─────────────┘    └────────────┘

Option 4: Open Access (Basic)
┌────────────┐    ┌─────────────┐    ┌────────────┐
│  Scan QR   │───▶│ Enter Room  │───▶│   Order    │
│  Anywhere  │    │   Number    │    │   Menu     │
└────────────┘    └─────────────┘    └────────────┘
```

### 3.3 Menu System Integration

```typescript
// Option 1: Shared Menu (linked to restaurant)
hotel.linkedRestaurantId = restaurantId;
// Uses restaurant's dishes with optional price markup

// Option 2: Independent Menu
hotel.menus = [hotelMenuId1, hotelMenuId2];
// Hotel has its own categories and dishes

// Option 3: Hybrid
// Some menus linked (breakfast from restaurant)
// Some menus independent (minibar, spa menu)
```

### 3.4 Staff Integration

| Existing Role | Hotel Equivalent | Access |
|--------------|------------------|--------|
| `owner` | `hotel_owner` | Full hotel access |
| `admin` | `hotel_manager` | Hotel operations + settings |
| `manager` | `reception` | Guest check-in, orders view |
| `kitchen` | `hotel_kitchen` | KDS + order status |
| `staff` | `room_service` | Delivery + order status |
| - | `concierge` | Read-only, guest assistance |

---

## 4. New Functionalities Required

### 4.1 Hotel Onboarding & Configuration

#### Backend
```typescript
// New routes: menuqr-api/src/routes/hotelRoutes.ts
POST   /api/hotels                    // Create hotel (superadmin/owner)
GET    /api/hotels                    // List hotels (superadmin)
GET    /api/hotels/:id                // Get hotel details
PUT    /api/hotels/:id                // Update hotel
DELETE /api/hotels/:id                // Delete hotel
PUT    /api/hotels/:id/settings       // Update hotel settings
POST   /api/hotels/:id/link-restaurant // Link to restaurant menu
```

#### Frontend
- `HotelOnboardingWizard.vue` - Multi-step setup
- `HotelSettingsView.vue` - Configuration panel

### 4.2 Room Management

#### Backend
```typescript
// Routes: menuqr-api/src/routes/roomRoutes.ts
POST   /api/hotels/:hotelId/rooms              // Create room
GET    /api/hotels/:hotelId/rooms              // List rooms
GET    /api/hotels/:hotelId/rooms/:id          // Get room
PUT    /api/hotels/:hotelId/rooms/:id          // Update room
DELETE /api/hotels/:hotelId/rooms/:id          // Delete room
POST   /api/hotels/:hotelId/rooms/bulk         // Bulk create rooms
PUT    /api/hotels/:hotelId/rooms/:id/status   // Update room status
POST   /api/hotels/:hotelId/rooms/:id/qr       // Generate QR code
GET    /api/hotels/:hotelId/rooms/:id/orders   // Get room's orders
```

#### Frontend
- `RoomsManagementView.vue` - Grid/list of rooms
- `RoomDetailModal.vue` - Room configuration
- `BulkRoomCreator.vue` - Batch room creation
- `RoomQRGenerator.vue` - QR code management

### 4.3 Guest Management

#### Backend
```typescript
// Routes: menuqr-api/src/routes/guestRoutes.ts
POST   /api/hotels/:hotelId/guests                 // Check-in guest
GET    /api/hotels/:hotelId/guests                 // List guests
GET    /api/hotels/:hotelId/guests/:id             // Get guest
PUT    /api/hotels/:hotelId/guests/:id             // Update guest
POST   /api/hotels/:hotelId/guests/:id/checkout    // Check-out guest
POST   /api/hotels/:hotelId/guests/:id/extend      // Extend stay
POST   /api/hotels/:hotelId/guests/:id/transfer    // Transfer to another room
GET    /api/hotels/:hotelId/guests/:id/orders      // Get guest's orders
```

#### Guest Auth (Public)
```typescript
// Routes: menuqr-api/src/routes/guestAuthRoutes.ts
POST   /api/guest/auth/verify-room      // Verify room access
POST   /api/guest/auth/verify-pin       // Verify PIN
POST   /api/guest/auth/verify-code      // Verify check-in code
GET    /api/guest/profile               // Get guest profile
PUT    /api/guest/preferences           // Update preferences
```

### 4.4 Hotel Order System

#### Backend
```typescript
// Routes: menuqr-api/src/routes/hotelOrderRoutes.ts
POST   /api/hotels/:hotelId/orders               // Create order (guest)
GET    /api/hotels/:hotelId/orders               // List orders (staff)
GET    /api/hotels/:hotelId/orders/:id           // Get order details
PUT    /api/hotels/:hotelId/orders/:id/status    // Update status
PUT    /api/hotels/:hotelId/orders/:id/assign    // Assign to staff
POST   /api/hotels/:hotelId/orders/:id/deliver   // Mark delivered
POST   /api/hotels/:hotelId/orders/:id/cancel    // Cancel order
GET    /api/hotels/:hotelId/orders/active        // Get active orders (KDS)
GET    /api/hotels/:hotelId/orders/by-floor/:floor // Orders by floor
GET    /api/hotels/:hotelId/orders/by-room/:roomNumber // Room's orders
```

#### Real-time (Socket.io)
```typescript
// Existing socketService extended for hotels
namespace: 'hotel'
events:
  - 'hotel:order:new'
  - 'hotel:order:status'
  - 'hotel:order:assigned'
  - 'hotel:order:delivered'
  - 'hotel:staff:location'     // Staff location (optional)
```

### 4.5 Hotel-Specific Menu Management

#### Backend
```typescript
// Routes: menuqr-api/src/routes/hotelMenuRoutes.ts
POST   /api/hotels/:hotelId/menus                  // Create menu
GET    /api/hotels/:hotelId/menus                  // List menus
GET    /api/hotels/:hotelId/menus/:id              // Get menu
PUT    /api/hotels/:hotelId/menus/:id              // Update menu
DELETE /api/hotels/:hotelId/menus/:id              // Delete menu
PUT    /api/hotels/:hotelId/menus/:id/availability // Set availability

// Categories within hotel menus
POST   /api/hotels/:hotelId/menus/:menuId/categories
GET    /api/hotels/:hotelId/menus/:menuId/categories
PUT    /api/hotels/:hotelId/menus/:menuId/categories/:id
DELETE /api/hotels/:hotelId/menus/:menuId/categories/:id

// Dishes within hotel menus
POST   /api/hotels/:hotelId/menus/:menuId/dishes
GET    /api/hotels/:hotelId/menus/:menuId/dishes
PUT    /api/hotels/:hotelId/menus/:menuId/dishes/:id
DELETE /api/hotels/:hotelId/menus/:menuId/dishes/:id
```

### 4.6 Internal Delivery Workflow

```
┌──────────────────────────────────────────────────────────────────┐
│                    HOTEL ORDER WORKFLOW                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐    ┌──────────┐    ┌───────────┐    ┌──────────┐  │
│  │ PENDING │───▶│CONFIRMED │───▶│ PREPARING │───▶│  READY   │  │
│  └─────────┘    └──────────┘    └───────────┘    └────┬─────┘  │
│       │              │                                 │        │
│       │              │                                 ▼        │
│       │              │              ┌────────────────────────┐  │
│       │              │              │    Staff Assignment    │  │
│       │              │              │ ┌──────────────────┐   │  │
│       │              │              │ │ Auto-assign by:  │   │  │
│       │              │              │ │ - Floor zone     │   │  │
│       │              │              │ │ - Availability   │   │  │
│       │              │              │ │ - Load balance   │   │  │
│       │              │              │ └──────────────────┘   │  │
│       │              │              └───────────┬────────────┘  │
│       │              │                          │               │
│       │              │                          ▼               │
│       │              │                   ┌───────────┐          │
│       │              │                   │ PICKED_UP │          │
│       │              │                   └─────┬─────┘          │
│       │              │                         │                │
│       │              │                         ▼                │
│       │              │                   ┌───────────┐          │
│       │              │                   │DELIVERING │          │
│       │              │                   └─────┬─────┘          │
│       │              │                         │                │
│       │              │                         ▼                │
│       │              │                   ┌───────────┐          │
│       │              │                   │ DELIVERED │          │
│       │              │                   └─────┬─────┘          │
│       │              │                         │                │
│       ▼              ▼                         ▼                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     CANCELLED                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

Notifications at each step:
- CONFIRMED → Kitchen notification (KDS bell/sound)
- READY → Room service staff notification
- PICKED_UP → Guest notification (SMS/push if enabled)
- DELIVERED → Reception log update
```

### 4.7 Reporting for Hotel Management

#### Backend Endpoints
```typescript
// Routes: menuqr-api/src/routes/hotelReportRoutes.ts
GET /api/hotels/:hotelId/reports/dashboard          // Overview stats
GET /api/hotels/:hotelId/reports/revenue            // Revenue reports
GET /api/hotels/:hotelId/reports/orders             // Order analytics
GET /api/hotels/:hotelId/reports/rooms              // Room performance
GET /api/hotels/:hotelId/reports/staff              // Staff performance
GET /api/hotels/:hotelId/reports/menu               // Menu item analytics
GET /api/hotels/:hotelId/reports/guests             // Guest analytics
GET /api/hotels/:hotelId/reports/peak-hours         // Peak ordering times
GET /api/hotels/:hotelId/reports/export/:type       // Export to CSV/PDF
```

#### Report Types
| Report | Metrics |
|--------|---------|
| **Revenue** | Total revenue, avg order value, revenue by room type, by floor, by menu |
| **Orders** | Order count, completion rate, avg prep time, avg delivery time, cancellations |
| **Rooms** | Orders per room, top ordering rooms, rooms with no orders, occupancy correlation |
| **Staff** | Deliveries per staff, avg delivery time, ratings |
| **Menu** | Top sellers, slow movers, revenue by category, out-of-stock items |
| **Guests** | Repeat orderers, spend per stay, dietary preferences |

---

## 5. Database Schema Updates

### 5.1 New Collections

```javascript
// MongoDB Collections
db.hotels                  // Hotel entities
db.rooms                   // Room entities
db.hotelGuests             // Guest entities
db.hotelMenus              // Hotel-specific menus
db.hotelCategories         // Categories for hotel menus
db.hotelDishes             // Dishes for hotel menus
db.hotelOrders             // Hotel room service orders
db.hotelOrderItems         // Order items (embedded or separate)
db.hotelStaffAssignments   // Staff delivery assignments
```

### 5.2 Indexes

```javascript
// Hotels
db.hotels.createIndex({ slug: 1 }, { unique: true });
db.hotels.createIndex({ ownerId: 1 });
db.hotels.createIndex({ isActive: 1 });

// Rooms
db.rooms.createIndex({ hotelId: 1, roomNumber: 1 }, { unique: true });
db.rooms.createIndex({ hotelId: 1, floor: 1 });
db.rooms.createIndex({ hotelId: 1, status: 1 });
db.rooms.createIndex({ qrCode: 1 }, { unique: true });

// Guests
db.hotelGuests.createIndex({ hotelId: 1, roomId: 1, isActive: 1 });
db.hotelGuests.createIndex({ hotelId: 1, email: 1 }, { sparse: true });
db.hotelGuests.createIndex({ accessCode: 1 }, { sparse: true });

// Hotel Orders
db.hotelOrders.createIndex({ hotelId: 1, createdAt: -1 });
db.hotelOrders.createIndex({ hotelId: 1, status: 1 });
db.hotelOrders.createIndex({ hotelId: 1, roomNumber: 1 });
db.hotelOrders.createIndex({ hotelId: 1, floor: 1, status: 1 });
db.hotelOrders.createIndex({ 'assignedTo.staffId': 1, status: 1 });
db.hotelOrders.createIndex({ orderNumber: 1 }, { unique: true });

// Hotel Menus
db.hotelMenus.createIndex({ hotelId: 1, slug: 1 }, { unique: true });
db.hotelMenus.createIndex({ hotelId: 1, isActive: 1 });
```

### 5.3 User Model Updates

```typescript
// Add to existing User model
interface IUser {
  // ... existing fields ...

  // Hotel association (alternative to restaurantId)
  hotelId?: ObjectId;

  // Role extended to include hotel roles
  role: UserRole | HotelRole;
}
```

---

## 6. UI Components & Screens

### 6.1 Guest-Facing (Customer App)

| Screen | Description | Route |
|--------|-------------|-------|
| `HotelMenuView.vue` | Room service menu | `/hotel/:hotelSlug/menu` |
| `HotelCartView.vue` | Cart with room info | `/hotel/:hotelSlug/cart` |
| `HotelCheckoutView.vue` | Checkout with room charge option | `/hotel/:hotelSlug/checkout` |
| `HotelOrderStatusView.vue` | Order tracking | `/hotel/:hotelSlug/order/:id` |
| `HotelGuestProfileView.vue` | Guest preferences | `/hotel/:hotelSlug/profile` |
| `HotelGuestAuthView.vue` | PIN/code entry | `/hotel/:hotelSlug/auth` |

### 6.2 Hotel Admin (Admin App)

| Screen | Description | Route |
|--------|-------------|-------|
| `HotelDashboardView.vue` | Overview & stats | `/hotel-admin/dashboard` |
| `HotelOrdersView.vue` | Order management | `/hotel-admin/orders` |
| `HotelKDSView.vue` | Kitchen display | `/hotel-admin/kds` |
| `HotelRoomsView.vue` | Room management | `/hotel-admin/rooms` |
| `HotelGuestsView.vue` | Guest management | `/hotel-admin/guests` |
| `HotelMenusView.vue` | Menu management | `/hotel-admin/menus` |
| `HotelStaffView.vue` | Staff management | `/hotel-admin/staff` |
| `HotelSettingsView.vue` | Hotel settings | `/hotel-admin/settings` |
| `HotelReportsView.vue` | Analytics & reports | `/hotel-admin/reports` |

### 6.3 Room Service Staff (Mobile-First)

| Screen | Description | Route |
|--------|-------------|-------|
| `RoomServiceDashboard.vue` | Active deliveries | `/room-service/` |
| `RoomServiceDeliveryView.vue` | Delivery details | `/room-service/delivery/:id` |
| `RoomServiceHistoryView.vue` | Past deliveries | `/room-service/history` |

### 6.4 SuperAdmin Extensions

| Screen | Description | Route |
|--------|-------------|-------|
| `HotelsListView.vue` | All hotels management | `/superadmin/hotels` |
| `HotelDetailsView.vue` | Individual hotel details | `/superadmin/hotels/:id` |

### 6.5 Shared Components

```
src/components/hotel/
├── HotelRoomCard.vue           # Room display card
├── HotelOrderCard.vue          # Order card for KDS/list
├── HotelGuestCard.vue          # Guest info card
├── HotelFloorSelector.vue      # Floor dropdown/tabs
├── HotelRoomSelector.vue       # Room picker
├── HotelMenuCard.vue           # Menu type card
├── HotelOrderTimeline.vue      # Order status timeline
├── HotelQRCodeDisplay.vue      # QR code viewer
├── HotelStaffAssignment.vue    # Staff assignment widget
├── HotelPinInput.vue           # PIN entry component
├── HotelCheckInForm.vue        # Guest check-in form
└── HotelDeliveryConfirm.vue    # Delivery confirmation modal
```

---

## 7. API Endpoints Summary

### 7.1 Hotel Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/hotels` | Create hotel | superadmin |
| GET | `/api/hotels` | List hotels | superadmin |
| GET | `/api/hotels/:id` | Get hotel | hotel_staff |
| PUT | `/api/hotels/:id` | Update hotel | hotel_owner |
| DELETE | `/api/hotels/:id` | Delete hotel | superadmin |
| PUT | `/api/hotels/:id/settings` | Update settings | hotel_manager |

### 7.2 Room Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/hotels/:hotelId/rooms` | Create room | hotel_manager |
| GET | `/api/hotels/:hotelId/rooms` | List rooms | hotel_staff |
| GET | `/api/hotels/:hotelId/rooms/:id` | Get room | hotel_staff |
| PUT | `/api/hotels/:hotelId/rooms/:id` | Update room | hotel_manager |
| DELETE | `/api/hotels/:hotelId/rooms/:id` | Delete room | hotel_manager |
| POST | `/api/hotels/:hotelId/rooms/bulk` | Bulk create | hotel_manager |
| PUT | `/api/hotels/:hotelId/rooms/:id/status` | Update status | reception |
| POST | `/api/hotels/:hotelId/rooms/:id/qr` | Generate QR | hotel_manager |

### 7.3 Guest Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/hotels/:hotelId/guests` | Check-in guest | reception |
| GET | `/api/hotels/:hotelId/guests` | List guests | hotel_staff |
| GET | `/api/hotels/:hotelId/guests/:id` | Get guest | hotel_staff |
| PUT | `/api/hotels/:hotelId/guests/:id` | Update guest | reception |
| POST | `/api/hotels/:hotelId/guests/:id/checkout` | Check-out | reception |
| POST | `/api/hotels/:hotelId/guests/:id/transfer` | Transfer room | reception |

### 7.4 Guest Authentication (Public)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/guest/auth/verify-room` | Verify room access | public |
| POST | `/api/guest/auth/verify-pin` | Verify PIN | public |
| POST | `/api/guest/auth/verify-code` | Verify code | public |
| GET | `/api/guest/profile` | Get profile | guest |
| PUT | `/api/guest/preferences` | Update prefs | guest |

### 7.5 Hotel Orders

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/hotels/:hotelId/orders` | Create order | guest |
| GET | `/api/hotels/:hotelId/orders` | List orders | hotel_staff |
| GET | `/api/hotels/:hotelId/orders/:id` | Get order | hotel_staff/guest |
| PUT | `/api/hotels/:hotelId/orders/:id/status` | Update status | hotel_kitchen |
| PUT | `/api/hotels/:hotelId/orders/:id/assign` | Assign staff | hotel_manager |
| POST | `/api/hotels/:hotelId/orders/:id/deliver` | Mark delivered | room_service |
| POST | `/api/hotels/:hotelId/orders/:id/cancel` | Cancel order | reception |
| GET | `/api/hotels/:hotelId/orders/active` | Active orders | hotel_kitchen |
| GET | `/api/hotels/:hotelId/orders/by-floor/:floor` | By floor | room_service |

### 7.6 Hotel Menus

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/hotels/:hotelId/menus` | Create menu | hotel_manager |
| GET | `/api/hotels/:hotelId/menus` | List menus | public |
| GET | `/api/hotels/:hotelId/menus/:id` | Get menu | public |
| PUT | `/api/hotels/:hotelId/menus/:id` | Update menu | hotel_manager |
| DELETE | `/api/hotels/:hotelId/menus/:id` | Delete menu | hotel_manager |

### 7.7 Reports

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/hotels/:hotelId/reports/dashboard` | Overview | hotel_manager |
| GET | `/api/hotels/:hotelId/reports/revenue` | Revenue | hotel_owner |
| GET | `/api/hotels/:hotelId/reports/orders` | Orders | hotel_manager |
| GET | `/api/hotels/:hotelId/reports/rooms` | Rooms | hotel_manager |
| GET | `/api/hotels/:hotelId/reports/staff` | Staff | hotel_manager |
| GET | `/api/hotels/:hotelId/reports/export/:type` | Export | hotel_owner |

---

## 8. Development Roadmap

### Phase 1: Foundation & Architecture (Week 1-2)

#### 1.1 Requirement Validation
- [ ] Stakeholder review of this plan
- [ ] Finalize data model decisions
- [ ] Define MVP scope vs. future phases
- [ ] Identify integration requirements (PMS systems)

#### 1.2 Architecture Updates
- [ ] Extend permission system with hotel permissions
- [ ] Add hotel roles to User model
- [ ] Create base hotel service structure
- [ ] Set up database migrations strategy

#### 1.3 Development Environment
- [ ] Create hotel seed data scripts
- [ ] Set up test hotel environment
- [ ] Document API contracts (OpenAPI/Swagger)

### Phase 2: Backend Core (Week 3-5)

#### 2.1 Data Models
- [ ] Implement Hotel model
- [ ] Implement Room model
- [ ] Implement HotelGuest model
- [ ] Implement HotelMenu model
- [ ] Implement HotelOrder model
- [ ] Create indexes and validations

#### 2.2 Hotel Management APIs
- [ ] Hotel CRUD operations
- [ ] Hotel settings management
- [ ] Hotel onboarding flow

#### 2.3 Room Management APIs
- [ ] Room CRUD operations
- [ ] Bulk room creation
- [ ] QR code generation
- [ ] Room status management

#### 2.4 Guest Management APIs
- [ ] Guest check-in/check-out
- [ ] Guest authentication (PIN, code)
- [ ] Guest profile management
- [ ] Guest order history

#### 2.5 Order System
- [ ] Hotel order creation
- [ ] Order status workflow
- [ ] Staff assignment logic
- [ ] Order notification system

### Phase 3: Frontend Guest Experience (Week 6-7)

#### 3.1 Guest Authentication
- [ ] Hotel QR code landing page
- [ ] PIN entry flow
- [ ] Check-in code flow
- [ ] Session management

#### 3.2 Menu & Ordering
- [ ] Hotel menu view
- [ ] Cart with room info
- [ ] Checkout with payment options
- [ ] Order confirmation

#### 3.3 Order Tracking
- [ ] Order status page
- [ ] Real-time updates
- [ ] Delivery notifications

### Phase 4: Admin Interfaces (Week 8-10)

#### 4.1 Hotel Dashboard
- [ ] Overview statistics
- [ ] Active orders widget
- [ ] Quick actions

#### 4.2 Room Management
- [ ] Room list/grid view
- [ ] Room detail modal
- [ ] Bulk operations
- [ ] QR code management

#### 4.3 Guest Management
- [ ] Guest list view
- [ ] Check-in form
- [ ] Guest detail modal
- [ ] Order history

#### 4.4 Order Management
- [ ] Order list view
- [ ] Order detail modal
- [ ] Status updates
- [ ] Staff assignment

#### 4.5 Hotel KDS
- [ ] Kitchen display adaptation
- [ ] Floor-based view
- [ ] Order prioritization

#### 4.6 Room Service App
- [ ] Mobile-first delivery view
- [ ] Active deliveries
- [ ] Delivery confirmation
- [ ] History

#### 4.7 Menu Management
- [ ] Menu CRUD
- [ ] Category/dish management
- [ ] Linked restaurant menus

#### 4.8 Settings & Reports
- [ ] Hotel settings page
- [ ] Report dashboards
- [ ] Export functionality

### Phase 5: Integration Testing (Week 11-12)

#### 5.1 Unit Tests
- [ ] Model validation tests
- [ ] Controller tests
- [ ] Service tests

#### 5.2 Integration Tests
- [ ] API endpoint tests
- [ ] Authentication flows
- [ ] Order workflow tests

#### 5.3 E2E Tests
- [ ] Guest ordering flow
- [ ] Admin management flow
- [ ] Room service delivery flow

#### 5.4 Performance Testing
- [ ] Load testing for orders
- [ ] Real-time updates stress test
- [ ] Database query optimization

### Phase 6: Launch Preparation (Week 13-14)

#### 6.1 Documentation
- [ ] API documentation
- [ ] User guides
- [ ] Admin training materials

#### 6.2 Deployment
- [ ] Database migrations
- [ ] Feature flags setup
- [ ] Rollback plan

#### 6.3 Monitoring
- [ ] Hotel-specific dashboards
- [ ] Alert rules
- [ ] Error tracking

#### 6.4 Soft Launch
- [ ] Beta hotel onboarding
- [ ] Feedback collection
- [ ] Bug fixes

#### 6.5 General Availability
- [ ] Marketing materials
- [ ] Support documentation
- [ ] Production monitoring

---

## 9. Technical Considerations

### 9.1 Multi-tenancy

The Hotels module follows the same multi-tenancy pattern as restaurants:
- Each hotel is isolated with its own data
- Staff can only access their assigned hotel
- SuperAdmin can manage all hotels
- Optional: Hotels can share menus with linked restaurants

### 9.2 Real-time Features

Extend existing Socket.io implementation:
```typescript
// New namespace for hotels
io.of('/hotel').on('connection', (socket) => {
  socket.on('join:hotel', (hotelId) => {
    socket.join(`hotel:${hotelId}`);
  });

  socket.on('join:floor', (hotelId, floor) => {
    socket.join(`hotel:${hotelId}:floor:${floor}`);
  });

  socket.on('join:room', (hotelId, roomNumber) => {
    socket.join(`hotel:${hotelId}:room:${roomNumber}`);
  });
});
```

### 9.3 Scalability

- Room-based sharding potential for very large hotels
- Separate indexes for hotel orders
- Caching for menu data (Redis)
- CDN for QR code images

### 9.4 Security

- Room access verification at every order
- PIN/code hashing (bcrypt)
- Rate limiting on auth endpoints
- Audit logging for sensitive operations
- GDPR compliance for guest data

### 9.5 PMS Integration (Future)

Interface for Property Management System integration:
```typescript
interface IPMSAdapter {
  verifyGuest(roomNumber: string, guestName: string): Promise<boolean>;
  getGuestDetails(roomNumber: string): Promise<IGuestDetails>;
  chargeToRoom(roomNumber: string, amount: number, description: string): Promise<boolean>;
  checkGuestStatus(roomNumber: string): Promise<'active' | 'checkout' | 'unknown'>;
}
```

Supported PMS systems (future roadmap):
- Opera (Oracle)
- Protel
- Mews
- Cloudbeds
- Generic webhook integration

---

## 10. Success Metrics

### 10.1 Launch Metrics
- [ ] First hotel onboarded successfully
- [ ] 100 orders processed without errors
- [ ] Average order completion time < 5 minutes
- [ ] Zero critical security incidents

### 10.2 Adoption Metrics
- Orders per room per day
- Average order value
- Guest authentication success rate
- Staff delivery time

### 10.3 Business Metrics
- Hotel revenue generated
- Subscription conversion rate
- Guest satisfaction (ratings)
- Staff efficiency improvements

---

## 11. Appendix

### 11.1 Glossary

| Term | Definition |
|------|------------|
| **PMS** | Property Management System - Hotel's main operational software |
| **Room Charge** | Adding order cost to guest's hotel bill |
| **KDS** | Kitchen Display System |
| **POD** | Proof of Delivery |
| **Check-in Code** | Unique code given to guest at check-in for authentication |

### 11.2 Related Documents

- [Delivery Module Roadmap](./DELIVERY_MODULE_ROADMAP.md)
- [API Documentation](./API_DOCS.md)
- [Security Audit](./SECURITY_AUDIT.md)

### 11.3 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-29 | Claude Code | Initial draft |

---

*This document should be reviewed and approved by stakeholders before implementation begins.*
