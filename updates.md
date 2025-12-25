# Subscription & Plan Management System - API Documentation

## Overview

This document describes the complete subscription and plan management system implemented for Fleeting Commerce. The system allows multi-tenant e-commerce stores to manage their subscriptions, enforce resource limits, and handle payments.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Plan Tiers](#plan-tiers)
3. [API Endpoints](#api-endpoints)
   - [Session Validation API (NEW)](#session-validation-api)
   - [Plans API](#plans-api)
   - [Subscriptions API](#subscriptions-api)
   - [Notifications API](#notifications-api)
   - [Payments API](#payments-api)
4. [User Flows](#user-flows)
5. [Limit Enforcement](#limit-enforcement)
6. [Grace Period Logic](#grace-period-logic)
7. [Frontend Integration Guide](#frontend-integration-guide)
8. [Error Handling](#error-handling)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         TENANT ADMIN                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Plans API    │   │ Subscriptions │   │ Notifications │
│  (Public +    │   │     API       │   │     API       │
│   Admin)      │   │               │   │               │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        │           ┌───────┴───────┐           │
        │           ▼               ▼           │
        │   ┌───────────────┐ ┌───────────┐     │
        │   │ LimitChecker  │ │ Payments  │     │
        │   │   Service     │ │    API    │     │
        │   └───────────────┘ └───────────┘     │
        │           │               │           │
        └───────────┴───────┬───────┴───────────┘
                            ▼
                    ┌───────────────┐
                    │   Database    │
                    │   (Prisma)    │
                    └───────────────┘
```

### New Modules Created

| Module              | Path                    | Description                          |
| ------------------- | ----------------------- | ------------------------------------ |
| PlansModule         | `/src/plans/`           | Plan CRUD and seeding                |
| SubscriptionsModule | `/src/subscriptions/`   | Subscription management              |
| NotificationsModule | `/src/notifications/`   | Notification system + cron jobs      |
| PaymentsModule      | `/src/payments/`        | Payment processing (SSLCommerz stub) |
| LimitCheckerService | `/src/common/services/` | Resource limit enforcement           |

---

## Plan Tiers

| Plan       | Price (BDT) | Products | Categories | Subcategories/Category | Trial Days |
| ---------- | ----------- | -------- | ---------- | ---------------------- | ---------- |
| Free Trial | 0           | 20       | 5          | 5                      | 14         |
| Starter    | 999         | 100      | 20         | 10                     | 0          |
| Growth     | 2499        | 200      | 50         | 25                     | 0          |

---

## API Endpoints

### Session Validation API

**IMPORTANT:** This is the most critical endpoint for frontend integration. Call this on every app load/reload.

#### Validate Session

```
GET /auth/validate-session
```

**Authorization:** Bearer Token (any authenticated user)

**Purpose:** Validates JWT token and returns comprehensive data including user info, tenant, subscription status, access permissions, usage stats, and unread notifications.

**Response (Full Example):**

```json
{
  "message": "Session validated successfully",
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+8801234567890",
      "role": "TENANT_ADMIN",
      "tenantId": "uuid",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "tenant": {
      "id": "uuid",
      "name": "My Store",
      "hasUsedTrial": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "subscription": {
      "id": "uuid",
      "status": "ACTIVE",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-02-01T00:00:00.000Z",
      "trialEndsAt": null,
      "plan": {
        "id": "uuid",
        "name": "Starter",
        "price": 999,
        "currency": "BDT",
        "maxProducts": 100,
        "maxCategories": 20,
        "maxSubcategoriesPerCategory": 10
      }
    },
    "access": {
      "hasAccess": true,
      "canCreate": true,
      "canUpdate": true,
      "canDelete": true,
      "isInGracePeriod": false,
      "gracePeriodDaysRemaining": 0,
      "daysRemaining": 25,
      "message": "Subscription active. 25 day(s) remaining."
    },
    "usage": {
      "products": { "used": 15, "limit": 100, "remaining": 85 },
      "categories": { "used": 5, "limit": 20, "remaining": 15 },
      "subcategoriesPerCategory": { "maxUsed": 3, "limit": 10 }
    },
    "unreadNotifications": 2
  }
}
```

**Frontend Usage:**

```typescript
// On every app load
const validateSession = async () => {
  const token = localStorage.getItem('token');
  if (!token) return router.push('/login');

  try {
    const res = await api.get('/auth/validate-session');
    const { user, subscription, access, usage, unreadNotifications } =
      res.data.data;

    // Store in global state
    setGlobalState({ user, subscription, access, usage, unreadNotifications });

    // Handle access scenarios
    if (!subscription) router.push('/onboarding/subscription');
    else if (!access.hasAccess) router.push('/subscription/blocked');
    else if (access.isInGracePeriod) showWarningBanner(access.message);
  } catch (e) {
    if (e.response?.status === 401) {
      localStorage.removeItem('token');
      router.push('/login');
    }
  }
};
```

---

### Plans API

Base URL: `/plans`

#### 1. Get All Active Plans (Public)

```
GET /plans
```

**Authorization:** None (Public)

**Response:**

```json
{
  "message": "Plans fetched successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Free Trial",
      "price": 0,
      "currency": "BDT",
      "interval": "MONTHLY",
      "trialDays": 14,
      "maxProducts": 20,
      "maxCategories": 5,
      "maxSubcategoriesPerCategory": 5,
      "maxOrders": 50,
      "customDomain": false,
      "isActive": true
    }
  ]
}
```

#### 2. Get Single Plan

```
GET /plans/:id
```

**Authorization:** None (Public)

**Parameters:**

- `id` (UUID): Plan ID

#### 3. Get All Plans Including Inactive (Admin)

```
GET /plans/admin/all
```

**Authorization:** Bearer Token (SUPER_ADMIN only)

#### 4. Create Plan (Admin)

```
POST /plans
```

**Authorization:** Bearer Token (SUPER_ADMIN only)

**Body:**

```json
{
  "name": "Enterprise",
  "price": 4999,
  "currency": "BDT",
  "interval": "MONTHLY",
  "trialDays": 0,
  "maxProducts": 500,
  "maxCategories": 100,
  "maxSubcategoriesPerCategory": 50,
  "maxOrders": 5000,
  "customDomain": true
}
```

#### 5. Update Plan (Admin)

```
PATCH /plans/:id
```

**Authorization:** Bearer Token (SUPER_ADMIN only)

**Body:** Any fields from CreatePlanDto + `isActive: boolean`

#### 6. Seed Default Plans (Admin)

```
POST /plans/seed
```

**Authorization:** Bearer Token (SUPER_ADMIN only)

**Note:** Only works if no plans exist. Creates Free Trial, Starter, and Growth plans.

---

### Subscriptions API

Base URL: `/subscriptions`

**Authorization:** Bearer Token (TENANT_ADMIN required for all endpoints)

#### 1. Get Current Subscription

```
GET /subscriptions/current
```

**Response:**

```json
{
  "message": "Subscription fetched successfully",
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "planId": "uuid",
    "status": "ACTIVE",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-02-01T00:00:00.000Z",
    "trialEndsAt": null,
    "plan": { ... },
    "currentStatus": "ACTIVE",
    "daysRemaining": 25,
    "isInGracePeriod": false,
    "gracePeriodDaysRemaining": 0
  },
  "hasSubscription": true
}
```

**Status Values:**

- `TRIAL` - Active free trial
- `ACTIVE` - Paid subscription active
- `EXPIRED` - Subscription expired
- `CANCELLED` - Subscription cancelled

#### 2. Get Usage vs Limits

```
GET /subscriptions/usage
```

**Response:**

```json
{
  "message": "Usage fetched successfully",
  "data": {
    "products": {
      "used": 15,
      "limit": 100,
      "remaining": 85
    },
    "categories": {
      "used": 5,
      "limit": 20,
      "remaining": 15
    },
    "subcategoriesPerCategory": {
      "maxUsed": 3,
      "limit": 10
    },
    "plan": { ... }
  }
}
```

#### 3. Activate Free Trial

```
POST /subscriptions/activate-trial
```

**Response (Success):**

```json
{
  "message": "Free trial activated successfully! You have 14 days to explore.",
  "data": { ... subscription with plan }
}
```

**Response (Already Used):**

```json
{
  "statusCode": 400,
  "message": "You have already used your free trial. Please select a paid plan to continue."
}
```

#### 4. Select Plan

```
POST /subscriptions/select-plan
```

**Body:**

```json
{
  "planId": "uuid"
}
```

**Response (Requires Payment):**

```json
{
  "message": "Please complete payment to activate this plan",
  "data": {
    "planId": "uuid",
    "planName": "Starter",
    "amount": 999,
    "currency": "BDT",
    "requiresPayment": true
  }
}
```

#### 5. Upgrade Plan

```
POST /subscriptions/upgrade
```

**Body:**

```json
{
  "planId": "uuid"
}
```

**Note:** New plan must have higher price than current plan.

#### 6. Downgrade Plan

```
POST /subscriptions/downgrade
```

**Body:**

```json
{
  "planId": "uuid"
}
```

**Note:** Will fail if current usage exceeds new plan limits.

**Response (Exceeds Limits):**

```json
{
  "statusCode": 403,
  "message": "Cannot downgrade: You exceed the new plan limits",
  "violations": [
    "You have 50 products but the Starter plan only allows 20. Delete 30 product(s) first."
  ]
}
```

#### 7. Renew Subscription

```
POST /subscriptions/renew
```

**Response:**

```json
{
  "message": "Please complete payment to renew your subscription",
  "data": {
    "plan": "Starter",
    "amount": 999,
    "currency": "BDT",
    "requiresPayment": true,
    "planId": "uuid"
  }
}
```

#### 8. Check Access Status

```
GET /subscriptions/access-status
```

**Response:**

```json
{
  "hasAccess": true,
  "canCreate": true,
  "canUpdate": true,
  "canDelete": true,
  "message": "Subscription active"
}
```

**Grace Period Response:**

```json
{
  "hasAccess": true,
  "canCreate": false,
  "canUpdate": false,
  "canDelete": true,
  "message": "Your subscription has expired. You have 5 day(s) to renew before losing access."
}
```

---

### Notifications API

Base URL: `/notifications`

**Authorization:** Bearer Token (TENANT_ADMIN required)

#### 1. Get All Notifications

```
GET /notifications
```

**Response:**

```json
{
  "message": "Notifications fetched successfully",
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "title": "Subscription Expires in 5 Days",
      "message": "Your Starter subscription will expire in 5 days. Renew early to avoid any interruption.",
      "type": "SUBSCRIPTION_EXPIRY",
      "isRead": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Notification Types:**

- `SUBSCRIPTION_EXPIRY` - Reminder before expiry
- `SUBSCRIPTION_EXPIRED` - Subscription has expired
- `PAYMENT_SUCCESS` - Payment was successful
- `PAYMENT_FAILED` - Payment failed
- `LIMIT_WARNING` - Exceeded plan limits
- `GENERAL` - General notifications

#### 2. Get Unread Count

```
GET /notifications/unread-count
```

**Response:**

```json
{
  "message": "Unread count fetched",
  "data": {
    "unreadCount": 3
  }
}
```

#### 3. Get Unread Notifications

```
GET /notifications/unread
```

#### 4. Mark Single as Read

```
PATCH /notifications/:id/read
```

#### 5. Mark All as Read

```
PATCH /notifications/mark-all-read
```

#### 6. Delete Notification

```
DELETE /notifications/:id
```

---

### Payments API

Base URL: `/payments`

#### 1. Initiate Payment

```
POST /payments/initiate
```

**Authorization:** Bearer Token (TENANT_ADMIN)

**Body:**

```json
{
  "planId": "uuid"
}
```

**Response:**

```json
{
  "message": "Payment initiated successfully",
  "data": {
    "paymentId": "uuid",
    "transactionId": "TXN_ABC123XYZ",
    "amount": 999,
    "currency": "BDT",
    "planName": "Starter",
    "gatewayUrl": "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
    "sessionData": {
      "store_id": "YOUR_STORE_ID",
      "total_amount": 999,
      "currency": "BDT",
      "tran_id": "TXN_ABC123XYZ",
      "success_url": "http://localhost:3000/payments/callback/success",
      "fail_url": "http://localhost:3000/payments/callback/fail",
      "cancel_url": "http://localhost:3000/payments/callback/cancel"
    }
  }
}
```

#### 2. Payment Callbacks (SSLCommerz)

These are called by SSLCommerz gateway, not by frontend:

```
POST /payments/callback/success
POST /payments/callback/fail
POST /payments/callback/cancel
POST /payments/ipn
```

#### 3. Get Payment History

```
GET /payments/history
```

**Authorization:** Bearer Token (TENANT_ADMIN)

**Response:**

```json
{
  "message": "Payment history fetched successfully",
  "data": [
    {
      "id": "uuid",
      "tenantId": "uuid",
      "amount": 999,
      "currency": "BDT",
      "provider": "sslcommerz",
      "transactionId": "TXN_ABC123XYZ",
      "status": "PAID",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "subscription": { "plan": { ... } }
    }
  ]
}
```

#### 4. Get Single Payment

```
GET /payments/:id
```

**Authorization:** Bearer Token (TENANT_ADMIN)

#### 5. Manual Verification (Dev/Testing)

```
POST /payments/verify-manual?transactionId=TXN_ABC123XYZ
```

**Authorization:** Bearer Token (TENANT_ADMIN)

**Note:** For testing only. Manually marks a payment as successful.

---

## User Flows

### Flow 1: New User Registration → Free Trial

```
1. User registers a new tenant account
2. Frontend shows "Welcome! Start your 14-day free trial"
3. User clicks "Start Free Trial"
4. Frontend calls: POST /subscriptions/activate-trial
5. Backend:
   - Checks if tenant has used trial (hasUsedTrial flag)
   - Creates subscription with status=TRIAL
   - Sets trialEndsAt to 14 days from now
   - Marks tenant.hasUsedTrial = true
6. User can now create products/categories up to trial limits
```

### Flow 2: Free Trial → Paid Plan

```
1. User's trial is ending (or they want more resources)
2. Frontend shows plan selection page
3. User selects "Starter" plan
4. Frontend calls: POST /subscriptions/select-plan { planId: "..." }
5. Backend returns: { requiresPayment: true, amount: 999 }
6. Frontend calls: POST /payments/initiate { planId: "..." }
7. Backend creates payment record, returns gateway data
8. Frontend redirects to SSLCommerz payment page
9. User completes payment
10. SSLCommerz calls: POST /payments/callback/success
11. Backend activates subscription, sends notification
12. Frontend redirects to dashboard showing "Subscription Active"
```

### Flow 3: Upgrade Plan

```
1. User on Starter plan wants Growth plan
2. Frontend calls: POST /subscriptions/upgrade { planId: growthPlanId }
3. Backend validates new plan price > current price
4. Returns: { requiresPayment: true, amount: 2499 }
5. Same payment flow as above
```

### Flow 4: Downgrade Plan

```
1. User on Growth plan wants Starter plan
2. Frontend calls: POST /subscriptions/downgrade { planId: starterPlanId }
3. Backend checks if usage exceeds new limits:
   - Products: 150 used, Starter allows 100 → FAIL
   - Returns violations array
4. Frontend shows: "Delete 50 products before downgrading"
5. User deletes items, tries again
6. If limits OK, same payment flow
```

### Flow 5: Subscription Expiry → Grace Period → Blocked

```
Day 0 (Subscription Active):
- User has full access
- canCreate: true, canUpdate: true, canDelete: true

Day 30 (Subscription Expires):
- Cron job runs at 9 AM
- Creates "Subscription Expired" notification
- Status changes to EXPIRED
- Grace period starts (7 days)
- canCreate: false, canUpdate: false, canDelete: true (to reduce usage)

Day 31-36 (Grace Period):
- User sees warning banner
- Can only view and delete
- Frontend shows: "Your subscription has expired. You have X days to renew."

Day 37+ (Grace Period Ended):
- hasAccess: false
- All operations blocked
- Frontend redirects to "Renew Subscription" page
```

### Flow 6: Renewal

```
1. User's subscription is expiring/expired
2. Frontend calls: POST /subscriptions/renew
3. Backend returns payment info for current plan
4. Same payment flow
5. Subscription extended by 1 month from payment date
```

---

## Limit Enforcement

Limits are enforced at the service level for:

- **Products** (total count per tenant)
- **Categories** (total count per tenant)
- **Subcategories** (per category count)

### When Creating Resources

```typescript
// In products.service.ts, categories.service.ts, subcategories.service.ts
await this.limitChecker.canCreate(tenantId, 'products');
```

### Error Response When Limit Reached

```json
{
  "statusCode": 403,
  "message": "You have reached the maximum number of products (100) for your Starter plan. Upgrade to add more."
}
```

### Error Response When Over Limit (After Downgrade)

```json
{
  "statusCode": 403,
  "message": "You have exceeded your plan limits. Delete 10 product(s) to meet your limit of 20. Please delete some items or upgrade your plan."
}
```

---

## Grace Period Logic

| Status            | Days Since Expiry | canCreate | canUpdate | canDelete | canView |
| ----------------- | ----------------- | --------- | --------- | --------- | ------- |
| ACTIVE            | N/A               | ✅        | ✅        | ✅        | ✅      |
| TRIAL             | N/A               | ✅        | ✅        | ✅        | ✅      |
| EXPIRED (Grace)   | 0-7               | ❌        | ❌        | ✅        | ✅      |
| EXPIRED (Blocked) | 8+                | ❌        | ❌        | ❌        | ❌      |

---

## Frontend Integration Guide

### 1. Check Subscription on App Load

```typescript
// On app initialization or login
const checkSubscription = async () => {
  const response = await api.get('/subscriptions/current');

  if (!response.data.hasSubscription) {
    // Show trial activation or plan selection
    router.push('/onboarding/subscription');
    return;
  }

  const { currentStatus, isInGracePeriod, daysRemaining } = response.data.data;

  if (currentStatus === 'EXPIRED' && !isInGracePeriod) {
    // Fully blocked - show renewal page
    router.push('/subscription/renew');
  } else if (isInGracePeriod) {
    // Show warning banner
    showWarningBanner(
      `Subscription expired. ${response.data.data.gracePeriodDaysRemaining} days left to renew.`,
    );
  }
};
```

### 2. Display Usage Dashboard

```typescript
const fetchUsage = async () => {
  const response = await api.get('/subscriptions/usage');
  const { products, categories, subcategoriesPerCategory, plan } =
    response.data.data;

  // Show progress bars
  // products.used / products.limit
  // categories.used / categories.limit
};
```

### 3. Handle Create/Update Errors

```typescript
try {
  await api.post('/products', productData);
} catch (error) {
  if (error.response?.status === 403) {
    // Show limit reached or grace period message
    showError(error.response.data.message);

    if (error.response.data.message.includes('maximum')) {
      // Prompt upgrade
      showUpgradeModal();
    }
  }
}
```

### 4. Payment Flow

```typescript
const handlePlanSelection = async (planId: string) => {
  // Step 1: Select plan
  const selectResponse = await api.post('/subscriptions/select-plan', {
    planId,
  });

  if (selectResponse.data.data.requiresPayment) {
    // Step 2: Initiate payment
    const paymentResponse = await api.post('/payments/initiate', { planId });

    // Step 3: Redirect to payment gateway
    // SSLCommerz requires form submission
    submitToSSLCommerz(paymentResponse.data.data.sessionData);
  }
};

// After payment callback, check subscription status
const handlePaymentReturn = async () => {
  const response = await api.get('/subscriptions/current');
  if (response.data.data.status === 'ACTIVE') {
    showSuccess('Subscription activated!');
    router.push('/dashboard');
  }
};
```

### 5. Notification Bell

```typescript
// Poll or use websocket for real-time
const fetchNotifications = async () => {
  const [countRes, notificationsRes] = await Promise.all([
    api.get('/notifications/unread-count'),
    api.get('/notifications/unread'),
  ]);

  setBadgeCount(countRes.data.data.unreadCount);
  setNotifications(notificationsRes.data.data);
};
```

---

## Error Handling

### Common Error Codes

| Status | Message Pattern                            | Action                  |
| ------ | ------------------------------------------ | ----------------------- |
| 400    | "You have already used your free trial..." | Show paid plans         |
| 400    | "Free trial cannot be renewed..."          | Show paid plans         |
| 403    | "You have reached the maximum..."          | Show upgrade modal      |
| 403    | "You have exceeded your plan limits..."    | Show delete items modal |
| 403    | "Your subscription has expired..."         | Show renewal page       |
| 403    | "No subscription found..."                 | Show plan selection     |
| 404    | "Plan not found"                           | Refresh plans list      |

### Handling Grace Period in UI

```typescript
const getAccessInfo = async () => {
  const response = await api.get('/subscriptions/access-status');
  const { hasAccess, canCreate, canUpdate, canDelete, message } = response.data;

  // Disable create/edit buttons based on permissions
  setCanCreate(canCreate);
  setCanUpdate(canUpdate);
  setCanDelete(canDelete);

  if (!hasAccess) {
    // Full block - redirect to renewal
    router.push('/subscription/blocked');
  } else if (!canCreate) {
    // Grace period - show warning
    showGracePeriodWarning(message);
  }
};
```

---

## Cron Jobs

### Daily Subscription Check (9 AM BST / 3 AM UTC)

The system automatically:

1. Checks all active/trial subscriptions
2. Sends notifications at:
   - 10 days before expiry
   - 5 days before expiry
   - 2 days before expiry
   - 1 day before expiry
   - On expiry day
3. Updates subscription status to EXPIRED when due

No frontend action required - notifications appear automatically.

---

## Database Schema Changes

### New Tables

- `Plan` - Stores plan definitions
- `Subscription` - Tenant subscriptions
- `Payment` - Payment records
- `Notification` - Notification records

### Modified Tables

- `Tenant` - Added `hasUsedTrial` boolean field

---

## Testing Checklist

- [ ] Seed plans: `POST /plans/seed` (as SUPER_ADMIN)
- [ ] Activate trial: `POST /subscriptions/activate-trial`
- [ ] Check usage: `GET /subscriptions/usage`
- [ ] Create products until limit reached
- [ ] Attempt to exceed limit (should fail with 403)
- [ ] Initiate payment: `POST /payments/initiate`
- [ ] Verify payment manually: `POST /payments/verify-manual`
- [ ] Check subscription updated to ACTIVE
- [ ] Check notifications: `GET /notifications`
- [ ] Test downgrade with exceeding limits (should fail)
