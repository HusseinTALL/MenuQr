# MenuQR Production Readiness Audit Report
**Date:** December 31, 2025
**Auditor:** Claude Code (Senior Product Engineer + QA Auditor)

---

## Executive Summary

MenuQR is a comprehensive restaurant/hotel ordering platform with delivery management capabilities. The codebase includes ~39 data models, 50+ API routes, and supports 4 user roles (admin, customer, driver, hotel guest). While significant functionality has been implemented, **critical security and data integrity issues** must be addressed before production deployment.

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| Security | 3 | 4 | 2 | 1 |
| Data Integrity | 2 | 1 | 2 | 0 |
| Testing | 1 | 2 | 1 | 0 |
| Performance | 0 | 1 | 3 | 2 |
| Code Quality | 0 | 2 | 4 | 3 |
| **Total** | **6** | **10** | **12** | **6** |

---

## Top 15 Issues Summary

| # | Severity | Category | Issue | Effort | Impact |
|---|----------|----------|-------|--------|--------|
| 1 | 🔴 Critical | Security | IDOR in dishController - any authenticated user can modify any restaurant's dishes | 2h | Data breach |
| 2 | 🔴 Critical | Security | IDOR in deliveryDriverController - drivers can access other drivers' data | 2h | Privacy violation |
| 3 | 🔴 Critical | Data | Race condition in stock validation allows overselling | 4h | Revenue loss |
| 4 | 🔴 Critical | Security | 4-digit PIN auth for guests with no rate limiting | 3h | Account takeover |
| 5 | 🔴 Critical | Security | Missing CSRF protection on state-changing operations | 4h | Session hijack |
| 6 | 🔴 Critical | Testing | 0% test coverage on payment flows (Stripe Connect) | 8h | Revenue at risk |
| 7 | 🟠 High | Security | Driver passwords use 10 bcrypt rounds vs 12 for admins | 1h | Weak security |
| 8 | 🟠 High | Security | JWT secrets use fallback defaults in code | 1h | Token forgery |
| 9 | 🟠 High | Data | Unvalidated spread operators allow field injection | 3h | Data corruption |
| 10 | 🟠 High | Testing | Delivery module has 0 backend tests | 8h | Regression risk |
| 11 | 🟠 High | Testing | Driver earnings/payouts untested | 6h | Financial errors |
| 12 | 🟠 High | Performance | Puppeteer dependency adds 200MB to deployment | 2h | Slow deploys |
| 13 | 🟠 High | Code | 47 ESLint errors (unused vars, any types, curly braces) | 3h | Maintainability |
| 14 | 🟡 Medium | Performance | No WebP image optimization | 4h | Slow load times |
| 15 | 🟡 Medium | Security | No HTTP security headers (CSP, HSTS) | 2h | XSS risk |

---

## Detailed Findings

### 1. Security Issues

#### 1.1 🔴 CRITICAL: IDOR Vulnerabilities

**Location:** `menuqr-api/src/controllers/dishController.ts`

```typescript
// Current code - NO ownership check
export const updateDish = async (req: Request, res: Response) => {
  const { id } = req.params;
  const dish = await Dish.findByIdAndUpdate(id, req.body, { new: true });
  // Any authenticated user can update ANY dish!
}
```

**Fix Required:**
```typescript
export const updateDish = async (req: Request, res: Response) => {
  const { id } = req.params;
  const dish = await Dish.findById(id).populate('category');
  if (!dish) return res.status(404).json({ error: 'Dish not found' });

  // Verify ownership through category -> restaurant -> user chain
  const category = await Category.findById(dish.category);
  const restaurant = await Restaurant.findById(category?.restaurant);
  if (restaurant?.owner.toString() !== req.user?.userId) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  // ... proceed with update
}
```

**Affected Endpoints:**
- `PUT /api/dishes/:id` - dishController.ts
- `DELETE /api/dishes/:id` - dishController.ts
- `GET /api/v1/driver/earnings` - deliveryDriverController.ts
- `PUT /api/v1/driver/profile` - deliveryDriverController.ts

---

