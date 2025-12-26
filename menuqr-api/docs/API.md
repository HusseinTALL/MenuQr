# MenuQR API Documentation

Base URL: `http://localhost:3001/api/v1`

## Table of Contents

- [Authentication](#authentication)
- [Restaurants](#restaurants)
- [Menu](#menu)
- [Categories](#categories)
- [Dishes](#dishes)
- [Orders](#orders)

---

## Authentication

### Register a new user

```
POST /auth/register
```

**Request Body:**
```json
{
  "email": "owner@restaurant.com",
  "password": "SecurePass123",
  "name": "John Doe"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "owner@restaurant.com",
      "name": "John Doe",
      "role": "owner"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors:**
- `409` - User already exists
- `400` - Validation error

---

### Login

```
POST /auth/login
```

**Request Body:**
```json
{
  "email": "owner@restaurant.com",
  "password": "SecurePass123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "owner@restaurant.com",
      "name": "John Doe",
      "role": "owner",
      "restaurantId": "507f1f77bcf86cd799439012"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errors:**
- `401` - Invalid credentials
- `403` - Account deactivated

---

### Refresh Token

```
POST /auth/refresh-token
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### Logout

```
POST /auth/logout
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Get Profile

```
GET /auth/profile
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "owner@restaurant.com",
    "name": "John Doe",
    "role": "owner",
    "restaurantId": "507f1f77bcf86cd799439012",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "lastLogin": "2024-01-20T14:22:00.000Z"
  }
}
```

---

### Update Profile

```
PUT /auth/profile
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "name": "John Updated",
  "email": "newemail@restaurant.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "email": "newemail@restaurant.com",
    "name": "John Updated",
    "role": "owner"
  }
}
```

---

### Change Password

```
PUT /auth/change-password
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "currentPassword": "OldPass123",
  "newPassword": "NewSecurePass456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## Restaurants

### List All Restaurants

```
GET /restaurants
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20, max: 100) |
| search | string | Search by name |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "restaurants": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Le Petit Bistro",
        "slug": "le-petit-bistro",
        "logo": "https://example.com/logo.png",
        "description": "French cuisine in the heart of Paris",
        "address": {
          "city": "Paris",
          "country": "FR"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

---

### Get Restaurant by ID

```
GET /restaurants/:id
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Le Petit Bistro",
    "slug": "le-petit-bistro",
    "description": "French cuisine in the heart of Paris",
    "logo": "https://example.com/logo.png",
    "coverImage": "https://example.com/cover.jpg",
    "address": {
      "street": "123 Rue de la Paix",
      "city": "Paris",
      "postalCode": "75001",
      "country": "FR"
    },
    "phone": "+33 1 23 45 67 89",
    "email": "contact@lepetitbistro.fr",
    "website": "https://lepetitbistro.fr",
    "openingHours": [
      { "day": "monday", "open": "12:00", "close": "22:00", "isClosed": false },
      { "day": "tuesday", "open": "12:00", "close": "22:00", "isClosed": false },
      { "day": "sunday", "open": "", "close": "", "isClosed": true }
    ],
    "settings": {
      "currency": "EUR",
      "timezone": "Europe/Paris",
      "defaultLanguage": "fr",
      "availableLanguages": ["fr", "en"],
      "orderNotifications": true,
      "autoAcceptOrders": false,
      "tablePrefix": "Table",
      "tableCount": 20
    },
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-20T14:22:00.000Z"
  }
}
```

---

### Get Restaurant by Slug (Public Menu Access)

```
GET /restaurants/slug/:slug
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "name": "Le Petit Bistro",
    "slug": "le-petit-bistro",
    "description": "French cuisine in the heart of Paris",
    "logo": "https://example.com/logo.png",
    "coverImage": "https://example.com/cover.jpg",
    "address": {
      "street": "123 Rue de la Paix",
      "city": "Paris",
      "postalCode": "75001",
      "country": "FR"
    },
    "phone": "+33 1 23 45 67 89",
    "openingHours": [...],
    "settings": {
      "currency": "EUR",
      "defaultLanguage": "fr",
      "availableLanguages": ["fr", "en"],
      "tablePrefix": "Table"
    }
  }
}
```

---

### Create Restaurant

```
POST /restaurants
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "name": "Le Petit Bistro",
  "description": "French cuisine in the heart of Paris",
  "address": {
    "street": "123 Rue de la Paix",
    "city": "Paris",
    "postalCode": "75001",
    "country": "FR"
  },
  "phone": "+33 1 23 45 67 89",
  "email": "contact@lepetitbistro.fr",
  "settings": {
    "currency": "EUR",
    "tableCount": 20
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Restaurant created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Le Petit Bistro",
    "slug": "le-petit-bistro",
    ...
  }
}
```

**Errors:**
- `409` - User already has a restaurant

---

### Get My Restaurant

```
GET /restaurants/me/restaurant
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Le Petit Bistro",
    ...
  }
}
```

---

### Update Restaurant

```
PUT /restaurants/:id
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "name": "Le Grand Bistro",
  "description": "Updated description",
  "settings": {
    "tableCount": 30
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Restaurant updated successfully",
  "data": { ... }
}
```

---

### Delete Restaurant (Soft Delete)

```
DELETE /restaurants/:id
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Restaurant deleted successfully"
}
```

---

## Menu

### Get Full Menu by Restaurant ID

```
GET /restaurants/:id/menu
```

or

```
GET /menu/restaurant/:id
```

Returns the complete menu structure with restaurant info, categories, and all dishes grouped by category.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "restaurant": {
      "id": "507f1f77bcf86cd799439012",
      "name": "Le Petit Bistro",
      "slug": "le-petit-bistro",
      "description": "French cuisine in the heart of Paris",
      "logo": "https://example.com/logo.png",
      "coverImage": "https://example.com/cover.jpg",
      "settings": {
        "currency": "EUR",
        "defaultLanguage": "fr",
        "availableLanguages": ["fr", "en"],
        "tablePrefix": "Table"
      }
    },
    "categories": [
      {
        "id": "507f1f77bcf86cd799439013",
        "name": {
          "fr": "Entrées",
          "en": "Starters"
        },
        "slug": "entrees",
        "description": {
          "fr": "Nos délicieuses entrées"
        },
        "icon": "🥗",
        "dishes": [
          {
            "id": "507f1f77bcf86cd799439016",
            "name": {
              "fr": "Salade César",
              "en": "Caesar Salad"
            },
            "slug": "salade-cesar",
            "description": {
              "fr": "Laitue romaine, parmesan, croûtons"
            },
            "price": 12.50,
            "image": "https://example.com/caesar.jpg",
            "allergens": ["gluten", "dairy"],
            "isVegetarian": true,
            "isVegan": false,
            "isGlutenFree": false,
            "isSpicy": false,
            "isPopular": true,
            "isNewDish": false,
            "preparationTime": 10,
            "options": [
              {
                "name": { "fr": "Poulet grillé" },
                "price": 4.00
              }
            ]
          }
        ]
      },
      {
        "id": "507f1f77bcf86cd799439014",
        "name": {
          "fr": "Plats principaux",
          "en": "Main courses"
        },
        "slug": "plats-principaux",
        "dishes": [...]
      }
    ],
    "totalDishes": 24,
    "totalCategories": 5
  }
}
```

---

### Get Full Menu by Slug

```
GET /menu/slug/:slug
```

Same response structure as above, but includes additional restaurant details like address, phone, and opening hours.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "restaurant": {
      "id": "507f1f77bcf86cd799439012",
      "name": "Le Petit Bistro",
      "slug": "le-petit-bistro",
      "description": "French cuisine in the heart of Paris",
      "logo": "https://example.com/logo.png",
      "coverImage": "https://example.com/cover.jpg",
      "address": {
        "street": "123 Rue de la Paix",
        "city": "Paris",
        "postalCode": "75001",
        "country": "FR"
      },
      "phone": "+33 1 23 45 67 89",
      "openingHours": [...],
      "settings": {
        "currency": "EUR",
        "defaultLanguage": "fr",
        "availableLanguages": ["fr", "en"],
        "tablePrefix": "Table",
        "tableCount": 20
      }
    },
    "categories": [...],
    "totalDishes": 24,
    "totalCategories": 5
  }
}
```

---

## Categories

### Get Categories by Restaurant (Public)

```
GET /categories/restaurant/:restaurantId
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": {
        "fr": "Entrées",
        "en": "Starters"
      },
      "slug": "entrees",
      "description": {
        "fr": "Nos délicieuses entrées",
        "en": "Our delicious starters"
      },
      "icon": "🥗",
      "image": "https://example.com/starters.jpg",
      "order": 0,
      "restaurantId": "507f1f77bcf86cd799439012",
      "isActive": true
    },
    {
      "_id": "507f1f77bcf86cd799439014",
      "name": {
        "fr": "Plats principaux",
        "en": "Main courses"
      },
      "slug": "plats-principaux",
      "order": 1,
      ...
    }
  ]
}
```

---

### Get Category by ID

```
GET /categories/:id
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "name": {
      "fr": "Entrées",
      "en": "Starters"
    },
    ...
  }
}
```

---

### Create Category

```
POST /categories
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "name": {
    "fr": "Desserts",
    "en": "Desserts"
  },
  "description": {
    "fr": "Nos desserts maison",
    "en": "Our homemade desserts"
  },
  "icon": "🍰"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Category created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439015",
    "name": {
      "fr": "Desserts",
      "en": "Desserts"
    },
    "slug": "desserts",
    "order": 3,
    ...
  }
}
```

---

### Get My Categories

```
GET /categories/me/categories
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [...]
}
```

---

### Update Category

```
PUT /categories/:id
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "name": {
    "fr": "Entrées froides",
    "en": "Cold starters"
  },
  "icon": "🥗"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Category updated successfully",
  "data": { ... }
}
```

---

### Delete Category (Soft Delete)

```
DELETE /categories/:id
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

---

### Reorder Categories

```
PUT /categories/reorder
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "categories": [
    { "id": "507f1f77bcf86cd799439013", "order": 0 },
    { "id": "507f1f77bcf86cd799439014", "order": 1 },
    { "id": "507f1f77bcf86cd799439015", "order": 2 }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Categories reordered successfully"
}
```

---

## Dishes

### Get Dishes by Restaurant (Public)

```
GET /dishes/restaurant/:restaurantId
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| categoryId | ObjectId | Filter by category |
| isAvailable | boolean | Filter by availability |
| isVegetarian | boolean | Filter vegetarian dishes |
| isVegan | boolean | Filter vegan dishes |
| search | string | Search in name/description |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439016",
      "name": {
        "fr": "Salade César",
        "en": "Caesar Salad"
      },
      "slug": "salade-cesar",
      "description": {
        "fr": "Laitue romaine, parmesan, croûtons, sauce César maison",
        "en": "Romaine lettuce, parmesan, croutons, homemade Caesar dressing"
      },
      "price": 12.50,
      "image": "https://example.com/caesar.jpg",
      "categoryId": {
        "_id": "507f1f77bcf86cd799439013",
        "name": { "fr": "Entrées", "en": "Starters" },
        "slug": "entrees"
      },
      "allergens": ["gluten", "dairy", "eggs"],
      "tags": ["healthy", "classic"],
      "nutritionalInfo": {
        "calories": 350,
        "protein": 15,
        "carbs": 20,
        "fat": 25
      },
      "options": [
        {
          "name": { "fr": "Poulet grillé", "en": "Grilled chicken" },
          "price": 4.00,
          "isDefault": false
        },
        {
          "name": { "fr": "Crevettes", "en": "Shrimp" },
          "price": 6.00,
          "isDefault": false
        }
      ],
      "isVegetarian": true,
      "isVegan": false,
      "isGlutenFree": false,
      "isSpicy": false,
      "isAvailable": true,
      "isPopular": true,
      "isNewDish": false,
      "preparationTime": 10,
      "order": 0
    }
  ]
}
```

---

### Get Dish by ID

```
GET /dishes/:id
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439016",
    "name": {
      "fr": "Salade César",
      "en": "Caesar Salad"
    },
    ...
  }
}
```

---

### Create Dish

```
POST /dishes
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "name": {
    "fr": "Tarte Tatin",
    "en": "Tarte Tatin"
  },
  "description": {
    "fr": "Tarte aux pommes caramélisées, servie tiède avec glace vanille",
    "en": "Caramelized apple tart, served warm with vanilla ice cream"
  },
  "price": 9.50,
  "categoryId": "507f1f77bcf86cd799439015",
  "allergens": ["gluten", "dairy", "eggs"],
  "isVegetarian": true,
  "preparationTime": 15,
  "options": [
    {
      "name": { "fr": "Supplément chantilly", "en": "Extra whipped cream" },
      "price": 1.50
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Dish created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439017",
    "name": {
      "fr": "Tarte Tatin",
      "en": "Tarte Tatin"
    },
    "slug": "tarte-tatin",
    ...
  }
}
```

---

### Get My Dishes

```
GET /dishes/me/dishes
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| categoryId | ObjectId | Filter by category |
| isAvailable | boolean | Filter by availability |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [...]
}
```

---

### Update Dish

```
PUT /dishes/:id
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "price": 10.50,
  "description": {
    "fr": "Nouvelle description",
    "en": "New description"
  },
  "isPopular": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Dish updated successfully",
  "data": { ... }
}
```

---

### Delete Dish

```
DELETE /dishes/:id
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Dish deleted successfully"
}
```

---

### Toggle Dish Availability

```
PATCH /dishes/:id/availability
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Dish disabled successfully",
  "data": {
    "isAvailable": false
  }
}
```

---

### Reorder Dishes

```
PUT /dishes/reorder
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "dishes": [
    { "id": "507f1f77bcf86cd799439016", "order": 0 },
    { "id": "507f1f77bcf86cd799439017", "order": 1 }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Dishes reordered successfully"
}
```

---

## Orders

### Create Order (Public)

```
POST /orders
```

**Request Body:**
```json
{
  "restaurantId": "507f1f77bcf86cd799439012",
  "tableNumber": "12",
  "customerName": "Marie Dupont",
  "customerPhone": "+33 6 12 34 56 78",
  "items": [
    {
      "dishId": "507f1f77bcf86cd799439016",
      "quantity": 2,
      "options": [
        { "name": "Poulet grillé", "price": 4.00 }
      ],
      "specialInstructions": "Sans croûtons"
    },
    {
      "dishId": "507f1f77bcf86cd799439017",
      "quantity": 1
    }
  ],
  "specialInstructions": "Allergie aux noix"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439018",
    "orderNumber": "20240120-0001",
    "restaurantId": "507f1f77bcf86cd799439012",
    "tableNumber": "12",
    "customerName": "Marie Dupont",
    "customerPhone": "+33 6 12 34 56 78",
    "items": [
      {
        "dishId": "507f1f77bcf86cd799439016",
        "name": "Salade César",
        "price": 12.50,
        "quantity": 2,
        "options": [
          { "name": "Poulet grillé", "price": 4.00 }
        ],
        "specialInstructions": "Sans croûtons",
        "subtotal": 33.00
      },
      {
        "dishId": "507f1f77bcf86cd799439017",
        "name": "Tarte Tatin",
        "price": 9.50,
        "quantity": 1,
        "subtotal": 9.50
      }
    ],
    "subtotal": 42.50,
    "tax": 0,
    "total": 42.50,
    "status": "pending",
    "paymentStatus": "pending",
    "specialInstructions": "Allergie aux noix",
    "createdAt": "2024-01-20T14:30:00.000Z"
  }
}
```

---

### Get Order by ID

```
GET /orders/:id
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439018",
    "orderNumber": "20240120-0001",
    ...
  }
}
```

---

### Get Order by Number

```
GET /orders/number/:orderNumber
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439018",
    "orderNumber": "20240120-0001",
    ...
  }
}
```

---

### List Orders (Restaurant Owner)

```
GET /orders
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status (pending, confirmed, preparing, ready, served, completed, cancelled) |
| tableNumber | string | Filter by table |
| dateFrom | ISO8601 | Start date filter |
| dateTo | ISO8601 | End date filter |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "_id": "507f1f77bcf86cd799439018",
        "orderNumber": "20240120-0001",
        "tableNumber": "12",
        "status": "pending",
        "total": 42.50,
        "createdAt": "2024-01-20T14:30:00.000Z",
        ...
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "pages": 8
    }
  }
}
```

---

### Get Active Orders

```
GET /orders/active
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439018",
      "orderNumber": "20240120-0001",
      "status": "preparing",
      "tableNumber": "12",
      ...
    },
    {
      "_id": "507f1f77bcf86cd799439019",
      "orderNumber": "20240120-0002",
      "status": "pending",
      "tableNumber": "5",
      ...
    }
  ]
}
```

---

### Update Order Status

```
PATCH /orders/:id/status
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request Body:**
```json
{
  "status": "confirmed"
}
```

