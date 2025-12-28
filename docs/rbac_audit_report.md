# MenuQR RBAC System Audit Report

**Date:** December 28, 2025
**Version:** 1.0
**Scope:** Full Role-Based Access Control (RBAC) Analysis

---

## Executive Summary

The MenuQR application implements a **Multi-Tier Role-Based Access Control (RBAC) system** with three distinct user hierarchies:

1. **Admin/Restaurant Tier** - Owner, Admin, Staff (restaurant management)
2. **Super Admin Tier** - Platform-wide management
3. **Customer Tier** - Guest and authenticated customers

### Key Findings

| Category | Status | Risk Level |
|----------|--------|------------|
| Authentication | Well Implemented | Low |
| Authorization Middleware | Partial | Medium |
| Multi-Tenant Isolation | Incomplete | **High** |
| Audit Logging | Incomplete | **High** |
| Rate Limiting | Missing | **Critical** |
| Two-Factor Auth | Missing | High |
| Session Management | Missing | Medium |

The system has a **solid foundation** with JWT-based authentication and middleware-level authorization. However, **critical gaps exist** that must be addressed before production deployment.

---

## 1. Current RBAC Architecture Overview

### 1.1 Role Definitions

| Role | Scope | Description | Default Assignment |
|------|-------|-------------|-------------------|
| `owner` | Single restaurant | Restaurant owner/creator | Auto-assigned on registration |
| `admin` | Single restaurant | Administrative staff | Assigned by owner |
| `staff` | Single restaurant | Kitchen/cashier staff | Assigned by owner |
| `superadmin` | Platform-wide | System administrator | Special creation only |
| `customer` | Per-restaurant | Guest/authenticated customer | Self-registration |

### 1.2 Authentication Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MenuQR Authentication Flow                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   Frontend   │───▶│  API Server  │───▶│    MongoDB       │  │
│  │   (Vue.js)   │    │  (Express)   │    │  (User/Token)    │  │
│  └──────────────┘    └──────────────┘    └──────────────────┘  │
│         │                   │                                    │
│         │    JWT Token      │                                    │
│         │◀──────────────────│                                    │
│         │                   │                                    │
│         ▼                   ▼                                    │
│  ┌──────────────┐    ┌──────────────┐                           │
│  │ localStorage │    │TokenBlacklist│                           │
│  │ (Token/User) │    │   (Logout)   │                           │
│  └──────────────┘    └──────────────┘                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Token Structure

**Admin/Owner/Staff Token:**
```typescript
interface JwtPayload {
  userId: string;
  email: string;
  role: 'owner' | 'admin' | 'staff' | 'superadmin';
  restaurantId?: string;
  isImpersonation?: boolean;
  originalUserId?: string;
  originalEmail?: string;
  originalRole?: string;
}
```

**Customer Token:**
```typescript
interface CustomerJwtPayload {
  customerId: string;
  phone: string;
  restaurantId: string;
  type?: 'otp_verified' | 'customer_refresh';
}
```

### 1.4 Authorization Middleware Chain

```
Request → authenticate → authorize(roles) → Controller
                │              │
                ▼              ▼
         Token Verify    Role Check
         (JWT decode)    (Array.includes)
```

**Backend Files:**
- `menuqr-api/src/middleware/auth.ts` - Main auth/authorize middleware
- `menuqr-api/src/middleware/superAdmin.ts` - Super admin checks
- `menuqr-api/src/middleware/customerAuth.ts` - Customer authentication

**Frontend Stores:**
- `menuqr-app/src/stores/adminAuth.ts` - Admin authentication state
- `menuqr-app/src/stores/superAdminAuth.ts` - Super admin state
- `menuqr-app/src/stores/customerAuth.ts` - Customer state (per-restaurant)

---

## 2. Identified Problems

### 2.1 Critical Issues

#### 2.1.1 Missing Rate Limiting
**Severity:** CRITICAL
**Location:** No rate limiting middleware found in codebase

**Problem:**
No rate limiting exists on any endpoint, including:
- Login attempts (brute force vulnerability)
- OTP sends (SMS bombing potential)
- API endpoints (DoS vulnerability)
- File uploads (resource exhaustion)