#### 1.2 🔴 CRITICAL: Guest PIN Authentication Weakness

**Location:** `menuqr-api/src/controllers/hotelGuestController.ts`

```typescript
// 4-digit PIN with NO rate limiting = 10,000 possible combinations
// Attacker can brute force in minutes
export const verifyPin = async (req: Request, res: Response) => {
  const { roomId, pin } = req.body;
  const guest = await HotelGuest.findOne({ room: roomId, pin });
  // No attempt tracking, no lockout, no delay
}
```

**Fix Required:**
- Implement rate limiting (5 attempts per 15 minutes)
- Add progressive delays after failed attempts
- Consider 6-digit PINs or alphanumeric codes
- Add CAPTCHA after 3 failed attempts

---

#### 1.3 🟠 HIGH: Inconsistent Password Hashing

**Location:** `menuqr-api/src/models/DeliveryDriver.ts:85` vs `menuqr-api/src/models/User.ts:62`

```typescript
// DeliveryDriver.ts - WEAKER
const salt = await bcrypt.genSalt(10);

// User.ts - STRONGER
const salt = await bcrypt.genSalt(12);
```

**Fix:** Standardize on 12 rounds minimum for all password hashing.

---

#### 1.4 🟠 HIGH: JWT Secret Fallbacks

**Location:** `menuqr-api/src/config/env.ts`

```typescript
JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
JWT_DRIVER_SECRET: process.env.JWT_DRIVER_SECRET || 'driver-secret-key',
```

**Risk:** If env vars are missing, predictable secrets are used.

**Fix:** Remove fallbacks, fail fast if secrets not configured:
```typescript
JWT_SECRET: process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET required') })(),
```

---

#### 1.5 🟡 MEDIUM: Missing Security Headers

**Current State:** No CSP, HSTS, X-Frame-Options headers configured.

**Fix:** Add helmet middleware with strict configuration:
```typescript
import helmet from 'helmet';
app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } },
  hsts: { maxAge: 31536000, includeSubDomains: true }
}));
```

---

### 2. Data Integrity Issues

#### 2.1 🔴 CRITICAL: Stock Race Condition

**Location:** `menuqr-api/src/services/inventoryService.ts` + `orderController.ts`

```typescript
// Current flow (VULNERABLE):
// 1. Check stock: if (dish.stock >= quantity) ✓
// 2. Create order (async DB write)
// 3. Reduce stock (separate transaction)
//
// Race: Two orders can pass step 1 simultaneously before either reaches step 3
```

**Fix Required - Atomic Transaction:**
```typescript
const session = await mongoose.startSession();
session.startTransaction();
try {
  // Atomic decrement with validation
  const result = await Dish.findOneAndUpdate(
    { _id: dishId, stock: { $gte: quantity } },
    { $inc: { stock: -quantity } },
    { session, new: true }
  );
  if (!result) throw new Error('Insufficient stock');

  await Order.create([orderData], { session });
  await session.commitTransaction();
} catch (e) {
  await session.abortTransaction();
  throw e;
}
```

---

#### 2.2 🟠 HIGH: Unvalidated Field Injection

**Location:** Multiple controllers use spread operators

```typescript
// dishController.ts - VULNERABLE
const dish = new Dish({
  ...req.body,  // Attacker can inject: { owner: "attacker-id", isApproved: true }
  category: categoryId
});
```

**Fix:** Explicitly destructure allowed fields:
```typescript
const { name, description, price, image, allergens } = req.body;
const dish = new Dish({ name, description, price, image, allergens, category: categoryId });
```

---

#### 2.3 🟡 MEDIUM: No Soft Delete for Critical Data

Orders, customers, and audit logs can be hard-deleted, losing business intelligence and compliance data.

**Fix:** Add `deletedAt` field and filter queries:
```typescript
orderSchema.add({ deletedAt: { type: Date, default: null } });
orderSchema.pre(/^find/, function() { this.where({ deletedAt: null }); });
```

---

### 3. Testing Gaps

#### 3.1 🔴 CRITICAL: Payment Flows Untested

