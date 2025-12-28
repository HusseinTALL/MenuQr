# Security Decisions

This document records security-related architectural decisions and their rationale.

---

## 1. Token Blacklist - Fail Open on Database Error

**Location:** `menuqr-api/src/middleware/auth.ts:30`

**Decision:** When the token blacklist check fails due to a database error, the system allows the request to proceed (fail open).

```typescript
const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  try {
    const blacklisted = await TokenBlacklist.findOne({ token });
    return !!blacklisted;
  } catch (error) {
    logger.error('Error checking token blacklist', error);
    return false; // Fail open
  }
};
```

**Rationale:**
- A database timeout should not block all legitimate users
- Tokens have short expiration times (configured in JWT_EXPIRES_IN)
- The risk of a blacklisted token being used during a brief DB outage is low
- Failing closed would cause complete service disruption

**Mitigations:**
- Errors are logged for monitoring and alerting
- Token expiration provides a hard limit on abuse window
- Consider implementing Redis-based blacklist for higher availability

**Alternative considered:** Fail closed (reject all requests on DB error). Rejected because it would cause service disruption for legitimate users.

---

## 2. Database Index Strategy

**Decision:** Remove redundant index declarations to prevent MongoDB warnings and improve startup performance.

**Changes Made (December 2025):**

| Model | Issue | Resolution |
|-------|-------|------------|
| Invoice | `invoiceNumber` had both `unique: true` in schema AND `.index()` call | Removed `.index()` call |
| SubscriptionPlan | `slug` had both `unique: true` AND `.index()` call | Removed `.index()` call |
| TokenBlacklist | `token` had `unique: true` AND `index: true` on same field | Removed `index: true` |
| Subscription | `restaurantId` had both `unique: true` AND `.index()` call | Removed `.index()` call |
| Reservation | `reservationNumber` had `unique: true` AND separate `.index()` | Removed `.index()` call |
| SystemConfig | `key` had `unique: true` AND `index: true` on same field | Removed `index: true` |

**Rationale:**
- MongoDB's `unique: true` automatically creates an index
- Duplicate index declarations cause warning logs on startup
- Unnecessary indexes consume memory and slow writes

---

## 3. CI Security Audit

**Location:** `.github/workflows/ci.yml`

**Decision:** Run `npm audit` on every CI pipeline execution with the following behavior:

1. **High-level audit** runs first (continue-on-error: true) for visibility
2. **Critical vulnerability check** fails the build if any critical vulnerabilities exist
3. Runs for both frontend and backend packages

**Configuration:**
```yaml
- name: Audit Dependencies
  run: npm audit --audit-level=high
  continue-on-error: true

- name: Check for Critical Vulnerabilities
  run: |
    CRITICAL=$(npm audit --json | jq '.metadata.vulnerabilities.critical // 0')
    if [ "$CRITICAL" -gt 0 ]; then
      exit 1
    fi
```

**Rationale:**
- High/moderate vulnerabilities are reported but don't block deployment
- Only critical vulnerabilities block the build
- Allows teams to address vulnerabilities without blocking all development

---

## 4. JWT Token Strategy

**Decision:** Use short-lived access tokens with refresh token rotation.

**Configuration:**
- Access tokens: Short-lived (configurable via `JWT_EXPIRES_IN`)
- Refresh tokens: Longer-lived (configurable via `JWT_REFRESH_EXPIRES_IN`)
- Impersonation tokens: 1 hour maximum

**Token Rotation:**
- When a refresh token is used, the old token is blacklisted
- New access and refresh tokens are issued
- This limits the window of token compromise

**Blacklist TTL:**
- Expired tokens are automatically removed via MongoDB TTL index
- `tokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })`

---

## 5. Authentication Separation

**Decision:** Maintain separate authentication systems for different user types.

**Systems:**
1. **Admin Auth** (`/auth/*`) - Restaurant owners, admins, staff
2. **Super Admin Auth** (`/super-admin/*`) - Platform administrators
3. **Customer Auth** (`/customer/auth/*`) - Restaurant customers

**Rationale:**
- Different token structures for different use cases
- Customers have restaurant-scoped tokens
- Super admins have platform-wide access
- Prevents token confusion attacks

**Token Payload Differences:**

| Field | Admin | Super Admin | Customer |
|-------|-------|-------------|----------|
| userId/customerId | userId | userId | customerId |
| restaurantId | Optional | N/A | Required |
| role | owner/admin/staff | superadmin | N/A |
| phone | N/A | N/A | Required |

---

## 6. Rate Limiting (Planned)

**Status:** Not yet implemented (see RBAC audit report)

**Recommendation:** Implement rate limiting on:
- Login endpoints (5 attempts per 15 minutes)
- OTP endpoints (3 per hour per phone number)
- API endpoints (100 requests per minute)

---

## 7. Account Lockout

**Location:** `menuqr-api/src/controllers/authController.ts`

**Decision:** Lock accounts after configurable failed login attempts.

**Configuration:**
- `MAX_FAILED_ATTEMPTS`: Maximum failed attempts before lockout
- `LOCKOUT_DURATION_MS`: Duration of lockout

**Behavior:**
- Failed attempts increment counter
- Successful login resets counter
- Locked accounts cannot authenticate until lockout expires

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-28 | Claude Code | Initial document - duplicate index fixes, CI audit, token blacklist documentation |