**Impact:**
- Account takeover via password brute force
- Financial loss from SMS abuse
- Service denial via API flooding

**Current Code:**
```typescript
// No rate limiting middleware applied
router.post('/auth/login', authController.login);
router.post('/customer/auth/send-otp', customerAuthController.sendOtp);
```

---

#### 2.1.2 Incomplete Multi-Restaurant Isolation
**Severity:** HIGH
**Location:** Multiple controllers

**Problem:**
Restaurant data isolation is inconsistent. Some controllers check ownership correctly, while others have flawed logic.

**Flawed Pattern Found:**
```typescript
// restaurantController.ts - BROKEN
if (restaurant.ownerId.toString() !== user._id.toString() && user.role !== 'admin') {
  throw new ApiError(403, 'Not authorized');
}
// Issue: Any 'admin' role bypasses ownership - including admins from OTHER restaurants
```

**Correct Pattern Should Be:**
```typescript
// Should verify BOTH ownership AND restaurant assignment
const userRestaurantId = req.user.restaurantId;
if (restaurant._id.toString() !== userRestaurantId) {
  throw new ApiError(403, 'Not authorized for this restaurant');
}
```

**Affected Controllers:**
- `restaurantController.ts` (lines 107-109)
- `orderController.ts`
- `loyaltyController.ts`
- `reviewController.ts`

---

#### 2.1.3 Missing Audit Logging for RBAC Events
**Severity:** HIGH
**Location:** Throughout system

**Problem:**
While an `AuditLog` model exists, there is no consistent logging of:
- Failed authorization attempts
- Super admin actions
- Impersonation sessions
- Permission changes

**Current State:**
```typescript
// No logging when authorization fails
if (!roles.includes(req.user.role)) {
  res.status(403).json({ message: 'Access denied' });
  return; // No audit log!
}
```

**Should Include:**
```typescript
await AuditLog.create({
  userId: req.user?.userId,
  action: 'AUTHORIZATION_DENIED',
  resource: req.path,
  requestedRole: roles,
  userRole: req.user?.role,
  ip: req.ip,
  timestamp: new Date()
});
```

---

### 2.2 High-Priority Issues

#### 2.2.1 Staff Role Too Coarse-Grained
**Severity:** MEDIUM
**Location:** Role definitions

**Problem:**
All staff have identical permissions. No distinction between:
- Kitchen staff (should only manage order status)
- Cashier (should handle payments)
- Floor manager (should manage tables and reservations)

**Current:**
```typescript
authorize('owner', 'admin', 'staff') // One-size-fits-all
```

**Impact:** Kitchen staff can access payment reports, cashiers can modify menu items.

---

#### 2.2.2 Super Admin Bypass Without Audit
**Severity:** MEDIUM
**Location:** `menuqr-api/src/middleware/superAdmin.ts`

**Problem:**
Super admin automatically bypasses all role checks without audit trail:

```typescript
export const isSuperAdminOrRole = (...roles: string[]) => {
  return (req, res, next) => {
    if (req.user.role === 'superadmin') {
      return next(); // Silent bypass - no logging!
    }
    // ...
  };
};
```

**Impact:** No accountability for super admin actions.

---

#### 2.2.3 Frontend Role Stored in localStorage
**Severity:** MEDIUM
**Location:** `menuqr-app/src/stores/adminAuth.ts`

**Problem:**
User role is stored in localStorage and used for UI decisions:

```typescript
const savedUser = localStorage.getItem('menuqr_admin_user');
user.value = savedUser ? JSON.parse(savedUser) : null;
// UI renders based on user.value.role - can be modified by user
```

**Impact:** Users could modify their role in localStorage to see restricted UI (backend still rejects, but poor UX).

---

#### 2.2.4 Missing Two-Factor Authentication
**Severity:** HIGH
**Location:** Authentication flow

**Problem:**
No 2FA/MFA implemented for admin accounts. OTP exists only for customer registration.

**Impact:** Compromised admin passwords lead directly to account takeover.

---

### 2.3 Medium-Priority Issues

