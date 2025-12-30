# Hotel Module Deployment Guide

## Overview

This document outlines the deployment process for the MenuQR Hotels Module, including pre-deployment checks, deployment steps, and rollback procedures.

---

## Table of Contents

1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [Environment Variables](#2-environment-variables)
3. [Database Migration](#3-database-migration)
4. [Deployment Steps](#4-deployment-steps)
5. [Post-Deployment Verification](#5-post-deployment-verification)
6. [Rollback Plan](#6-rollback-plan)
7. [Monitoring](#7-monitoring)

---

## 1. Pre-Deployment Checklist

### Code Review
- [ ] All hotel module PRs merged to main
- [ ] Code review completed for all changes
- [ ] No critical or high-severity issues in code scan
- [ ] TypeScript compilation passes without errors

### Testing
- [ ] Unit tests passing (API)
- [ ] Integration tests passing
- [ ] E2E tests passing (or manually verified)
- [ ] Performance testing completed
- [ ] Security testing completed

### Documentation
- [ ] API documentation updated
- [ ] User guides finalized
- [ ] Admin training materials ready
- [ ] Changelog updated

### Infrastructure
- [ ] MongoDB indexes planned
- [ ] Redis cache configuration reviewed
- [ ] CDN configured for static assets
- [ ] SSL certificates valid

### Dependencies
- [ ] All npm packages up to date
- [ ] No known vulnerabilities in dependencies
- [ ] Package-lock.json committed

---

## 2. Environment Variables

### Required Environment Variables

Add to production `.env`:

```bash
# Feature Flags (Hotel Module)
FF_HOTEL_MODULE_ENABLED=true
FF_HOTEL_GUEST_AUTH=true
FF_HOTEL_ROOM_SERVICE=true
FF_HOTEL_KDS=true
FF_HOTEL_REPORTS=true
FF_HOTEL_STAFF_MANAGEMENT=true
FF_HOTEL_SCHEDULED_ORDERS=true

# Optional Advanced Features (disabled by default)
FF_HOTEL_MINIBAR=false
FF_HOTEL_PMS_INTEGRATION=false
FF_HOTEL_VOICE_ORDERING=false
```

### Staged Rollout Configuration

For gradual rollout, start with:

```bash
# Initial deployment - minimal features
FF_HOTEL_MODULE_ENABLED=true
FF_HOTEL_GUEST_AUTH=true
FF_HOTEL_ROOM_SERVICE=true
FF_HOTEL_KDS=true
FF_HOTEL_REPORTS=false
FF_HOTEL_STAFF_MANAGEMENT=false
FF_HOTEL_SCHEDULED_ORDERS=false
```

---

## 3. Database Migration

### Pre-Migration Backup

```bash
# Create backup before migration
mongodump --uri="$MONGODB_URI" --out=/backups/pre-hotel-module-$(date +%Y%m%d_%H%M%S)
```

### Run Migration

```bash
# From menuqr-api directory
cd /path/to/menuqr-api

# Install dependencies if needed
npm install

# Run migration script
npx tsx scripts/migrations/001_hotel_module_indexes.ts
```

### Verify Migration

```bash
# Connect to MongoDB and verify indexes
mongosh "$MONGODB_URI" --eval "
  print('Hotels indexes:');
  db.hotels.getIndexes().forEach(idx => print('  - ' + idx.name));
  print('Rooms indexes:');
  db.rooms.getIndexes().forEach(idx => print('  - ' + idx.name));
  print('Hotel Orders indexes:');
  db.hotelorders.getIndexes().forEach(idx => print('  - ' + idx.name));
"
```

---

## 4. Deployment Steps

### Step 1: Prepare Deployment

```bash
# 1. Pull latest code
git checkout main
git pull origin main

# 2. Verify build
cd menuqr-api && npm run build
cd menuqr-app && npm run build

# 3. Run pre-deployment tests
cd menuqr-api && npm test
```

### Step 2: Database Migration

```bash
# Run on a maintenance window if possible
npx tsx scripts/migrations/001_hotel_module_indexes.ts
```

### Step 3: Deploy API

```bash
# If using PM2
pm2 stop menuqr-api
pm2 start ecosystem.config.js --only menuqr-api

# If using Docker
docker-compose up -d --build api

# Verify API is running
curl https://api.menuqr.fr/api/v1/health
```

### Step 4: Deploy Frontend

```bash
# Build production bundle
cd menuqr-app
npm run build

# Deploy to CDN/hosting
# (specific commands depend on hosting provider)

# Verify frontend
curl -I https://menuqr.fr
```

### Step 5: Verify Deployment

```bash
# Check API health
curl https://api.menuqr.fr/api/v1/health

# Check hotel endpoints (with auth)
curl -H "Authorization: Bearer $TOKEN" \
  https://api.menuqr.fr/api/v1/hotels/me

# Check feature flags
curl https://api.menuqr.fr/api/v1/admin/feature-flags
```

---

## 5. Post-Deployment Verification

### API Verification Checklist

- [ ] Health endpoint responding
- [ ] Authentication working
- [ ] Hotel CRUD operations functional
- [ ] Room management working
- [ ] Guest check-in/out working
- [ ] Order creation working
- [ ] KDS receiving orders
- [ ] WebSocket connections stable

### Frontend Verification Checklist

- [ ] Login page loads
- [ ] Admin dashboard loads
- [ ] Hotel admin views accessible
- [ ] Guest QR code flow works
- [ ] Mobile views responsive
- [ ] No console errors

### Performance Verification

- [ ] API response times < 200ms (p95)
- [ ] Page load times < 3s
- [ ] No memory leaks detected
- [ ] Database queries optimized

### Test Hotel Setup

1. Create test hotel in production
2. Add test rooms
3. Create test menu
4. Simulate guest flow
5. Process test order
6. Verify full workflow

---

## 6. Rollback Plan

### Rollback Triggers

Initiate rollback if:
- Critical errors affecting core restaurant functionality
- Data corruption detected
- Security vulnerability discovered
- 5xx error rate > 5%
- API response time > 5s (p95)

### Rollback Procedure

#### Step 1: Disable Hotel Module (Quick Fix)

```bash
# Immediately disable via feature flag
# Update environment variable
FF_HOTEL_MODULE_ENABLED=false

# Restart API
pm2 restart menuqr-api
```

This disables all hotel routes without code changes.

#### Step 2: Full Code Rollback (If Needed)

```bash
# 1. Identify last working commit
git log --oneline -10

# 2. Revert to previous version
git checkout <previous-commit-hash>

# 3. Rebuild and deploy
npm run build
pm2 restart menuqr-api
```

#### Step 3: Database Rollback (If Needed)

```bash
# Only if data corruption occurred
# Restore from pre-deployment backup
mongorestore --uri="$MONGODB_URI" \
  --drop \
  /backups/pre-hotel-module-<timestamp>
```

### Rollback Communication

1. Notify on-call team
2. Update status page
3. Communicate to affected hotels
4. Document incident

---

## 7. Monitoring

### Key Metrics to Watch

#### API Metrics
- Request rate (hotel endpoints)
- Error rate (5xx, 4xx)
- Response time (p50, p95, p99)
- Database query time

#### Business Metrics
- Hotel signups
- Orders created
- Order completion rate
- Guest authentication success rate

### Alert Configuration

Set up alerts for:

| Metric | Warning | Critical |
|--------|---------|----------|
| Error rate (5xx) | > 1% | > 5% |
| Response time (p95) | > 500ms | > 2s |
| Database connections | > 80% | > 95% |
| Memory usage | > 70% | > 90% |

### Logging

Ensure logging for:
- Hotel creation/updates
- Guest check-in/out
- Order lifecycle
- Authentication attempts
- Error events

### Dashboards

Create monitoring dashboards for:
1. Hotel Module Overview
2. Order Processing
3. Guest Authentication
4. API Performance

---

## Deployment Schedule

### Recommended Deployment Window

- **Time**: Tuesday-Thursday, 10:00-14:00 CET
- **Avoid**: Fridays, weekends, holidays
- **Duration**: 1-2 hours (including verification)

### Staged Rollout Plan

#### Phase 1: Internal Testing (Day 1-3)
- Deploy to staging
- Internal team testing
- Fix any issues

#### Phase 2: Beta Hotels (Day 4-7)
- Enable for 2-3 pilot hotels
- Close monitoring
- Gather feedback

#### Phase 3: Gradual Rollout (Week 2)
- Enable for 25% of new hotels
- Monitor metrics
- Address any issues

#### Phase 4: Full Rollout (Week 3)
- Enable for all hotels
- Full monitoring
- Support ready

---

## Contacts

### On-Call Team
- **Primary**: [Name] - [Phone]
- **Secondary**: [Name] - [Phone]
- **Escalation**: [Name] - [Phone]

### External Contacts
- **MongoDB Support**: [Contact]
- **Hosting Provider**: [Contact]
- **CDN Provider**: [Contact]

---

## Appendix

### Quick Commands Reference

```bash
# Check API status
curl https://api.menuqr.fr/api/v1/health

# Check logs
pm2 logs menuqr-api --lines 100

# Restart API
pm2 restart menuqr-api

# Check database status
mongosh "$MONGODB_URI" --eval "db.adminCommand('ping')"

# Feature flag quick disable
curl -X PUT https://api.menuqr.fr/api/v1/admin/feature-flags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"HOTEL_MODULE_ENABLED": false}'
```

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12-30 | Initial hotel module deployment |

---

*Last updated: December 2024*
