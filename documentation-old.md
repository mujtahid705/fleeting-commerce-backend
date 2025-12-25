# Fleeting Commerce Backend - Complete API Documentation

## Overview

This document contains complete API documentation for all existing endpoints in the Fleeting Commerce Backend. This is a multi-tenant e-commerce platform built with NestJS and Prisma.

---

## Table of Contents

1. [Authentication API](#authentication-api)
2. [Products API](#products-api)
3. [Categories API](#categories-api)
4. [Subcategories API](#subcategories-api)
5. [Orders API](#orders-api)
6. [Inventory API](#inventory-api)
7. [User Roles & Permissions](#user-roles--permissions)
8. [Frontend Integration Guide](#frontend-integration-guide)

---

## Base URL

```
http://localhost:3000
```

## Authentication Header

All protected endpoints require a Bearer token:

```
Authorization: Bearer <jwt_token>
```

---

## Authentication API

Base URL: `/auth`

### 1. Validate Session (NEW - Call on Every App Reload)

This is the most important endpoint for frontend. Call this on every app load/reload to validate the stored token and get comprehensive user data.

```
GET /auth/validate-session
```

**Authorization:** Bearer Token (any authenticated user)

**Response (TENANT_ADMIN with Active Subscription):**

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
        "maxSubcategoriesPerCategory": 10,
        "maxOrders": 500
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
      }
    },
    "unreadNotifications": 2
  }
}
```

**Response (No Subscription):**

```json
{
  "message": "Session validated successfully",
  "data": {
    "user": { ... },
    "tenant": { "hasUsedTrial": false, ... },
    "subscription": null,
    "access": {
      "hasAccess": false,
      "canCreate": false,
      "canUpdate": false,
      "canDelete": false,
      "isInGracePeriod": false,
      "gracePeriodDaysRemaining": 0,
      "daysRemaining": 0,
      "message": "No subscription found"
    },
    "usage": null,
    "unreadNotifications": 0
  }
}
```

**Response (Grace Period - Expired but within 7 days):**

```json
{
  "data": {
    "access": {
      "hasAccess": true,
      "canCreate": false,
      "canUpdate": false,
      "canDelete": true,
      "isInGracePeriod": true,
      "gracePeriodDaysRemaining": 5,
      "daysRemaining": 0,
      "message": "Subscription expired. 5 day(s) left to renew."
    }
  }
}
```

**Response (SUPER_ADMIN):**

```json
{
  "message": "Session validated successfully",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Super Admin",
      "email": "admin@example.com",
      "role": "SUPER_ADMIN",
      "tenantId": null
    },
    "tenant": null,
    "subscription": null,
    "access": {
      "hasAccess": true,
      "canCreate": true,
      "canUpdate": true,
      "canDelete": true,
      "isInGracePeriod": false,
      "gracePeriodDaysRemaining": 0
    },
    "usage": null,
    "unreadNotifications": 0
  }
}
```

**Error Response (Invalid/Expired Token):**

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

### 2. Login

```
POST /auth/login
```

**Authorization:** None (Public)

**Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "user@example.com",
    "phone": "+8801234567890",
    "role": "TENANT_ADMIN",
    "tenantId": "uuid",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**

```json
// User not found
{ "statusCode": 404, "message": "User not found!" }

// Invalid password
{ "statusCode": 401, "message": "Unauthorized" }
```

---

### 3. Register Tenant Admin with New Tenant

Use this for new store owners signing up.

```
POST /auth/register/tenant-admin-with-tenant
```

**Authorization:** None (Public)

**Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+8801234567890",
  "tenantName": "My Awesome Store"
}
```

**Response:**

```json
{
  "message": "Tenant admin with tenant created successfully",
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+8801234567890",
    "role": "TENANT_ADMIN",
    "tenantId": "uuid",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error:**

```json
{ "statusCode": 400, "message": "Email has already been taken!" }
```

---

### 4. Register Customer

Use this for customers signing up to a specific tenant's store.

```
POST /auth/register/customer
```

**Authorization:** None (Public)

**Body:**

```json
{
  "name": "Jane Customer",
  "email": "jane@example.com",
  "password": "password123",
  "phone": "+8801234567890",
  "tenantId": "uuid-of-tenant"
}
```

**Response:**

```json
{
  "message": "Customer created successfully",
  "data": {
    "id": "uuid",
    "name": "Jane Customer",
    "email": "jane@example.com",
    "phone": "+8801234567890",
    "role": "CUSTOMER",
    "tenantId": "uuid",
    "isActive": true
  }
}
```

---

### 5. Register Tenant Admin (to existing tenant)

```
POST /auth/register/tenant-admin
```

**Authorization:** None (Public)

**Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+8801234567890",
  "tenantId": "uuid-of-existing-tenant"
}
```

---

### 6. Register Super Admin

```
POST /auth/register/super-admin
```

**Authorization:** Bearer Token (SUPER_ADMIN only)

**Body:**

```json
{
  "name": "New Super Admin",
  "email": "newadmin@example.com",
  "password": "password123",
  "phone": "+8801234567890"
}
```

---

## Products API

Base URL: `/products`

### 1. Get All Products

```
GET /products/all
GET /products/all?category=1
GET /products/all?subCategory=2
GET /products/all?category=1&subCategory=2
```

**Authorization:** Optional (Returns products for user's tenant if authenticated)

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| category | number | No | Filter by category ID |
| subCategory | number | No | Filter by subcategory ID |

**Response:**

```json
{
  "message": "Products fetched successfully",
  "categoryId": 1,
  "subCategoryId": null,
  "data": [
    {
      "id": "uuid",
      "title": "Wireless Mouse",
      "slug": "wireless-mouse",
      "description": "High quality wireless mouse with ergonomic design",
      "price": 1500,
      "categoryId": 1,
      "subCategoryId": 2,
      "brand": "Logitech",
      "tenantId": "uuid",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "images": [
        {
          "id": "uuid",
          "imageUrl": "/uploads/products/image1.jpg",
          "order": 0,
          "isActive": true
        }
      ],
      "category": {
        "id": 1,
        "name": "Electronics",
        "slug": "electronics"
      },
      "subCategory": {
        "id": 2,
        "name": "Computer Accessories",
        "slug": "computer-accessories"
      }
    }
  ]
}
```

---

### 2. Get Single Product

```
GET /products/:id
```

**Authorization:** Optional

**Parameters:**

- `id` (UUID): Product ID

**Response:**

```json
{
  "message": "Product fetched successfully",
  "data": {
    "id": "uuid",
    "title": "Wireless Mouse",
    "slug": "wireless-mouse",
    "description": "High quality wireless mouse",
    "price": 1500,
    "categoryId": 1,
    "subCategoryId": 2,
    "brand": "Logitech",
    "tenantId": "uuid",
    "images": [...],
    "category": {...},
    "subCategory": {...}
  }
}
```

**Error:**

```json
{ "statusCode": 404, "message": "Product not found" }
```

---

### 3. Create Product

```
POST /products/create
```

**Authorization:** Bearer Token (TENANT_ADMIN only)

**Content-Type:** `multipart/form-data`

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | Yes | Product title |
| description | string | Yes | Product description |
| price | number | Yes | Product price |
| categoryId | number | Yes | Category ID |
| subCategoryId | number | No | Subcategory ID |
| brand | string | No | Brand name |
| images | file[] | No | Up to 5 images |

**Example (FormData):**

```javascript
const formData = new FormData();
formData.append('title', 'Wireless Mouse');
formData.append('description', 'High quality wireless mouse');
formData.append('price', '1500');
formData.append('categoryId', '1');
formData.append('subCategoryId', '2');
formData.append('brand', 'Logitech');
formData.append('images', file1);
formData.append('images', file2);
```

**Response:**

```json
{
  "message": "Product created successfully",
  "data": {
    "id": "uuid",
    "title": "Wireless Mouse",
    "slug": "wireless-mouse",
    "description": "High quality wireless mouse",
    "price": 1500,
    "categoryId": 1,
    "subCategoryId": 2,
    "brand": "Logitech",
    "tenantId": "uuid",
    "images": [
      { "id": "uuid", "imageUrl": "/uploads/products/abc123.jpg", "order": 0 }
    ],
    "category": {...},
    "subCategory": {...}
  }
}
```

**Errors:**

```json
// Limit reached
{ "statusCode": 403, "message": "You have reached the maximum number of products (100) for your Starter plan. Upgrade to add more." }

// Category not found
{ "statusCode": 404, "message": "Category not found or does not belong to your tenant" }

// Subscription expired
{ "statusCode": 403, "message": "Your subscription has expired. 5 day(s) left in your grace period. Renew now to continue creating and updating." }
```

---

### 4. Update Product

```
PATCH /products/:id
```

**Authorization:** Bearer Token (TENANT_ADMIN only)

**Content-Type:** `multipart/form-data`

**Parameters:**

- `id` (UUID): Product ID

**Form Data:** Same as create (all fields optional)

**Note:** If new images are uploaded, old images are soft-deleted and replaced.

**Response:**

```json
{
  "message": "Product updated successfully",
  "data": {...}
}
```

---

### 5. Delete Product

```
DELETE /products/:id
```

**Authorization:** Bearer Token (TENANT_ADMIN only)

**Parameters:**

- `id` (UUID): Product ID

**Response:**

```json
{
  "message": "Product deleted successfully",
  "data": { "id": "uuid", "title": "Wireless Mouse", ... }
}
```

---

## Categories API

Base URL: `/categories`

### 1. Get All Categories

```
GET /categories/all
```

**Authorization:** Optional (Returns categories for user's tenant)

**Response:**

```json
{
  "message": "Categories fetched successfully",
  "data": [
    {
      "id": 1,
      "name": "Electronics",
      "slug": "electronics",
      "tenantId": "uuid",
      "isActive": true,
      "productsCount": 25,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Clothing",
      "slug": "clothing",
      "tenantId": "uuid",
      "isActive": true,
      "productsCount": 50
    }
  ]
}
```

---

### 2. Create Category

```
POST /categories/create
```

**Authorization:** Bearer Token (TENANT_ADMIN only)

**Body:**

```json
{
  "name": "Electronics"
}
```

**Response:**

```json
{
  "message": "Category created successfully!",
  "data": {
    "id": 1,
    "name": "Electronics",
    "slug": "electronics",
    "tenantId": "uuid",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Errors:**

```json
// Duplicate name
{ "statusCode": 409, "message": "Category already exists!" }

// Limit reached
{ "statusCode": 403, "message": "You have reached the maximum number of categories (20) for your Starter plan. Upgrade to add more." }
```

---

### 3. Update Category

```
PATCH /categories/update/:id
```

**Authorization:** Bearer Token (TENANT_ADMIN only)

**Parameters:**

- `id` (number): Category ID

**Body:**

```json
{
  "name": "Electronics & Gadgets"
}
```

**Response:**

```json
{
  "message": "Category updated successfully",
  "data": {
    "id": 1,
    "name": "Electronics & Gadgets",
    "slug": "electronics-gadgets"
  }
}
```

---

### 4. Delete Category

```
DELETE /categories/delete/:id
```

**Authorization:** Bearer Token (TENANT_ADMIN only)

**Parameters:**

- `id` (number): Category ID

**Response:**

```json
{
  "message": "Category deleted successfully",
  "data": { "id": 1, "name": "Electronics" }
}
```

**Note:** Deleting a category will fail if it has products. Delete or reassign products first.

---

## Subcategories API

Base URL: `/subcategories`

### 1. Get All Subcategories

```
GET /subcategories/all
GET /subcategories/all?categoryId=1
```

**Authorization:** Optional

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| categoryId | number | No | Filter by parent category |

**Response:**

```json
{
  "message": "Subcategories retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "Smartphones",
      "slug": "smartphones",
      "categoryId": 1,
      "category": {
        "id": 1,
        "name": "Electronics",
        "slug": "electronics",
        "tenantId": "uuid"
      }
    },
    {
      "id": 2,
      "name": "Laptops",
      "slug": "laptops",
      "categoryId": 1,
      "category": {...}
    }
  ]
}
```

---

### 2. Create Subcategory

```
POST /subcategories/create
```

**Authorization:** Bearer Token (TENANT_ADMIN only)

**Body:**

```json
{
  "name": "Smartphones",
  "categoryId": 1
}
```

**Response:**

```json
{
  "message": "Subcategory created successfully",
  "data": {
    "id": 1,
    "name": "Smartphones",
    "slug": "smartphones",
    "categoryId": 1,
    "category": {...}
  }
}
```

**Errors:**

```json
// Category not found
{ "statusCode": 404, "message": "Parent category not found" }

// Duplicate in same category
{ "statusCode": 409, "message": "Subcategory already exists for this category" }

// Limit reached
{ "statusCode": 403, "message": "You have reached the maximum subcategories (10) for this category in your Starter plan. Upgrade to add more." }
```

---

### 3. Update Subcategory

```
PATCH /subcategories/update/:id
```

**Authorization:** Bearer Token (TENANT_ADMIN only)

**Parameters:**

- `id` (number): Subcategory ID

**Body:**

```json
{
  "name": "Mobile Phones",
  "categoryId": 1
}
```

**Response:**

```json
{
  "message": "Subcategory updated successfully",
  "data": {...}
}
```

---

### 4. Delete Subcategory

```
DELETE /subcategories/delete/:id
```

**Authorization:** Bearer Token (TENANT_ADMIN only)

**Parameters:**

- `id` (number): Subcategory ID

**Response:**

```json
{
  "message": "Subcategory deleted successfully",
  "data": { "id": 1, "name": "Smartphones" }
}
```

---

## Orders API

Base URL: `/orders`

### 1. Get All Orders (Admin)

```
GET /orders/all
```

**Authorization:** Bearer Token (TENANT_ADMIN only)

**Response:**

```json
{
  "message": "Orders fetched successfully",
  "data": [
    {
      "id": 1,
      "userId": "uuid",
      "tenantId": "uuid",
      "totalAmount": 3500,
      "status": "pending",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "order_items": [
        {
          "id": 1,
          "orderId": 1,
          "productId": "uuid",
          "quantity": 2,
          "unitPrice": 1500,
          "product": {
            "id": "uuid",
            "title": "Wireless Mouse",
            "price": 1500
          }
        }
      ],
      "user": {
        "id": "uuid",
        "name": "Jane Customer",
        "email": "jane@example.com"
      }
    }
  ]
}
```

---

### 2. Get Orders by User ID

```
GET /orders/:userId
```

**Authorization:** Bearer Token (TENANT_ADMIN or CUSTOMER)

**Parameters:**

- `userId` (UUID): User ID

**Note:** CUSTOMER can only access their own orders.

**Response:**

```json
{
  "message": "Orders fetched successfully",
  "data": [...]
}
```

**Error (Customer accessing others' orders):**

```json
{ "statusCode": 403, "message": "You are not allowed to access this order" }
```

---

### 3. Create Order

```
POST /orders/create
```

**Authorization:** Bearer Token (TENANT_ADMIN or CUSTOMER)

**Body:**

```json
{
  "order_items": [
    {
      "productId": "uuid-of-product-1",
      "quantity": 2
    },
    {
      "productId": "uuid-of-product-2",
      "quantity": 1
    }
  ]
}
```

**Note:** Prices are fetched from the database (not from request) to prevent price manipulation.

**Response:**

```json
{
  "message": "Order created successfully",
  "data": {
    "id": 1,
    "userId": "uuid",
    "tenantId": "uuid",
    "totalAmount": 4500,
    "status": "pending",
    "order_items": [
      {
        "id": 1,
        "productId": "uuid",
        "quantity": 2,
        "unitPrice": 1500,
        "product": {...}
      },
      {
        "id": 2,
        "productId": "uuid",
        "quantity": 1,
        "unitPrice": 1500,
        "product": {...}
      }
    ],
    "user": {...}
  }
}
```

**Errors:**

```json
// Product not found
{ "statusCode": 404, "message": "One or more products not found" }

// Product from different tenant
{ "statusCode": 401, "message": "You cannot order products from another tenant" }
```

---

### 4. Update Order Status

```
PATCH /orders/update/status/:id
```

**Authorization:** Bearer Token (TENANT_ADMIN or CUSTOMER)

**Parameters:**

- `id` (number): Order ID

**Body:**

```json
{
  "status": "processing"
}
```

**Valid Status Values:**

- `pending` - Initial status
- `processing` - Order being processed
- `shipped` - Order shipped
- `delivered` - Order delivered
- `cancelled` - Order cancelled

**Note:** CUSTOMER can only cancel their own pending orders.

**Response:**

```json
{
  "message": "Order status updated successfully",
  "data": {
    "id": 1,
    "status": "processing"
  }
}
```

**Errors:**

```json
// Customer trying to do more than cancel
{ "statusCode": 403, "message": "You can only cancel your own pending orders" }

// Order not found
{ "statusCode": 404, "message": "Order not found" }
```

---

## Inventory API

Base URL: `/inventory`

### 1. Add Product to Inventory

```
POST /inventory/add-product
```

**Authorization:** Bearer Token (TENANT_ADMIN only)

**Body:**

```json
{
  "productId": "uuid-of-product",
  "quantity": 100
}
```

**Response:**

```json
{
  "message": "Product added to inventory successfully",
  "data": {
    "id": "uuid",
    "productId": "uuid",
    "tenantId": "uuid",
    "quantity": 100,
    "addedBy": "uuid",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Errors:**

```json
// Product not found
{ "statusCode": 404, "message": "Product not found!" }

// Already in inventory
{ "statusCode": 409, "message": "Product already exists in inventory!" }

// Invalid quantity
{ "statusCode": 400, "message": "Invalid quantity." }

// Different tenant
{ "statusCode": 401, "message": "Unauthorized tenant." }
```

---

### 2. Update Inventory Quantity

```
PATCH /inventory/update-quantity/:productId
```

**Authorization:** Bearer Token (TENANT_ADMIN only)

**Parameters:**

- `productId` (UUID): Product ID

**Body:**

```json
{
  "quantity": 150
}
```

**Response:**

```json
{
  "message": "Inventory quantity updated successfully",
  "data": {
    "id": "uuid",
    "productId": "uuid",
    "quantity": 150
  }
}
```

---

### 3. Delete Inventory Item

```
DELETE /inventory/delete-item/:productId
```

**Authorization:** Bearer Token (TENANT_ADMIN only)

**Parameters:**

- `productId` (UUID): Product ID

**Response:**

```json
{
  "message": "Inventory item deleted successfully",
  "data": { "id": "uuid", "productId": "uuid" }
}
```

---

## User Roles & Permissions

| Role           | Description            | Permissions                    |
| -------------- | ---------------------- | ------------------------------ |
| `SUPER_ADMIN`  | Platform administrator | Manage plans, view all data    |
| `TENANT_ADMIN` | Store owner            | Full CRUD on own tenant's data |
| `CUSTOMER`     | Store customer         | Create orders, view own orders |

### Access Control Matrix

| Endpoint                        | SUPER_ADMIN | TENANT_ADMIN | CUSTOMER         |
| ------------------------------- | ----------- | ------------ | ---------------- |
| GET /auth/validate-session      | ✅          | ✅           | ✅               |
| POST /auth/register/super-admin | ✅          | ❌           | ❌               |
| Products CRUD                   | ❌          | ✅           | ❌               |
| Categories CRUD                 | ❌          | ✅           | ❌               |
| Subcategories CRUD              | ❌          | ✅           | ❌               |
| GET /orders/all                 | ❌          | ✅           | ❌               |
| GET /orders/:userId             | ❌          | ✅           | ✅ (own only)    |
| POST /orders/create             | ❌          | ✅           | ✅               |
| PATCH /orders/status            | ❌          | ✅           | ✅ (cancel only) |
| Inventory CRUD                  | ❌          | ✅           | ❌               |

---

## Frontend Integration Guide

### 1. App Initialization Flow

```typescript
// On app load (App.tsx or main layout)
const initializeApp = async () => {
  const token = localStorage.getItem('token');

  if (!token) {
    // No token - redirect to login
    router.push('/login');
    return;
  }

  try {
    const response = await api.get('/auth/validate-session', {
      headers: { Authorization: `Bearer ${token}` },
    });

    const { user, tenant, subscription, access, usage, unreadNotifications } =
      response.data.data;

    // Store in global state (Redux, Zustand, Context)
    setUser(user);
    setTenant(tenant);
    setSubscription(subscription);
    setAccess(access);
    setUsage(usage);
    setNotificationCount(unreadNotifications);

    // Check access status
    if (!access.hasAccess) {
      // Fully blocked - redirect to subscription page
      router.push('/subscription/blocked');
      return;
    }

    if (!subscription) {
      // No subscription - show trial activation
      router.push('/onboarding/subscription');
      return;
    }

    if (access.isInGracePeriod) {
      // Show warning banner
      showWarningBanner(access.message);
    }
  } catch (error) {
    if (error.response?.status === 401) {
      // Token invalid/expired
      localStorage.removeItem('token');
      router.push('/login');
    }
  }
};
```

### 2. Login Flow

```typescript
const handleLogin = async (email: string, password: string) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    const { token, user } = response.data;

    // Store token
    localStorage.setItem('token', token);

    // Immediately validate session to get full data
    const sessionResponse = await api.get('/auth/validate-session', {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Store all data in global state
    const { subscription, access, usage } = sessionResponse.data.data;

    // Redirect based on subscription status
    if (!subscription) {
      router.push('/onboarding/subscription');
    } else {
      router.push('/dashboard');
    }
  } catch (error) {
    showError(error.response?.data?.message || 'Login failed');
  }
};
```

### 3. Registration Flow

```typescript
const handleRegister = async (data: RegisterData) => {
  try {
    // Register tenant admin with new tenant
    await api.post('/auth/register/tenant-admin-with-tenant', {
      name: data.name,
      email: data.email,
      password: data.password,
      phone: data.phone,
      tenantName: data.storeName,
    });

    // Auto-login after registration
    await handleLogin(data.email, data.password);

    // Will redirect to subscription/trial activation
  } catch (error) {
    showError(error.response?.data?.message || 'Registration failed');
  }
};
```

### 4. Protected Route Component

```typescript
const ProtectedRoute = ({ children, requiredRole }) => {
  const { access, user } = useAppStore();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" />;
  }

  if (!access?.hasAccess) {
    return <Navigate to="/subscription/blocked" />;
  }

  return (
    <>
      {access.isInGracePeriod && (
        <GracePeriodBanner message={access.message} />
      )}
      {children}
    </>
  );
};
```

### 5. CRUD Operations with Access Control

```typescript
const ProductManager = () => {
  const { access } = useAppStore();

  const handleCreate = async (productData: FormData) => {
    if (!access.canCreate) {
      showError('Your subscription does not allow creating new products.');
      return;
    }

    try {
      await api.post('/products/create', productData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showSuccess('Product created!');
      refreshProducts();
    } catch (error) {
      // Handle subscription/limit errors
      if (error.response?.status === 403) {
        showUpgradeModal(error.response.data.message);
      } else {
        showError(error.response?.data?.message);
      }
    }
  };

  return (
    <div>
      <Button
        onClick={() => setShowCreateModal(true)}
        disabled={!access.canCreate}
        title={!access.canCreate ? 'Upgrade to create products' : ''}
      >
        Add Product
      </Button>

      {/* Product list with conditional edit/delete buttons */}
      {products.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          canEdit={access.canUpdate}
          canDelete={access.canDelete}
        />
      ))}
    </div>
  );
};
```

### 6. Usage Progress Display

```typescript
const UsageDashboard = () => {
  const { usage, subscription } = useAppStore();

  if (!usage) return null;

  return (
    <div className="usage-dashboard">
      <h3>Plan: {subscription.plan.name}</h3>

      <ProgressBar
        label="Products"
        used={usage.products.used}
        limit={usage.products.limit}
        warning={usage.products.remaining < 5}
      />

      <ProgressBar
        label="Categories"
        used={usage.categories.used}
        limit={usage.categories.limit}
        warning={usage.categories.remaining < 2}
      />

      <p>
        Max subcategories per category: {usage.subcategoriesPerCategory.limit}
        (Using up to {usage.subcategoriesPerCategory.maxUsed})
      </p>
    </div>
  );
};
```

### 7. Axios Interceptor for Token

```typescript
// api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

// Request interceptor - add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "statusCode": 400,
  "message": "Error message here",
  "error": "Bad Request"
}
```

### Common Status Codes

| Code | Meaning                                    |
| ---- | ------------------------------------------ |
| 400  | Bad Request - Invalid input                |
| 401  | Unauthorized - Invalid/missing token       |
| 403  | Forbidden - No permission or limit reached |
| 404  | Not Found - Resource doesn't exist         |
| 409  | Conflict - Duplicate resource              |

---

## Testing Checklist

- [ ] Register new tenant admin with store
- [ ] Login and verify token
- [ ] Call validate-session and check response
- [ ] Create category
- [ ] Create subcategory
- [ ] Create product with images
- [ ] Update product
- [ ] Delete product
- [ ] Create order as customer
- [ ] Update order status as admin
- [ ] Add product to inventory
- [ ] Update inventory quantity