| Issue | Location | Description |
|-------|----------|-------------|
| No password expiration | User model | Passwords never expire |
| CAPTCHA only on registration | Route middleware | No CAPTCHA on login (brute force risk) |
| Token refresh not automatic | Frontend API service | Manual refresh only |
| No session management | Throughout | Cannot revoke other device sessions |
| Impersonation tokens readable | JWT payload | Original user info in base64 |

### 2.4 Low-Priority Issues

| Issue | Location | Description |
|-------|----------|-------------|
| No OAuth/SSO | Auth system | Only email/phone authentication |
| No IP whitelisting | API | No geo-blocking or IP restrictions |
| No field-level permissions | Data access | All-or-nothing access to resources |
| Staff can't update profiles | Endpoints | Unclear if staff can change password |

---

## 3. Recommended Improvements

### 3.1 Enhanced Role & Permission Model

#### Current Model (Simple Role Check)
```typescript
// Current: Hardcoded role arrays
authorize('owner', 'admin', 'staff');
```

#### Proposed Model (Permission-Based)
```typescript
// New: Permission-based authorization
interface Permission {
  resource: string;      // 'orders', 'dishes', 'settings'
  action: string;        // 'create', 'read', 'update', 'delete'
  scope?: 'own' | 'all'; // Data scope
}

interface RolePermissions {
  role: string;
  permissions: Permission[];
}

const ROLE_PERMISSIONS: RolePermissions[] = [
  {
    role: 'owner',
    permissions: [
      { resource: '*', action: '*', scope: 'all' }  // Full access
    ]
  },
  {
    role: 'manager',  // NEW sub-role
    permissions: [
      { resource: 'orders', action: '*', scope: 'all' },
      { resource: 'tables', action: '*', scope: 'all' },
      { resource: 'reservations', action: '*', scope: 'all' },
      { resource: 'staff', action: 'read', scope: 'all' },
      { resource: 'dishes', action: 'update', scope: 'all' },  // Availability only
    ]
  },
  {
    role: 'kitchen_staff',  // NEW sub-role
    permissions: [
      { resource: 'orders', action: 'read', scope: 'all' },
      { resource: 'orders', action: 'update_status', scope: 'all' },
    ]
  },
  {
    role: 'cashier',  // NEW sub-role
    permissions: [
      { resource: 'orders', action: 'read', scope: 'all' },
      { resource: 'orders', action: 'update_payment', scope: 'all' },
      { resource: 'payments', action: '*', scope: 'all' },
    ]
  }
];
```

#### Permission Check Middleware
```typescript
// New middleware
export const hasPermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    const permissions = await getPermissionsForRole(userRole);

    const hasAccess = permissions.some(p =>
      (p.resource === resource || p.resource === '*') &&
      (p.action === action || p.action === '*')
    );

    if (!hasAccess) {
      await auditLog.create({
        event: 'PERMISSION_DENIED',
        userId: req.user?.userId,
        resource,
        action,
        ip: req.ip
      });
      return res.status(403).json({ message: 'Permission denied' });
    }

    next();
  };
};

// Usage
router.put('/dishes/:id', authenticate, hasPermission('dishes', 'update'), dishController.update);
```

---

### 3.2 Multi-Tenant Isolation Middleware

```typescript
// New middleware: Enforce restaurant context
export const enforceRestaurantContext = async (req: Request, res: Response, next: NextFunction) => {
  const userRestaurantId = req.user?.restaurantId;
  const requestedRestaurantId = req.params.restaurantId || req.body.restaurantId;

  // Super admin can access any restaurant
  if (req.user?.role === 'superadmin') {
    return next();
  }

  // Verify user has access to this restaurant
  if (requestedRestaurantId && requestedRestaurantId !== userRestaurantId) {
    await auditLog.create({
      event: 'CROSS_TENANT_ACCESS_DENIED',
      userId: req.user?.userId,
      requestedRestaurant: requestedRestaurantId,
      userRestaurant: userRestaurantId,
      ip: req.ip
    });
    return res.status(403).json({ message: 'Access denied to this restaurant' });
  }

  // Inject restaurant context for downstream use
  req.restaurantContext = userRestaurantId;
  next();
};

// Usage - apply globally to all restaurant-scoped routes
router.use('/admin/*', authenticate, enforceRestaurantContext);
```

---

### 3.3 Comprehensive Audit Logging

