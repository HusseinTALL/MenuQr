# Hotel Administration Guide

## Introduction

This guide covers all aspects of managing your hotel's room service system through MenuQR. Whether you're a hotel owner, manager, or staff member, this documentation will help you understand and effectively use the system.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard Overview](#2-dashboard-overview)
3. [Room Management](#3-room-management)
4. [Guest Management](#4-guest-management)
5. [Order Management](#5-order-management)
6. [Kitchen Display System (KDS)](#6-kitchen-display-system-kds)
7. [Menu Management](#7-menu-management)
8. [Staff Management](#8-staff-management)
9. [Settings & Configuration](#9-settings--configuration)
10. [Reports & Analytics](#10-reports--analytics)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Getting Started

### Accessing the Admin Panel

1. Navigate to `https://your-hotel.menuqr.fr/admin`
2. Enter your staff credentials
3. Select your hotel (if managing multiple)

### User Roles

| Role | Access Level |
|------|--------------|
| **Hotel Owner** | Full access including billing and subscription |
| **Hotel Manager** | Full operational access, settings, reports |
| **Reception** | Guest check-in/out, view orders, room status |
| **Room Service** | Delivery management, order status updates |
| **Kitchen** | KDS access, order preparation status |

### First-Time Setup

For new hotels, complete these steps:
1. Configure hotel settings
2. Set up rooms
3. Create or import menus
4. Add staff accounts
5. Generate and print QR codes

---

## 2. Dashboard Overview

The dashboard provides a real-time overview of your hotel's room service operations.

### Key Metrics

- **Today's Orders**: Total orders placed today
- **Revenue**: Total revenue from room service
- **Active Orders**: Orders currently in progress
- **Average Delivery Time**: Mean time from order to delivery

### Quick Widgets

#### Room Status
Visual overview of room occupancy:
- 🟢 Available
- 🔵 Occupied
- 🟡 Cleaning
- 🔴 Maintenance

#### Active Orders
List of orders requiring attention:
- Pending orders (need confirmation)
- Ready for pickup
- Overdue deliveries

#### Staff On Duty
Currently active room service staff and their assignments.

### Quick Actions

- ➕ New Guest Check-in
- 📦 View All Orders
- 🔔 Pending Alerts

---

## 3. Room Management

### Room List View

Navigate to **Rooms** to see all hotel rooms.

#### Filtering Options
- By floor
- By building/wing
- By status
- By room type

#### Sorting
- Room number
- Status
- Last order date

### Adding a Single Room

1. Click **+ Add Room**
2. Fill in room details:
   - Room number (required)
   - Floor (required)
   - Building/wing
   - Room type (standard, superior, deluxe, suite, penthouse)
   - Capacity
   - Amenities
3. Configure room service settings
4. Click **Save**

### Bulk Room Creation

For adding multiple rooms at once:

1. Click **Bulk Add Rooms**
2. Configure:
   - Starting room number (e.g., 301)
   - Number of rooms (e.g., 20)
   - Floor number
   - Room type
   - Default settings
3. Click **Create Rooms**

The system creates rooms 301, 302, 303... up to 320.

### Room Status Management

#### Updating Status
1. Click on a room
2. Select new status from dropdown
3. Confirm change

#### Status Types

| Status | Description | Room Service |
|--------|-------------|--------------|
| Available | Ready for guests | Disabled |
| Occupied | Guest checked in | Enabled |
| Cleaning | Being cleaned | Disabled |
| Maintenance | Under repair | Disabled |
| Blocked | Temporarily unavailable | Disabled |

### QR Code Management

#### Generating QR Codes
1. Select room(s)
2. Click **Generate QR Codes**
3. Download PDF for printing

#### QR Code Contents
Each QR code links to:
`https://your-hotel.menuqr.fr/r/[ROOM_QR_CODE]`

#### Printing Tips
- Use high-quality paper/cards
- Laminate for durability
- Include room number on card
- Place in visible location (desk, nightstand)

### Deleting Rooms

**Important**: Rooms can only be deleted if:
- No current guest
- Status is not "occupied"
- No pending orders

---

## 4. Guest Management

### Guest List

Navigate to **Guests** to see all current and past guests.

#### Views
- **Current Guests**: Currently checked in
- **Expected Arrivals**: Upcoming check-ins
- **Checked Out**: Past guests

### Check-In Process

1. Click **+ Check In Guest**
2. Enter guest details:
   - Name (required)
   - Email
   - Phone
   - Language preference
3. Select room
4. Set dates:
   - Check-in date/time
   - Check-out date/time
5. Set authentication:
   - Room PIN (4 digits)
   - Or auto-generate access code
6. Click **Check In**

The system will:
- Create guest record
- Update room status to "Occupied"
- Generate access credentials
- Send welcome email (if configured)

### Guest Details

View comprehensive guest information:
- Personal details
- Room assignment
- Stay dates
- Order history
- Total spending
- Preferences

### Check-Out Process

1. Navigate to guest record
2. Click **Check Out**
3. Confirm outstanding charges
4. System will:
   - Update guest status
   - Set room to "Cleaning"
   - Deactivate credentials
   - Generate final bill

### Room Transfer

To move a guest to another room:
1. Open guest record
2. Click **Transfer Room**
3. Select new room
4. Enter reason (optional)
5. Confirm transfer

The system updates:
- Guest's room assignment
- Old room → Cleaning
- New room → Occupied
- Access credentials (new QR code)

### Extend Stay

1. Open guest record
2. Click **Extend Stay**
3. Select new check-out date
4. Confirm

---

## 5. Order Management

### Orders List

Navigate to **Orders** to see all room service orders.

#### Status Filters
- All Orders
- Pending (needs confirmation)
- Confirmed
- Preparing
- Ready for Pickup
- Delivering
- Delivered
- Cancelled

#### Time Filters
- Today
- This Week
- Custom Date Range

### Order Details

Each order shows:
- Order number
- Room number & floor
- Guest name
- Items ordered
- Special instructions
- Order time
- Status history
- Payment method
- Assigned staff

### Order Workflow

```
PENDING → CONFIRMED → PREPARING → READY → PICKED_UP → DELIVERED
    ↓         ↓           ↓         ↓
 CANCELLED CANCELLED  CANCELLED   (can't cancel after ready)
```

### Confirming Orders

1. Review new orders in "Pending"
2. Check item availability
3. Click **Confirm Order**
4. Order moves to kitchen queue

**Auto-confirm**: Enable in settings to automatically confirm orders.

### Updating Order Status

As the order progresses:
1. Kitchen marks as "Preparing"
2. Kitchen marks as "Ready"
3. Staff picks up and marks "Picked Up"
4. Staff delivers and marks "Delivered"

### Assigning Delivery Staff

1. When order is "Ready"
2. Click **Assign Staff**
3. Select available staff member
4. Staff receives notification

**Auto-assign**: System can automatically assign based on:
- Floor zones
- Staff workload
- Availability

### Cancelling Orders

Orders can be cancelled before "Ready":
1. Open order
2. Click **Cancel Order**
3. Select reason
4. Confirm

Guest is notified of cancellation.

### Order Issues

For problems with delivered orders:
1. Open order
2. Click **Report Issue**
3. Document the issue
4. Arrange resolution (refund, re-make, etc.)

---

## 6. Kitchen Display System (KDS)

The KDS provides a real-time view for kitchen staff.

### Accessing KDS

Navigate to **Kitchen** or use fullscreen mode:
`https://your-hotel.menuqr.fr/admin/kds`

### KDS Layout

#### Order Cards

Each order shows:
- Order number
- Room number (large, visible)
- Floor
- Items with quantities
- Special instructions (highlighted)
- Time since order
- Allergen alerts

#### Order Organization

Cards are organized by status:
- **New Orders**: Just confirmed, need attention
- **Preparing**: Currently being made
- **Ready**: Waiting for pickup

### KDS Actions

#### Marking Preparing
Click "Start" on an order card to indicate preparation has begun.

#### Marking Ready
Click "Ready" when order is complete and ready for pickup.

#### View Details
Click on order for full details and special instructions.

### KDS Settings

Configure in Settings → KDS:
- Auto-refresh interval
- Sound notifications
- Order card size
- Color coding by priority

### Priority System

Orders are prioritized by:
1. Time waiting (oldest first)
2. Floor (group by floor for efficient delivery)
3. VIP rooms (if configured)

---

## 7. Menu Management

### Menu Structure

```
Hotel
├── Menu (Room Service)
│   ├── Category (Breakfast)
│   │   ├── Dish (Croissant)
│   │   ├── Dish (Omelette)
│   │   └── Dish (Pancakes)
│   ├── Category (Main Courses)
│   └── Category (Desserts)
├── Menu (Minibar)
└── Menu (Pool Service)
```

### Creating a Menu

1. Navigate to **Menus**
2. Click **+ New Menu**
3. Enter details:
   - Name (French & English)
   - Type (room_service, breakfast, minibar, etc.)
   - Description
4. Set availability:
   - Always available, or
   - Specific hours
5. Click **Save**

### Menu Types

| Type | Description |
|------|-------------|
| Room Service | Main in-room dining menu |
| Breakfast | Morning menu with limited hours |
| Minibar | In-room snacks and beverages |
| Poolside | Pool area menu |
| Spa | Spa and wellness menu |
| Special | Seasonal or event menus |

### Creating Categories

1. Open a menu
2. Click **+ Add Category**
3. Enter:
   - Name (French & English)
   - Description
   - Icon (emoji)
   - Display order
4. Click **Save**

### Adding Dishes

1. Open a category
2. Click **+ Add Dish**
3. Enter details:
   - Name (French & English)
   - Description
   - Price
   - Image (recommended: 800x600px)
   - Preparation time (minutes)
4. Set allergens (select all that apply)
5. Add options if applicable:
   - Option name
   - Additional price
6. Configure availability
7. Click **Save**

### Dish Options

For customizable dishes:
```
Example: Steak
├── Option: Cooking (Rare, Medium, Well-done) - No extra charge
├── Option: Side (Fries, Salad, Rice) - No extra charge
└── Option: Add Mushroom Sauce - +€3.00
```

### Managing Availability

#### Quick Toggle
- Green toggle = Available
- Click to toggle off (sold out)

#### Scheduled Availability
Set specific hours when a dish is available:
- Breakfast items: 06:00 - 11:00
- Lunch special: 12:00 - 14:00

### Menu Import/Export

#### Export
1. Select menu
2. Click **Export**
3. Download CSV/Excel file

#### Import
1. Click **Import Menu**
2. Upload formatted file
3. Map columns
4. Review and confirm

---

## 8. Staff Management

### Staff Roles

| Role | Permissions |
|------|-------------|
| Hotel Manager | Full access except billing |
| Reception | Guest management, view orders |
| Room Service | Delivery, order status |
| Kitchen | KDS, order preparation |

### Adding Staff

1. Navigate to **Staff**
2. Click **+ Add Staff**
3. Enter:
   - Name
   - Email
   - Role
   - Assigned floors (for room service)
4. Click **Create Account**

Staff receives email to set password.

### Staff Schedules

Assign shifts for room service staff:
1. Open staff member
2. Click **Schedule**
3. Set working hours by day
4. Save schedule

### Performance Tracking

View staff metrics:
- Orders delivered
- Average delivery time
- Guest ratings
- Active hours

---

## 9. Settings & Configuration

### General Settings

**Hotel Information**
- Name, address, contact
- Logo and cover image
- Star rating

**Localization**
- Default language
- Available languages
- Currency
- Timezone

### Room Service Settings

**Operating Hours**
- Start/end times
- 24-hour service toggle

**Order Settings**
- Minimum order amount
- Delivery fee (fixed or percentage)
- Service charge percentage
- Auto-accept orders
- Max orders per room

### Guest Authentication

**PIN Settings**
- PIN length (4-6 digits)
- Require PIN for orders

**Access Code**
- Enable/disable
- Code format

### Payment Settings

**Accepted Methods**
- Room charge
- Card on delivery
- Cash
- Online payment

**Billing**
- Require upfront payment
- Charge to room by default

### Notifications

**Staff Notifications**
- New order alerts
- Order ready alerts
- Guest check-in/out

**Guest Notifications**
- Order confirmation
- Status updates
- Delivery notification

---

## 10. Reports & Analytics

### Dashboard Reports

Quick access to key metrics on the main dashboard.

### Revenue Reports

**Daily/Weekly/Monthly Revenue**
- Total revenue
- Average order value
- Orders per period
- Revenue by menu type

**Revenue Breakdown**
- By category
- By dish
- By floor
- By room type

### Order Reports

**Order Analytics**
- Total orders
- Completion rate
- Cancellation rate
- Average preparation time
- Average delivery time

**Peak Hours**
- Orders by hour
- Busiest days
- Seasonal trends

### Room Performance

**Room Metrics**
- Orders per room
- Revenue per room
- Top ordering rooms
- Rooms with no orders

### Staff Performance

**Delivery Metrics**
- Deliveries per staff
- Average delivery time
- Guest ratings
- Efficiency scores

### Exporting Reports

1. Select report type
2. Choose date range
3. Click **Export**
4. Download CSV or PDF

---

## 11. Troubleshooting

### Common Issues

#### Guest Can't Scan QR Code
1. Check room has QR code generated
2. Verify QR code is not damaged
3. Test with different phone/browser
4. Re-generate if necessary

#### Order Not Appearing in KDS
1. Check order was confirmed
2. Verify KDS is connected (refresh)
3. Check for network issues
4. Contact support if persists

#### Guest Authentication Failing
1. Verify guest is checked in
2. Check PIN/code is correct
3. Confirm check-out date hasn't passed
4. Reset credentials if needed

#### Menu Items Not Showing
1. Check dish is marked "Available"
2. Verify menu is active
3. Check menu hours if time-restricted
4. Clear cache and refresh

### Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Room not found" | Invalid QR code | Re-generate QR code |
| "Guest not checked in" | No active guest | Complete check-in |
| "Invalid PIN" | Wrong credentials | Verify or reset PIN |
| "Menu unavailable" | Outside hours | Check menu schedule |
| "Order cannot be cancelled" | Too late in process | Contact guest |

### Getting Support

**Technical Support**
- Email: support@menuqr.fr
- Phone: +33 1 XX XX XX XX
- Hours: 9:00 - 18:00 CET

**Emergency Line**
For critical issues: +33 1 XX XX XX XX (24/7)

---

## Quick Reference

### Keyboard Shortcuts (Desktop)

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + N` | New order |
| `Ctrl/Cmd + G` | New guest |
| `Ctrl/Cmd + K` | Open KDS |
| `Ctrl/Cmd + /` | Search |
| `Esc` | Close modal |

### Status Color Codes

| Color | Meaning |
|-------|---------|
| 🟢 Green | Available / Completed |
| 🔵 Blue | Occupied / In Progress |
| 🟡 Yellow | Attention Needed |
| 🔴 Red | Urgent / Error |
| ⚪ Gray | Inactive / Disabled |

---

*Last updated: December 2024*
*Version 1.0*