Or for cancellation:
```json
{
  "status": "cancelled",
  "cancelReason": "Customer request"
}
```

**Valid Status Transitions:**
- `pending` → `confirmed` | `cancelled`
- `confirmed` → `preparing` | `cancelled`
- `preparing` → `ready` | `cancelled`
- `ready` → `served`
- `served` → `completed`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439018",
    "status": "confirmed",
    "confirmedAt": "2024-01-20T14:35:00.000Z",
    ...
  }
}
```

---

### Get Order Statistics

```
GET /orders/stats
```

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| dateFrom | ISO8601 | Start date filter |
| dateTo | ISO8601 | End date filter |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalOrders": 156,
      "totalRevenue": 4523.50,
      "completedOrders": 142,
      "cancelledOrders": 8,
      "averageOrderValue": 29.00
    },
    "statusCounts": {
      "pending": 3,
      "confirmed": 2,
      "preparing": 1,
      "ready": 0,
      "served": 0,
      "completed": 142,
      "cancelled": 8
    }
  }
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": {
    "field": "Specific field error"
  }
}
```

### Common HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate resource) |
| 500 | Internal Server Error |

---

## Rate Limiting

- Window: 15 minutes
- Max requests: 100 per window

When rate limited, you'll receive:
```json
{
  "success": false,
  "message": "Too many requests, please try again later"
}
```

---

## Pagination

All list endpoints support pagination with these query parameters:

| Parameter | Type | Default | Max |
|-----------|------|---------|-----|
| page | number | 1 | - |
| limit | number | 20 | 100 |

Response includes pagination metadata:
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "pages": 8
  }
}
```