```typescript
// New AuditLog schema
const auditLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now, index: true },
  event: {
    type: String,
    enum: [
      'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT',
      'PERMISSION_GRANTED', 'PERMISSION_DENIED',
      'DATA_CREATE', 'DATA_READ', 'DATA_UPDATE', 'DATA_DELETE',
      'IMPERSONATION_START', 'IMPERSONATION_END',
      'PASSWORD_CHANGE', 'PASSWORD_RESET',
      'ROLE_CHANGE', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED'
    ]
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
  resource: String,
  action: String,
  resourceId: String,
  previousValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  ip: String,
  userAgent: String,
  metadata: mongoose.Schema.Types.Mixed
});

// Middleware to auto-log
export const auditMiddleware = (event: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', async () => {
      if (res.statusCode < 400) {
        await AuditLog.create({
          event,
          userId: req.user?.userId,
          restaurantId: req.user?.restaurantId,
          resource: req.baseUrl,
          action: req.method,
          resourceId: req.params.id,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
      }
    });
    next();
  };
};
```

---

### 3.4 Rate Limiting Implementation

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

// Login rate limiter
export const loginLimiter = rateLimit({
  store: new RedisStore({ /* redis config */ }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP rate limiter (SMS protection)
export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 OTPs per hour per phone
  keyGenerator: (req) => req.body.phone,
  message: { success: false, message: 'Too many OTP requests. Try again later.' }
});

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
});

// Apply to routes
router.post('/auth/login', loginLimiter, authController.login);
router.post('/customer/auth/send-otp', otpLimiter, customerAuthController.sendOtp);
app.use('/api/', apiLimiter);
```

---

### 3.5 Two-Factor Authentication

```typescript
// TOTP-based 2FA implementation
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

// User model additions
interface User {
  // ... existing fields
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  twoFactorBackupCodes: string[];
}

// Enable 2FA
export const enable2FA = async (req: Request, res: Response) => {
  const secret = speakeasy.generateSecret({
    name: `MenuQR:${req.user!.email}`,
    issuer: 'MenuQR'
  });

  // Store temp secret until verified
  await User.findByIdAndUpdate(req.user!.userId, {
    twoFactorSecret: secret.base32
  });

  const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

  res.json({
    secret: secret.base32,
    qrCode,
    backupCodes: generateBackupCodes()
  });
};

// Verify 2FA during login
export const verify2FA = async (req: Request, res: Response) => {
  const { token, userId } = req.body;
  const user = await User.findById(userId);

  const verified = speakeasy.totp.verify({
    secret: user!.twoFactorSecret!,
    encoding: 'base32',
    token,
    window: 1 // Allow 1 step tolerance
  });

  if (!verified) {
    await auditLog.create({ event: '2FA_FAILURE', userId });
    return res.status(401).json({ message: 'Invalid 2FA code' });
  }

  // Issue full access token
  const accessToken = generateToken(user!);
  res.json({ token: accessToken });
};
```

---

### 3.6 Frontend Role Validation

```typescript
// Enhanced adminAuth store
export const useAdminAuthStore = defineStore('adminAuth', () => {
  // ... existing code

  // Validate role on app initialization
  async function validateSession(): Promise<boolean> {
    if (!token.value) return false;

    try {
      const profile = await api.getProfile();

      // Compare server role with stored role
      if (profile.role !== user.value?.role) {
        console.warn('Role mismatch detected, updating...');
        user.value = profile;
        localStorage.setItem('menuqr_admin_user', JSON.stringify(profile));
      }

      return true;
    } catch (error) {
      // Token invalid - clear auth
      logout();
      return false;
    }
  }

  return {
    // ... existing exports
    validateSession
  };
});