**Risk:** Stripe Connect integration for driver payouts has 0 test coverage.

**Files needing tests:**
- `stripeConnectService.ts` - Account creation, transfers
- `driverPayoutController.ts` - Payout requests, history
- `driverEarningsService.ts` - Commission calculations

**Minimum Test Cases:**
```typescript
describe('StripeConnectService', () => {
  it('should create connected account for driver');
  it('should handle account creation failure');
  it('should process payout transfer');
  it('should handle insufficient balance');
  it('should validate minimum payout amount');
});
```

---

#### 3.2 🟠 HIGH: Delivery Module Coverage

**Current State:**
- Frontend: 21 test files (mostly component unit tests)
- Backend: 7 test files (basic model validation)
- Delivery module: 0 tests

**Missing Critical Tests:**
| Module | Test Files | Priority |
|--------|------------|----------|
| deliveryController | 0 | P0 |
| deliveryAssignmentService | 0 | P0 |
| deliveryTrackingService | 0 | P1 |
| driverShiftController | 0 | P1 |
| orderController (delivery flow) | 0 | P0 |

---

#### 3.3 🟡 MEDIUM: E2E Test Reliability

**Current State:** Playwright tests exist but have flaky failures (video artifacts in git status show failed runs).

**Issues:**
- Tests depend on real backend (no mocking)
- No test data seeding strategy
- Missing wait conditions cause timing issues

---

### 4. Performance Issues

#### 4.1 🟠 HIGH: Puppeteer Bundle Size

**Location:** `menuqr-api/package.json`

```json
"puppeteer": "^21.0.0"  // ~200MB dependency
```

**Usage:** Only for PDF invoice generation.

**Fix Options:**
1. Replace with `puppeteer-core` + shared Chrome installation
2. Use `pdf-lib` for simple invoices (10KB vs 200MB)
3. Move PDF generation to serverless function

---

#### 4.2 🟡 MEDIUM: No Image Optimization

**Current State:** Images served as-is (JPEG/PNG), no responsive sizes.

**Fix:**
- Add Sharp for WebP conversion on upload
- Generate multiple sizes (thumbnail, medium, large)
- Implement lazy loading on frontend

---

#### 4.3 🟡 MEDIUM: Missing HTTP Caching

**Current State:** No Cache-Control headers on static assets or API responses.

**Fix:**
```typescript
// Static assets - long cache
app.use('/uploads', express.static('uploads', { maxAge: '1y' }));

// API responses - short cache for listings
res.set('Cache-Control', 'public, max-age=60');
```

---

#### 4.4 🟡 MEDIUM: No Database Indexing Strategy

**Missing Indexes:**
```typescript
// High-impact queries without indexes:
Order.find({ restaurant: id, status: 'pending' });  // Needs compound index
Delivery.find({ driver: id, status: { $in: [...] } });
AuditLog.find({ createdAt: { $gte: date } });
```

---

### 5. Code Quality Issues

#### 5.1 🟠 HIGH: ESLint Violations

**Count:** 47 errors across codebase

**Breakdown:**
| Error Type | Count | Example Files |
|------------|-------|---------------|
| `@typescript-eslint/no-explicit-any` | 23 | api.ts, controllers |
| `curly` (missing braces) | 12 | Various |
| `no-unused-vars` | 8 | Test files |
| `@typescript-eslint/no-unused-vars` | 4 | Services |

---

#### 5.2 🟠 HIGH: Inconsistent Error Handling

**Pattern A (Good):**
```typescript
try {
  // operation
} catch (error) {
  console.error('Context:', error);
  return res.status(500).json({ error: 'User-friendly message' });
}
```

**Pattern B (Bad - exposes internals):**
```typescript
catch (error: any) {
  res.status(500).json({ error: error.message });  // Leaks stack traces
}
```

**Affected Files:** 15+ controllers mix both patterns.

---

#### 5.3 🟡 MEDIUM: Missing TypeScript Strict Mode

**Location:** `menuqr-api/tsconfig.json`

```json
{
  "compilerOptions": {
    "strict": false  // Should be true
  }
}
```

---

