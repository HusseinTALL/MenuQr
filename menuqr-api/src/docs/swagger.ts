/**
 * Swagger/OpenAPI Configuration
 * Provides interactive API documentation at /api/v1/docs
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Application } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MenuQR API',
      version: '1.0.0',
      description: `
## Overview
MenuQR is a restaurant menu management and ordering system API.

## Authentication
This API uses two types of JWT authentication:

1. **Admin/Staff JWT** (Bearer Token) - For restaurant owners, admins, and staff
2. **Customer JWT** (Bearer Token) - For customers using phone/OTP verification

## Rate Limiting
- General API: 100 requests per 15 minutes
- Auth endpoints: 10 attempts per 15 minutes
- OTP endpoints: 3 requests per minute
- Sensitive operations: 20 requests per minute

## Response Format
All responses follow a consistent format:
\`\`\`json
{
  "success": true|false,
  "message": "Human-readable message",
  "data": { ... },     // Present on success
  "errors": { ... }    // Present on validation errors
}
\`\`\`
      `,
      contact: {
        name: 'MenuQR Support',
        email: 'support@menuqr.com',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
    ],
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Auth', description: 'Admin/Staff authentication' },
      { name: 'Customer Auth', description: 'Customer phone/OTP authentication' },
      { name: 'Restaurants', description: 'Restaurant management' },
      { name: 'Categories', description: 'Menu category management' },
      { name: 'Dishes', description: 'Menu dish management' },
      { name: 'Menu', description: 'Public menu endpoints' },
      { name: 'Orders', description: 'Order management' },
      { name: 'Scheduled Orders', description: 'Pre-scheduled order management' },
      { name: 'Tables', description: 'Table management' },
      { name: 'Reservations', description: 'Reservation management' },
      { name: 'Reviews', description: 'Review management' },
      { name: 'Loyalty', description: 'Loyalty program' },
      { name: 'Campaigns', description: 'Marketing campaigns' },
      { name: 'Upload', description: 'File uploads' },
      { name: 'Customer', description: 'Customer profile and preferences' },
    ],
    components: {
      securitySchemes: {
        AdminAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Admin/Staff JWT token. Obtain via POST /auth/login',
        },
        CustomerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Customer JWT token. Obtain via POST /customer/auth/login',
        },
      },
      schemas: {
        // Common schemas
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
            data: { type: 'object' },
          },
          required: ['success'],
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message' },
            errors: {
              type: 'object',
              additionalProperties: { type: 'string' },
            },
          },
          required: ['success', 'message'],
        },
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
            total: { type: 'integer', example: 100 },
            pages: { type: 'integer', example: 10 },
          },
        },
        MongoId: {
          type: 'string',
          pattern: '^[0-9a-fA-F]{24}$',
          example: '507f1f77bcf86cd799439011',
        },
        RateLimitError: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Too many requests, please try again later.' },
            retryAfter: { type: 'integer', example: 900 },
          },
        },
        // Address schema
        Address: {
          type: 'object',
          properties: {
            street: { type: 'string', example: '123 Rue de Paris' },
            city: { type: 'string', example: 'Paris' },
            postalCode: { type: 'string', example: '75001' },
            country: { type: 'string', example: 'FR', default: 'FR' },
          },
        },
        // User schemas
        AdminUser: {
          type: 'object',
          properties: {
            _id: { $ref: '#/components/schemas/MongoId' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'owner', 'staff', 'superadmin'] },
            restaurantId: { $ref: '#/components/schemas/MongoId' },
            isActive: { type: 'boolean' },
            lastLogin: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Customer: {
          type: 'object',
          properties: {
            _id: { $ref: '#/components/schemas/MongoId' },
            phone: { type: 'string' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            isPhoneVerified: { type: 'boolean' },
            loyalty: {
              type: 'object',
              properties: {
                totalPoints: { type: 'integer' },
                currentTier: { type: 'string', enum: ['bronze', 'argent', 'or', 'platine'] },
              },
            },
            totalOrders: { type: 'integer' },
            totalSpent: { type: 'number' },
          },
        },
        TokenPair: {
          type: 'object',
          properties: {
            accessToken: { type: 'string', description: 'JWT access token' },
            refreshToken: { type: 'string', description: 'JWT refresh token' },
          },
        },
        // Restaurant schema
        Restaurant: {
          type: 'object',
          properties: {
            _id: { $ref: '#/components/schemas/MongoId' },
            name: { type: 'string' },
            slug: { type: 'string' },
            description: { type: 'string' },
            logo: { type: 'string', format: 'uri' },
            coverImage: { type: 'string', format: 'uri' },
            address: { $ref: '#/components/schemas/Address' },
            phone: { type: 'string' },
            email: { type: 'string', format: 'email' },
            website: { type: 'string', format: 'uri' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // Category schema
        Category: {
          type: 'object',
          properties: {
            _id: { $ref: '#/components/schemas/MongoId' },
            name: {
              type: 'object',
              properties: {
                fr: { type: 'string' },
                en: { type: 'string' },
              },
            },
            description: {
              type: 'object',
              properties: {
                fr: { type: 'string' },
                en: { type: 'string' },
              },
            },
            image: { type: 'string' },
            restaurantId: { $ref: '#/components/schemas/MongoId' },
            order: { type: 'integer' },
            isActive: { type: 'boolean' },
          },
        },
        // Dish schema
        Dish: {
          type: 'object',
          properties: {
            _id: { $ref: '#/components/schemas/MongoId' },
            name: {
              type: 'object',
              properties: {
                fr: { type: 'string' },
                en: { type: 'string' },
              },
            },
            description: {
              type: 'object',
              properties: {
                fr: { type: 'string' },
                en: { type: 'string' },
              },
            },
            price: { type: 'number', minimum: 0 },
            image: { type: 'string' },
            categoryId: { $ref: '#/components/schemas/MongoId' },
            restaurantId: { $ref: '#/components/schemas/MongoId' },
            allergens: { type: 'array', items: { type: 'string' } },
            isVegetarian: { type: 'boolean' },
            isVegan: { type: 'boolean' },
            isGlutenFree: { type: 'boolean' },
            isAvailable: { type: 'boolean' },
            preparationTime: { type: 'integer', description: 'Minutes' },
          },
        },
        // Order schemas
        Order: {
          type: 'object',
          properties: {
            _id: { $ref: '#/components/schemas/MongoId' },
            orderNumber: { type: 'string', example: '20231225-0001' },
            restaurantId: { $ref: '#/components/schemas/MongoId' },
            customerId: { $ref: '#/components/schemas/MongoId' },
            tableNumber: { type: 'string' },
            customerName: { type: 'string' },
            customerPhone: { type: 'string' },
            items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
            subtotal: { type: 'number' },
            tax: { type: 'number' },
            total: { type: 'number' },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'],
            },
            paymentStatus: { type: 'string', enum: ['pending', 'paid', 'refunded', 'failed'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        OrderItem: {
          type: 'object',
          properties: {
            dishId: { $ref: '#/components/schemas/MongoId' },
            name: { type: 'string' },
            price: { type: 'number' },
            quantity: { type: 'integer', minimum: 1 },
            options: { type: 'array', items: { type: 'object' } },
            specialInstructions: { type: 'string' },
            subtotal: { type: 'number' },
          },
        },
        CreateOrderInput: {
          type: 'object',
          required: ['restaurantId', 'items'],
          properties: {
            restaurantId: { $ref: '#/components/schemas/MongoId' },
            tableNumber: { type: 'string' },
            customerName: { type: 'string' },
            customerPhone: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['dishId', 'quantity'],
                properties: {
                  dishId: { $ref: '#/components/schemas/MongoId' },
                  quantity: { type: 'integer', minimum: 1 },
                  options: { type: 'array', items: { type: 'string' } },
                  specialInstructions: { type: 'string' },
                },
              },
            },
            specialInstructions: { type: 'string' },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Authentication required or token invalid',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { success: false, message: 'Access denied. No token provided.' },
            },
          },
        },
        Forbidden: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { success: false, message: 'Access denied. Insufficient permissions.' },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { success: false, message: 'Resource not found.' },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                message: 'Validation Error',
                errors: { email: 'Please enter a valid email' },
              },
            },
          },
        },
        TooManyRequests: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RateLimitError' },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Application): void => {
  const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
    explorer: true,
    customSiteTitle: 'MenuQR API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
  };

  // Serve OpenAPI spec as JSON
  app.get('/api/v1/docs/openapi.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Serve Swagger UI
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
};

export default swaggerSpec;