// App.vue - validate on mount
onMounted(async () => {
  const authStore = useAdminAuthStore();
  if (authStore.token) {
    await authStore.validateSession();
  }
});
```

---

## 4. Action Plan with Priorities

### Phase 1: Critical Security Fixes (Week 1-2)

| # | Task | Effort | Risk Reduction |
|---|------|--------|----------------|
| 1.1 | Implement rate limiting on all endpoints | 4h | Critical |
| 1.2 | Fix restaurant isolation in controllers | 8h | High |
| 1.3 | Add audit logging for auth events | 6h | High |
| 1.4 | Fix admin role bypass in restaurant checks | 2h | High |
| 1.5 | Add CAPTCHA to login after 3 failed attempts | 4h | Medium |

### Phase 2: Authentication Hardening (Week 3-4)

| # | Task | Effort | Risk Reduction |
|---|------|--------|----------------|
| 2.1 | Implement 2FA for admin accounts | 12h | High |
| 2.2 | Add session management (device tracking) | 8h | Medium |
| 2.3 | Implement automatic token refresh | 4h | Low |
| 2.4 | Add password expiration policy (90 days) | 4h | Low |
| 2.5 | Frontend role validation on app init | 2h | Medium |

### Phase 3: Permission System Upgrade (Week 5-6)

| # | Task | Effort | Risk Reduction |
|---|------|--------|----------------|
| 3.1 | Design permission matrix | 4h | - |
| 3.2 | Create Permission model | 4h | - |
| 3.3 | Implement `hasPermission` middleware | 8h | Medium |
| 3.4 | Migrate routes to permission-based auth | 12h | Medium |
| 3.5 | Create sub-roles (manager, kitchen, cashier) | 6h | Medium |
| 3.6 | Add role management UI for owners | 8h | Low |

### Phase 4: Monitoring & Compliance (Week 7-8)

| # | Task | Effort | Risk Reduction |
|---|------|--------|----------------|
| 4.1 | Complete audit logging for all CRUD | 8h | Medium |
| 4.2 | Build audit log viewer for super admin | 6h | Low |
| 4.3 | Add login notification emails | 4h | Low |
| 4.4 | Implement IP-based anomaly detection | 8h | Medium |
| 4.5 | Add GDPR data export/deletion | 12h | Compliance |

---

## 5. Proposed RBAC Model

### 5.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PROPOSED RBAC ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                            SUPER ADMIN TIER                             │ │
│  │  ┌──────────────┐                                                      │ │
│  │  │  superadmin  │──▶ Full platform access + Impersonation              │ │
│  │  └──────────────┘                                                      │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│                                      ▼                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         RESTAURANT ADMIN TIER                           │ │
│  │                                                                          │ │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │ │
│  │  │    owner     │───▶│    admin     │───▶│   manager    │              │ │
│  │  └──────────────┘    └──────────────┘    └──────────────┘              │ │
│  │         │                   │                   │                       │ │
│  │         ▼                   ▼                   ▼                       │ │
│  │  Full restaurant     Most features       Operations only               │ │
│  │  + billing           - billing           + staff view                   │ │
│  │  + staff mgmt        - staff mgmt                                       │ │
│  │                                                                          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│                                      ▼                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                            STAFF TIER                                   │ │
│  │                                                                          │ │
│  │  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │ │
│  │  │ kitchen_staff│    │   cashier    │    │    waiter    │              │ │
│  │  └──────────────┘    └──────────────┘    └──────────────┘              │ │
│  │         │                   │                   │                       │ │
│  │         ▼                   ▼                   ▼                       │ │
│  │  Order status        Payment handling    Table service                  │ │
│  │  KDS access          Order completion    Reservations                   │ │
│  │                                                                          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
│                                      ▼                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                           CUSTOMER TIER                                 │ │
│  │                                                                          │ │
│  │  ┌──────────────┐    ┌──────────────┐                                  │ │
│  │  │   customer   │    │    guest     │                                  │ │
│  │  └──────────────┘    └──────────────┘                                  │ │
│  │         │                   │                                           │ │
│  │         ▼                   ▼                                           │ │
│  │  Loyalty, reviews     Browse menu only                                  │ │
│  │  Order history        Place orders                                      │ │
│  │                                                                          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Permission Matrix

| Permission | owner | admin | manager | kitchen | cashier | waiter | customer |
|------------|:-----:|:-----:|:-------:|:-------:|:-------:|:------:|:--------:|
| **Menu Management** |
| dishes.create | ✓ | ✓ | - | - | - | - | - |
| dishes.update | ✓ | ✓ | - | - | - | - | - |
| dishes.delete | ✓ | ✓ | - | - | - | - | - |
| dishes.availability | ✓ | ✓ | ✓ | ✓ | - | - | - |
| categories.* | ✓ | ✓ | - | - | - | - | - |
| **Order Management** |
| orders.view | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | own |
| orders.create | ✓ | ✓ | ✓ | - | ✓ | ✓ | ✓ |
| orders.update_status | ✓ | ✓ | ✓ | ✓ | ✓ | - | - |
| orders.update_payment | ✓ | ✓ | ✓ | - | ✓ | - | - |
| orders.cancel | ✓ | ✓ | ✓ | - | ✓ | - | own |
| **Table Management** |
| tables.* | ✓ | ✓ | ✓ | - | - | ✓ | - |
| reservations.view | ✓ | ✓ | ✓ | - | - | ✓ | own |
| reservations.manage | ✓ | ✓ | ✓ | - | - | - | - |
| **Staff Management** |
| staff.view | ✓ | ✓ | ✓ | - | - | - | - |
| staff.create | ✓ | ✓ | - | - | - | - | - |
| staff.update | ✓ | ✓ | - | - | - | - | - |
| staff.delete | ✓ | - | - | - | - | - | - |
| **Settings & Billing** |
| settings.view | ✓ | ✓ | ✓ | - | - | - | - |
| settings.update | ✓ | ✓ | - | - | - | - | - |
| billing.* | ✓ | - | - | - | - | - | - |
| **Customer Features** |
| loyalty.earn | - | - | - | - | - | - | ✓ |
| reviews.create | - | - | - | - | - | - | ✓ |
| reviews.view | ✓ | ✓ | ✓ | - | - | - | own |
| reviews.respond | ✓ | ✓ | - | - | - | - | - |

### 5.3 Database Schema

```typescript
// Permission Model
const permissionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },  // 'dishes.create'
  description: String,
  category: String,  // 'menu', 'orders', 'staff'
  isSystemDefault: { type: Boolean, default: false }
});