### 6. Missing Functionality (Typical for Production)

| Feature | Status | Priority | Effort |
|---------|--------|----------|--------|
| Email verification on signup | ❌ Missing | High | 4h |
| Password reset flow | ❌ Missing | High | 4h |
| Account lockout after failed logins | ❌ Missing | High | 2h |
| Admin user management UI | ❌ Missing | Medium | 8h |
| Order refund workflow | ❌ Missing | High | 6h |
| Multi-language support (i18n) | ❌ Missing | Medium | 16h |
| Webhook retry mechanism | ❌ Missing | Medium | 4h |
| Database backup automation | ❌ Missing | High | 4h |
| Health check endpoints | ⚠️ Basic | Low | 2h |
| API rate limiting | ❌ Missing | High | 3h |

---

## Quick Wins (< 4 hours each)

| # | Task | Time | Impact |
|---|------|------|--------|
| 1 | Standardize bcrypt rounds to 12 | 30min | Security |
| 2 | Remove JWT secret fallbacks | 30min | Security |
| 3 | Add helmet security headers | 1h | Security |
| 4 | Fix 47 ESLint errors | 2h | Quality |
| 5 | Add ownership check to dish endpoints | 2h | Security |
| 6 | Add rate limiting to guest PIN auth | 2h | Security |
| 7 | Replace Puppeteer with pdf-lib | 3h | Performance |
| 8 | Add compound indexes to MongoDB | 2h | Performance |

---

## Next 7 Days Action Plan

### Day 1-2: Critical Security Fixes
- [ ] Fix IDOR in dishController (add ownership validation)
- [ ] Fix IDOR in deliveryDriverController
- [ ] Add rate limiting to guest PIN verification
- [ ] Standardize bcrypt rounds to 12
- [ ] Remove JWT secret fallbacks
- [ ] Add helmet security headers

### Day 3: Data Integrity
- [ ] Implement atomic stock transactions
- [ ] Replace spread operators with explicit field destructuring
- [ ] Add soft delete to Order and Customer models

### Day 4-5: Testing Foundation
- [ ] Write tests for stripeConnectService (5 critical paths)
- [ ] Write tests for deliveryController (create, assign, complete)
- [ ] Write tests for orderController delivery flow
- [ ] Fix flaky E2E tests with proper wait conditions

### Day 6: Performance & Quality
- [ ] Replace Puppeteer with pdf-lib
- [ ] Add MongoDB compound indexes
- [ ] Fix all 47 ESLint errors
- [ ] Enable TypeScript strict mode

### Day 7: Missing Features
- [ ] Implement password reset flow
- [ ] Add account lockout mechanism
- [ ] Implement API rate limiting middleware
- [ ] Add order refund basic workflow

---

## Risk Assessment Matrix

```
                    IMPACT
                Low    Med    High
            ┌────────┬────────┬────────┐
      High  │        │ #7,#8  │ #1-6   │
LIKELIHOOD  ├────────┼────────┼────────┤
      Med   │ #15    │ #13,14 │ #9-12  │
            ├────────┼────────┼────────┤
      Low   │        │        │        │
            └────────┴────────┴────────┘
```

---

## Recommendations

1. **Do NOT deploy to production** until Critical issues #1-6 are resolved
2. **Implement CI pipeline** with ESLint, TypeScript strict, and test coverage gates
3. **Add security scanning** (npm audit, Snyk) to build process
4. **Consider penetration testing** before public launch
5. **Document API endpoints** with OpenAPI/Swagger for external integrations

---

## Appendix: File Inventory

### Backend (`menuqr-api/src/`)
- **Controllers:** 22 files
- **Models:** 39 files
- **Routes:** 18 files
- **Services:** 24 files
- **Middleware:** 4 files
- **Tests:** 7 files (12% coverage estimate)

### Frontend (`menuqr-app/src/`)
- **Views:** 45 files (across admin, customer, driver, hotel)
- **Components:** 32 files
- **Composables:** 12 files
- **Stores:** 8 files
- **Tests:** 21 files

---

*Report generated by Claude Code audit tool*