// Role Model
const roleSchema = new mongoose.Schema({
  name: { type: String, required: true },  // 'kitchen_staff'
  displayName: { type: String, required: true },  // 'Kitchen Staff'
  description: String,
  permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
  isCustom: { type: Boolean, default: false },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },  // null for system roles
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// User Model Updates
const userSchema = new mongoose.Schema({
  // ... existing fields
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },  // Changed from string to reference
  customPermissions: [{
    permission: { type: mongoose.Schema.Types.ObjectId, ref: 'Permission' },
    granted: Boolean,  // Override: true = grant, false = revoke
  }],
  // ... rest of schema
});
```

---

## 6. Conclusion

The MenuQR RBAC system has a **functional foundation** but requires **significant improvements** to meet production security standards. The most critical issues are:

1. **No rate limiting** - Immediate fix required
2. **Restaurant isolation bugs** - Data leakage risk
3. **Missing audit logging** - Compliance and debugging gap
4. **Coarse-grained roles** - Operational inflexibility

Following the proposed action plan will transform the system into an enterprise-ready, auditable, and flexible permission system while maintaining backwards compatibility with existing features.

---

## Appendix A: Files Analyzed

| File | Purpose |
|------|---------|
| `menuqr-api/src/middleware/auth.ts` | Authentication & authorization middleware |
| `menuqr-api/src/middleware/superAdmin.ts` | Super admin access control |
| `menuqr-api/src/middleware/customerAuth.ts` | Customer authentication |
| `menuqr-api/src/models/User.ts` | User model with role definitions |
| `menuqr-api/src/routes/*.ts` | Route definitions with middleware |
| `menuqr-api/src/controllers/*.ts` | Business logic with permission checks |
| `menuqr-app/src/stores/adminAuth.ts` | Admin auth state management |
| `menuqr-app/src/stores/superAdminAuth.ts` | Super admin auth state |
| `menuqr-app/src/stores/customerAuth.ts` | Customer auth state |
| `menuqr-app/src/router/index.ts` | Frontend route guards |

## Appendix B: References

- OWASP Access Control Cheat Sheet
- NIST Digital Identity Guidelines (SP 800-63)
- JWT Best Practices (RFC 8725)
- Express.js Security Best Practices

---

*Report generated by Claude Code - December 28, 2025*
