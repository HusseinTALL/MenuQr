/**
 * Permission System Configuration
 *
 * This file defines the comprehensive permission matrix for MenuQR.
 * Permissions follow the format: resource:action
 *
 * Resources: dishes, categories, orders, tables, reservations, reviews, campaigns, loyalty, settings, staff
 * Actions: create, read, update, delete, manage (full CRUD + special actions)
 *
 * Hotel Module Resources: hotel, rooms, guests, hotel_orders, hotel_menus, room_service
 */

// ============================================
// Permission Definitions
// ============================================

export const PERMISSIONS = {
  // Restaurant Management
  RESTAURANT_READ: 'restaurant:read',
  RESTAURANT_UPDATE: 'restaurant:update',
  RESTAURANT_SETTINGS: 'restaurant:settings',

  // Menu Management (Dishes)
  DISHES_READ: 'dishes:read',
  DISHES_CREATE: 'dishes:create',
  DISHES_UPDATE: 'dishes:update',
  DISHES_DELETE: 'dishes:delete',
  DISHES_AVAILABILITY: 'dishes:availability', // Toggle availability only

  // Category Management
  CATEGORIES_READ: 'categories:read',
  CATEGORIES_CREATE: 'categories:create',
  CATEGORIES_UPDATE: 'categories:update',
  CATEGORIES_DELETE: 'categories:delete',

  // Order Management
  ORDERS_READ: 'orders:read',
  ORDERS_CREATE: 'orders:create',
  ORDERS_UPDATE: 'orders:update',
  ORDERS_UPDATE_STATUS: 'orders:update_status', // Change order status
  ORDERS_DELETE: 'orders:delete',
  ORDERS_STATS: 'orders:stats',

  // Table Management
  TABLES_READ: 'tables:read',
  TABLES_CREATE: 'tables:create',
  TABLES_UPDATE: 'tables:update',
  TABLES_DELETE: 'tables:delete',

  // Reservation Management
  RESERVATIONS_READ: 'reservations:read',
  RESERVATIONS_CREATE: 'reservations:create',
  RESERVATIONS_UPDATE: 'reservations:update',
  RESERVATIONS_UPDATE_STATUS: 'reservations:update_status',
  RESERVATIONS_DELETE: 'reservations:delete',
  RESERVATIONS_STATS: 'reservations:stats',

  // Review Management
  REVIEWS_READ: 'reviews:read',
  REVIEWS_MODERATE: 'reviews:moderate', // Approve/reject/respond
  REVIEWS_DELETE: 'reviews:delete',

  // Campaign Management
  CAMPAIGNS_READ: 'campaigns:read',
  CAMPAIGNS_CREATE: 'campaigns:create',
  CAMPAIGNS_UPDATE: 'campaigns:update',
  CAMPAIGNS_DELETE: 'campaigns:delete',
  CAMPAIGNS_SEND: 'campaigns:send',

  // Loyalty Program Management
  LOYALTY_READ: 'loyalty:read',
  LOYALTY_MANAGE: 'loyalty:manage', // Adjust points, bonus

  // Staff Management
  STAFF_READ: 'staff:read',
  STAFF_CREATE: 'staff:create',
  STAFF_UPDATE: 'staff:update',
  STAFF_DELETE: 'staff:delete',

  // Dashboard & Analytics
  DASHBOARD_READ: 'dashboard:read',
  ANALYTICS_READ: 'analytics:read',

  // Kitchen Display System
  KDS_ACCESS: 'kds:access',

  // Billing & Subscription (Owner only)
  BILLING_READ: 'billing:read',
  BILLING_MANAGE: 'billing:manage',

  // Delivery Management
  DELIVERIES_READ: 'deliveries:read',
  DELIVERIES_CREATE: 'deliveries:create',
  DELIVERIES_UPDATE: 'deliveries:update',
  DELIVERIES_ASSIGN: 'deliveries:assign',
  DELIVERIES_CANCEL: 'deliveries:cancel',
  DELIVERIES_STATS: 'deliveries:stats',

  // Delivery Driver Management
  DRIVERS_READ: 'drivers:read',
  DRIVERS_CREATE: 'drivers:create',
  DRIVERS_UPDATE: 'drivers:update',
  DRIVERS_VERIFY: 'drivers:verify',
  DRIVERS_SUSPEND: 'drivers:suspend',
  DRIVERS_DELETE: 'drivers:delete',
  DRIVERS_PAYOUTS: 'drivers:payouts',

  // Driver Self-Service (for delivery drivers)
  DRIVER_SELF_READ: 'driver:self:read',
  DRIVER_SELF_UPDATE: 'driver:self:update',
  DRIVER_SELF_LOCATION: 'driver:self:location',
  DRIVER_SELF_SHIFT: 'driver:self:shift',
  DRIVER_SELF_DELIVERIES: 'driver:self:deliveries',
  DRIVER_SELF_EARNINGS: 'driver:self:earnings',

  // ============================================
  // HOTEL MODULE PERMISSIONS
  // ============================================

  // Hotel Management
  HOTEL_READ: 'hotel:read',
  HOTEL_CREATE: 'hotel:create',
  HOTEL_UPDATE: 'hotel:update',
  HOTEL_DELETE: 'hotel:delete',
  HOTEL_SETTINGS: 'hotel:settings',

  // Room Management
  ROOMS_READ: 'rooms:read',
  ROOMS_CREATE: 'rooms:create',
  ROOMS_UPDATE: 'rooms:update',
  ROOMS_DELETE: 'rooms:delete',
  ROOMS_STATUS: 'rooms:status',           // Update room status (vacant/occupied/maintenance)
  ROOMS_ASSIGN_GUEST: 'rooms:assign_guest', // Assign guest to room
  ROOMS_QR_GENERATE: 'rooms:qr_generate', // Generate QR codes

  // Guest Management
  GUESTS_READ: 'guests:read',
  GUESTS_CREATE: 'guests:create',         // Check-in guest
  GUESTS_UPDATE: 'guests:update',
  GUESTS_DELETE: 'guests:delete',
  GUESTS_CHECKOUT: 'guests:checkout',     // Check-out guest
  GUESTS_TRANSFER: 'guests:transfer',     // Transfer to another room

  // Hotel Orders
  HOTEL_ORDERS_READ: 'hotel_orders:read',
  HOTEL_ORDERS_CREATE: 'hotel_orders:create',
  HOTEL_ORDERS_UPDATE: 'hotel_orders:update',
  HOTEL_ORDERS_UPDATE_STATUS: 'hotel_orders:update_status',
  HOTEL_ORDERS_ASSIGN: 'hotel_orders:assign', // Assign to room service staff
  HOTEL_ORDERS_DELIVER: 'hotel_orders:deliver',
  HOTEL_ORDERS_CANCEL: 'hotel_orders:cancel',
  HOTEL_ORDERS_STATS: 'hotel_orders:stats',

  // Hotel Menus
  HOTEL_MENUS_READ: 'hotel_menus:read',
  HOTEL_MENUS_CREATE: 'hotel_menus:create',
  HOTEL_MENUS_UPDATE: 'hotel_menus:update',
  HOTEL_MENUS_DELETE: 'hotel_menus:delete',
  HOTEL_MENUS_AVAILABILITY: 'hotel_menus:availability',

  // Hotel Categories & Dishes
  HOTEL_CATEGORIES_READ: 'hotel_categories:read',
  HOTEL_CATEGORIES_CREATE: 'hotel_categories:create',
  HOTEL_CATEGORIES_UPDATE: 'hotel_categories:update',
  HOTEL_CATEGORIES_DELETE: 'hotel_categories:delete',

  HOTEL_DISHES_READ: 'hotel_dishes:read',
  HOTEL_DISHES_CREATE: 'hotel_dishes:create',
  HOTEL_DISHES_UPDATE: 'hotel_dishes:update',
  HOTEL_DISHES_DELETE: 'hotel_dishes:delete',
  HOTEL_DISHES_AVAILABILITY: 'hotel_dishes:availability',

  // Room Service Staff Self-Service
  ROOM_SERVICE_ACCESS: 'room_service:access',
  ROOM_SERVICE_DELIVERIES: 'room_service:deliveries',
  ROOM_SERVICE_DELIVER: 'room_service:deliver',
  ROOM_SERVICE_HISTORY: 'room_service:history',

  // Hotel Analytics & Reports
  HOTEL_DASHBOARD_READ: 'hotel_dashboard:read',
  HOTEL_ANALYTICS_READ: 'hotel_analytics:read',
  HOTEL_REPORTS_READ: 'hotel_reports:read',
  HOTEL_REPORTS_EXPORT: 'hotel_reports:export',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// ============================================
// Role Definitions
// ============================================

export const ROLES = {
  // Platform Roles
  SUPERADMIN: 'superadmin',

  // Restaurant Roles
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  KITCHEN: 'kitchen',
  CASHIER: 'cashier',
  STAFF: 'staff',
  DELIVERY_DRIVER: 'delivery_driver',

  // Hotel Roles
  HOTEL_OWNER: 'hotel_owner',
  HOTEL_MANAGER: 'hotel_manager',
  RECEPTION: 'reception',
  ROOM_SERVICE: 'room_service',
  HOTEL_KITCHEN: 'hotel_kitchen',
  CONCIERGE: 'concierge',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// ============================================
// Role Hierarchy (for inheritance)
// ============================================

// Higher roles inherit permissions from lower roles
export const ROLE_HIERARCHY: Record<Role, Role[]> = {
  // Platform
  superadmin: ['owner', 'admin', 'manager', 'kitchen', 'cashier', 'staff', 'hotel_owner', 'hotel_manager', 'reception', 'room_service', 'hotel_kitchen', 'concierge'],

  // Restaurant hierarchy
  owner: ['admin', 'manager', 'kitchen', 'cashier', 'staff'],
  admin: ['manager', 'kitchen', 'cashier', 'staff'],
  manager: ['kitchen', 'cashier', 'staff'],
  kitchen: [],
  cashier: [],
  staff: [],
  delivery_driver: [], // Independent role, no hierarchy inheritance

  // Hotel hierarchy
  hotel_owner: ['hotel_manager', 'reception', 'room_service', 'hotel_kitchen', 'concierge'],
  hotel_manager: ['reception', 'room_service', 'hotel_kitchen', 'concierge'],
  reception: [],
  room_service: [],
  hotel_kitchen: [],
  concierge: [],
};

// ============================================
// Permission Matrix
// ============================================

/**
 * Permission matrix: Maps roles to their permissions
 * Permissions are cumulative with role hierarchy
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  // ========================================
  // SUPERADMIN: Full platform access
  // ========================================
  superadmin: [
    // All permissions (platform-wide)
    ...Object.values(PERMISSIONS),
  ],

  // ========================================
  // OWNER: Full restaurant access + billing
  // ========================================
  owner: [
    // Restaurant
    PERMISSIONS.RESTAURANT_READ,
    PERMISSIONS.RESTAURANT_UPDATE,
    PERMISSIONS.RESTAURANT_SETTINGS,

    // Dishes
    PERMISSIONS.DISHES_READ,
    PERMISSIONS.DISHES_CREATE,
    PERMISSIONS.DISHES_UPDATE,
    PERMISSIONS.DISHES_DELETE,
    PERMISSIONS.DISHES_AVAILABILITY,

    // Categories
    PERMISSIONS.CATEGORIES_READ,
    PERMISSIONS.CATEGORIES_CREATE,
    PERMISSIONS.CATEGORIES_UPDATE,
    PERMISSIONS.CATEGORIES_DELETE,

    // Orders
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.ORDERS_UPDATE_STATUS,
    PERMISSIONS.ORDERS_DELETE,
    PERMISSIONS.ORDERS_STATS,

    // Tables
    PERMISSIONS.TABLES_READ,
    PERMISSIONS.TABLES_CREATE,
    PERMISSIONS.TABLES_UPDATE,
    PERMISSIONS.TABLES_DELETE,

    // Reservations
    PERMISSIONS.RESERVATIONS_READ,
    PERMISSIONS.RESERVATIONS_CREATE,
    PERMISSIONS.RESERVATIONS_UPDATE,
    PERMISSIONS.RESERVATIONS_UPDATE_STATUS,
    PERMISSIONS.RESERVATIONS_DELETE,
    PERMISSIONS.RESERVATIONS_STATS,

    // Reviews
    PERMISSIONS.REVIEWS_READ,
    PERMISSIONS.REVIEWS_MODERATE,
    PERMISSIONS.REVIEWS_DELETE,

    // Campaigns
    PERMISSIONS.CAMPAIGNS_READ,
    PERMISSIONS.CAMPAIGNS_CREATE,
    PERMISSIONS.CAMPAIGNS_UPDATE,
    PERMISSIONS.CAMPAIGNS_DELETE,
    PERMISSIONS.CAMPAIGNS_SEND,

    // Loyalty
    PERMISSIONS.LOYALTY_READ,
    PERMISSIONS.LOYALTY_MANAGE,

    // Staff
    PERMISSIONS.STAFF_READ,
    PERMISSIONS.STAFF_CREATE,
    PERMISSIONS.STAFF_UPDATE,
    PERMISSIONS.STAFF_DELETE,

    // Dashboard & Analytics
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.ANALYTICS_READ,

    // KDS
    PERMISSIONS.KDS_ACCESS,

    // Billing (Owner only)
    PERMISSIONS.BILLING_READ,
    PERMISSIONS.BILLING_MANAGE,

    // Delivery Management
    PERMISSIONS.DELIVERIES_READ,
    PERMISSIONS.DELIVERIES_CREATE,
    PERMISSIONS.DELIVERIES_UPDATE,
    PERMISSIONS.DELIVERIES_ASSIGN,
    PERMISSIONS.DELIVERIES_CANCEL,
    PERMISSIONS.DELIVERIES_STATS,

    // Driver Management
    PERMISSIONS.DRIVERS_READ,
    PERMISSIONS.DRIVERS_CREATE,
    PERMISSIONS.DRIVERS_UPDATE,
    PERMISSIONS.DRIVERS_VERIFY,
    PERMISSIONS.DRIVERS_SUSPEND,
    PERMISSIONS.DRIVERS_DELETE,
    PERMISSIONS.DRIVERS_PAYOUTS,
  ],

  // ========================================
  // ADMIN: Full restaurant access (no billing)
  // ========================================
  admin: [
    // Restaurant (read + update, no settings change)
    PERMISSIONS.RESTAURANT_READ,
    PERMISSIONS.RESTAURANT_UPDATE,

    // Dishes - Full access
    PERMISSIONS.DISHES_READ,
    PERMISSIONS.DISHES_CREATE,
    PERMISSIONS.DISHES_UPDATE,
    PERMISSIONS.DISHES_DELETE,
    PERMISSIONS.DISHES_AVAILABILITY,

    // Categories - Full access
    PERMISSIONS.CATEGORIES_READ,
    PERMISSIONS.CATEGORIES_CREATE,
    PERMISSIONS.CATEGORIES_UPDATE,
    PERMISSIONS.CATEGORIES_DELETE,

    // Orders - Full access
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.ORDERS_UPDATE_STATUS,
    PERMISSIONS.ORDERS_DELETE,
    PERMISSIONS.ORDERS_STATS,

    // Tables - Full access
    PERMISSIONS.TABLES_READ,
    PERMISSIONS.TABLES_CREATE,
    PERMISSIONS.TABLES_UPDATE,
    PERMISSIONS.TABLES_DELETE,

    // Reservations - Full access
    PERMISSIONS.RESERVATIONS_READ,
    PERMISSIONS.RESERVATIONS_CREATE,
    PERMISSIONS.RESERVATIONS_UPDATE,
    PERMISSIONS.RESERVATIONS_UPDATE_STATUS,
    PERMISSIONS.RESERVATIONS_DELETE,
    PERMISSIONS.RESERVATIONS_STATS,

    // Reviews - Full access
    PERMISSIONS.REVIEWS_READ,
    PERMISSIONS.REVIEWS_MODERATE,
    PERMISSIONS.REVIEWS_DELETE,

    // Campaigns - Full access
    PERMISSIONS.CAMPAIGNS_READ,
    PERMISSIONS.CAMPAIGNS_CREATE,
    PERMISSIONS.CAMPAIGNS_UPDATE,
    PERMISSIONS.CAMPAIGNS_DELETE,
    PERMISSIONS.CAMPAIGNS_SEND,

    // Loyalty - Full access
    PERMISSIONS.LOYALTY_READ,
    PERMISSIONS.LOYALTY_MANAGE,

    // Staff - Full access
    PERMISSIONS.STAFF_READ,
    PERMISSIONS.STAFF_CREATE,
    PERMISSIONS.STAFF_UPDATE,
    PERMISSIONS.STAFF_DELETE,

    // Dashboard & Analytics
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.ANALYTICS_READ,

    // KDS
    PERMISSIONS.KDS_ACCESS,

    // Delivery Management
    PERMISSIONS.DELIVERIES_READ,
    PERMISSIONS.DELIVERIES_CREATE,
    PERMISSIONS.DELIVERIES_UPDATE,
    PERMISSIONS.DELIVERIES_ASSIGN,
    PERMISSIONS.DELIVERIES_CANCEL,
    PERMISSIONS.DELIVERIES_STATS,

    // Driver Management (no payouts)
    PERMISSIONS.DRIVERS_READ,
    PERMISSIONS.DRIVERS_CREATE,
    PERMISSIONS.DRIVERS_UPDATE,
    PERMISSIONS.DRIVERS_VERIFY,
    PERMISSIONS.DRIVERS_SUSPEND,
  ],

  // ========================================
  // MANAGER: Day-to-day operations management
  // ========================================
  manager: [
    // Restaurant - Read only
    PERMISSIONS.RESTAURANT_READ,

    // Dishes - Update and availability only
    PERMISSIONS.DISHES_READ,
    PERMISSIONS.DISHES_UPDATE,
    PERMISSIONS.DISHES_AVAILABILITY,

    // Categories - Read only
    PERMISSIONS.CATEGORIES_READ,

    // Orders - Full operational access
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.ORDERS_UPDATE_STATUS,
    PERMISSIONS.ORDERS_STATS,

    // Tables - Read and update only
    PERMISSIONS.TABLES_READ,
    PERMISSIONS.TABLES_UPDATE,

    // Reservations - Full operational access
    PERMISSIONS.RESERVATIONS_READ,
    PERMISSIONS.RESERVATIONS_CREATE,
    PERMISSIONS.RESERVATIONS_UPDATE,
    PERMISSIONS.RESERVATIONS_UPDATE_STATUS,
    PERMISSIONS.RESERVATIONS_STATS,

    // Reviews - Read and moderate
    PERMISSIONS.REVIEWS_READ,
    PERMISSIONS.REVIEWS_MODERATE,

    // Campaigns - Read only
    PERMISSIONS.CAMPAIGNS_READ,

    // Loyalty - Read only
    PERMISSIONS.LOYALTY_READ,

    // Staff - Read only
    PERMISSIONS.STAFF_READ,

    // Dashboard
    PERMISSIONS.DASHBOARD_READ,

    // KDS
    PERMISSIONS.KDS_ACCESS,

    // Delivery Management (operational)
    PERMISSIONS.DELIVERIES_READ,
    PERMISSIONS.DELIVERIES_ASSIGN,
    PERMISSIONS.DELIVERIES_STATS,

    // Driver Management (read only)
    PERMISSIONS.DRIVERS_READ,
  ],

  // ========================================
  // KITCHEN: Kitchen display and order management
  // ========================================
  kitchen: [
    // Restaurant - Read only (for context)
    PERMISSIONS.RESTAURANT_READ,

    // Dishes - Read and availability only
    PERMISSIONS.DISHES_READ,
    PERMISSIONS.DISHES_AVAILABILITY,

    // Categories - Read only
    PERMISSIONS.CATEGORIES_READ,

    // Orders - Read and status update only
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_UPDATE_STATUS,

    // KDS - Primary access
    PERMISSIONS.KDS_ACCESS,
  ],

  // ========================================
  // CASHIER: Order and payment handling
  // ========================================
  cashier: [
    // Restaurant - Read only
    PERMISSIONS.RESTAURANT_READ,

    // Dishes - Read only (for order context)
    PERMISSIONS.DISHES_READ,

    // Categories - Read only
    PERMISSIONS.CATEGORIES_READ,

    // Orders - Create, read, update status
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_CREATE,
    PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.ORDERS_UPDATE_STATUS,

    // Tables - Read only
    PERMISSIONS.TABLES_READ,

    // Reservations - Read and status update
    PERMISSIONS.RESERVATIONS_READ,
    PERMISSIONS.RESERVATIONS_UPDATE_STATUS,

    // Dashboard - Read only
    PERMISSIONS.DASHBOARD_READ,
  ],

  // ========================================
  // STAFF: Basic read access + order status
  // ========================================
  staff: [
    // Restaurant - Read only
    PERMISSIONS.RESTAURANT_READ,

    // Dishes - Read and availability only
    PERMISSIONS.DISHES_READ,
    PERMISSIONS.DISHES_AVAILABILITY,

    // Categories - Read only
    PERMISSIONS.CATEGORIES_READ,

    // Orders - Read and status update only
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_UPDATE_STATUS,

    // Tables - Read only
    PERMISSIONS.TABLES_READ,

    // Reservations - Read only
    PERMISSIONS.RESERVATIONS_READ,
  ],

  // ========================================
  // DELIVERY_DRIVER: Driver self-service access
  // ========================================
  delivery_driver: [
    // Driver Self-Service - Full access to own data
    PERMISSIONS.DRIVER_SELF_READ,
    PERMISSIONS.DRIVER_SELF_UPDATE,
    PERMISSIONS.DRIVER_SELF_LOCATION,
    PERMISSIONS.DRIVER_SELF_SHIFT,
    PERMISSIONS.DRIVER_SELF_DELIVERIES,
    PERMISSIONS.DRIVER_SELF_EARNINGS,

    // Orders - Read assigned orders only (controlled via middleware)
    PERMISSIONS.ORDERS_READ,
  ],

  // ========================================
  // HOTEL_OWNER: Full hotel access + billing
  // ========================================
  hotel_owner: [
    // Hotel Management - Full access
    PERMISSIONS.HOTEL_READ,
    PERMISSIONS.HOTEL_UPDATE,
    PERMISSIONS.HOTEL_SETTINGS,

    // Room Management - Full access
    PERMISSIONS.ROOMS_READ,
    PERMISSIONS.ROOMS_CREATE,
    PERMISSIONS.ROOMS_UPDATE,
    PERMISSIONS.ROOMS_DELETE,
    PERMISSIONS.ROOMS_STATUS,
    PERMISSIONS.ROOMS_ASSIGN_GUEST,
    PERMISSIONS.ROOMS_QR_GENERATE,

    // Guest Management - Full access
    PERMISSIONS.GUESTS_READ,
    PERMISSIONS.GUESTS_CREATE,
    PERMISSIONS.GUESTS_UPDATE,
    PERMISSIONS.GUESTS_DELETE,
    PERMISSIONS.GUESTS_CHECKOUT,
    PERMISSIONS.GUESTS_TRANSFER,

    // Hotel Orders - Full access
    PERMISSIONS.HOTEL_ORDERS_READ,
    PERMISSIONS.HOTEL_ORDERS_CREATE,
    PERMISSIONS.HOTEL_ORDERS_UPDATE,
    PERMISSIONS.HOTEL_ORDERS_UPDATE_STATUS,
    PERMISSIONS.HOTEL_ORDERS_ASSIGN,
    PERMISSIONS.HOTEL_ORDERS_DELIVER,
    PERMISSIONS.HOTEL_ORDERS_CANCEL,
    PERMISSIONS.HOTEL_ORDERS_STATS,

    // Hotel Menus - Full access
    PERMISSIONS.HOTEL_MENUS_READ,
    PERMISSIONS.HOTEL_MENUS_CREATE,
    PERMISSIONS.HOTEL_MENUS_UPDATE,
    PERMISSIONS.HOTEL_MENUS_DELETE,
    PERMISSIONS.HOTEL_MENUS_AVAILABILITY,

    // Hotel Categories & Dishes - Full access
    PERMISSIONS.HOTEL_CATEGORIES_READ,
    PERMISSIONS.HOTEL_CATEGORIES_CREATE,
    PERMISSIONS.HOTEL_CATEGORIES_UPDATE,
    PERMISSIONS.HOTEL_CATEGORIES_DELETE,
    PERMISSIONS.HOTEL_DISHES_READ,
    PERMISSIONS.HOTEL_DISHES_CREATE,
    PERMISSIONS.HOTEL_DISHES_UPDATE,
    PERMISSIONS.HOTEL_DISHES_DELETE,
    PERMISSIONS.HOTEL_DISHES_AVAILABILITY,

    // Analytics & Reports - Full access
    PERMISSIONS.HOTEL_DASHBOARD_READ,
    PERMISSIONS.HOTEL_ANALYTICS_READ,
    PERMISSIONS.HOTEL_REPORTS_READ,
    PERMISSIONS.HOTEL_REPORTS_EXPORT,

    // Staff Management (for hotel staff)
    PERMISSIONS.STAFF_READ,
    PERMISSIONS.STAFF_CREATE,
    PERMISSIONS.STAFF_UPDATE,
    PERMISSIONS.STAFF_DELETE,

    // Billing (Hotel Owner only)
    PERMISSIONS.BILLING_READ,
    PERMISSIONS.BILLING_MANAGE,

    // KDS Access
    PERMISSIONS.KDS_ACCESS,
  ],

  // ========================================
  // HOTEL_MANAGER: Hotel operations (no billing)
  // ========================================
  hotel_manager: [
    // Hotel Management - Read + Update
    PERMISSIONS.HOTEL_READ,
    PERMISSIONS.HOTEL_UPDATE,

    // Room Management - Full access except delete
    PERMISSIONS.ROOMS_READ,
    PERMISSIONS.ROOMS_CREATE,
    PERMISSIONS.ROOMS_UPDATE,
    PERMISSIONS.ROOMS_STATUS,
    PERMISSIONS.ROOMS_ASSIGN_GUEST,
    PERMISSIONS.ROOMS_QR_GENERATE,

    // Guest Management - Full operational access
    PERMISSIONS.GUESTS_READ,
    PERMISSIONS.GUESTS_CREATE,
    PERMISSIONS.GUESTS_UPDATE,
    PERMISSIONS.GUESTS_CHECKOUT,
    PERMISSIONS.GUESTS_TRANSFER,

    // Hotel Orders - Full operational access
    PERMISSIONS.HOTEL_ORDERS_READ,
    PERMISSIONS.HOTEL_ORDERS_CREATE,
    PERMISSIONS.HOTEL_ORDERS_UPDATE,
    PERMISSIONS.HOTEL_ORDERS_UPDATE_STATUS,
    PERMISSIONS.HOTEL_ORDERS_ASSIGN,
    PERMISSIONS.HOTEL_ORDERS_DELIVER,
    PERMISSIONS.HOTEL_ORDERS_CANCEL,
    PERMISSIONS.HOTEL_ORDERS_STATS,

    // Hotel Menus - Full access
    PERMISSIONS.HOTEL_MENUS_READ,
    PERMISSIONS.HOTEL_MENUS_CREATE,
    PERMISSIONS.HOTEL_MENUS_UPDATE,
    PERMISSIONS.HOTEL_MENUS_DELETE,
    PERMISSIONS.HOTEL_MENUS_AVAILABILITY,

    // Hotel Categories & Dishes - Full access
    PERMISSIONS.HOTEL_CATEGORIES_READ,
    PERMISSIONS.HOTEL_CATEGORIES_CREATE,
    PERMISSIONS.HOTEL_CATEGORIES_UPDATE,
    PERMISSIONS.HOTEL_CATEGORIES_DELETE,
    PERMISSIONS.HOTEL_DISHES_READ,
    PERMISSIONS.HOTEL_DISHES_CREATE,
    PERMISSIONS.HOTEL_DISHES_UPDATE,
    PERMISSIONS.HOTEL_DISHES_DELETE,
    PERMISSIONS.HOTEL_DISHES_AVAILABILITY,

    // Analytics & Reports
    PERMISSIONS.HOTEL_DASHBOARD_READ,
    PERMISSIONS.HOTEL_ANALYTICS_READ,
    PERMISSIONS.HOTEL_REPORTS_READ,

    // Staff Management
    PERMISSIONS.STAFF_READ,
    PERMISSIONS.STAFF_CREATE,
    PERMISSIONS.STAFF_UPDATE,

    // KDS Access
    PERMISSIONS.KDS_ACCESS,
  ],

  // ========================================
  // RECEPTION: Guest check-in/out, room status
  // ========================================
  reception: [
    // Hotel - Read only
    PERMISSIONS.HOTEL_READ,

    // Room Management - Read and status update
    PERMISSIONS.ROOMS_READ,
    PERMISSIONS.ROOMS_STATUS,
    PERMISSIONS.ROOMS_ASSIGN_GUEST,

    // Guest Management - Full check-in/out access
    PERMISSIONS.GUESTS_READ,
    PERMISSIONS.GUESTS_CREATE,
    PERMISSIONS.GUESTS_UPDATE,
    PERMISSIONS.GUESTS_CHECKOUT,
    PERMISSIONS.GUESTS_TRANSFER,

    // Hotel Orders - Read and create (for guests at reception)
    PERMISSIONS.HOTEL_ORDERS_READ,
    PERMISSIONS.HOTEL_ORDERS_CREATE,
    PERMISSIONS.HOTEL_ORDERS_CANCEL,

    // Hotel Menus - Read only
    PERMISSIONS.HOTEL_MENUS_READ,
    PERMISSIONS.HOTEL_CATEGORIES_READ,
    PERMISSIONS.HOTEL_DISHES_READ,

    // Dashboard
    PERMISSIONS.HOTEL_DASHBOARD_READ,
  ],

  // ========================================
  // ROOM_SERVICE: Delivery staff
  // ========================================
  room_service: [
    // Hotel - Read only
    PERMISSIONS.HOTEL_READ,

    // Room - Read only (to know where to deliver)
    PERMISSIONS.ROOMS_READ,

    // Guest - Read only
    PERMISSIONS.GUESTS_READ,

    // Hotel Orders - Read and deliver
    PERMISSIONS.HOTEL_ORDERS_READ,
    PERMISSIONS.HOTEL_ORDERS_UPDATE_STATUS,
    PERMISSIONS.HOTEL_ORDERS_DELIVER,

    // Room Service Self-Service
    PERMISSIONS.ROOM_SERVICE_ACCESS,
    PERMISSIONS.ROOM_SERVICE_DELIVERIES,
    PERMISSIONS.ROOM_SERVICE_DELIVER,
    PERMISSIONS.ROOM_SERVICE_HISTORY,

    // Menu - Read only (to answer guest questions)
    PERMISSIONS.HOTEL_MENUS_READ,
    PERMISSIONS.HOTEL_CATEGORIES_READ,
    PERMISSIONS.HOTEL_DISHES_READ,
  ],

  // ========================================
  // HOTEL_KITCHEN: Kitchen staff for hotel
  // ========================================
  hotel_kitchen: [
    // Hotel - Read only
    PERMISSIONS.HOTEL_READ,

    // Hotel Orders - Read and status update
    PERMISSIONS.HOTEL_ORDERS_READ,
    PERMISSIONS.HOTEL_ORDERS_UPDATE_STATUS,

    // Dishes - Read and availability (to mark out of stock)
    PERMISSIONS.HOTEL_MENUS_READ,
    PERMISSIONS.HOTEL_CATEGORIES_READ,
    PERMISSIONS.HOTEL_DISHES_READ,
    PERMISSIONS.HOTEL_DISHES_AVAILABILITY,

    // KDS Access
    PERMISSIONS.KDS_ACCESS,
  ],

  // ========================================
  // CONCIERGE: Read-only guest assistance
  // ========================================
  concierge: [
    // Hotel - Read only
    PERMISSIONS.HOTEL_READ,

    // Rooms - Read only
    PERMISSIONS.ROOMS_READ,

    // Guests - Read only
    PERMISSIONS.GUESTS_READ,

    // Orders - Read only
    PERMISSIONS.HOTEL_ORDERS_READ,

    // Menus - Read only (to help guests)
    PERMISSIONS.HOTEL_MENUS_READ,
    PERMISSIONS.HOTEL_CATEGORIES_READ,
    PERMISSIONS.HOTEL_DISHES_READ,
  ],
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get all permissions for a role (including inherited permissions)
 */
export function getRolePermissions(role: Role): Permission[] {
  const directPermissions = ROLE_PERMISSIONS[role] || [];
  const inheritedRoles = ROLE_HIERARCHY[role] || [];

  const allPermissions = new Set<Permission>(directPermissions);

  for (const inheritedRole of inheritedRoles) {
    const inheritedPermissions = ROLE_PERMISSIONS[inheritedRole] || [];
    for (const perm of inheritedPermissions) {
      allPermissions.add(perm);
    }
  }

  return Array.from(allPermissions);
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: Role, permission: Permission): boolean {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function roleHasAnyPermission(role: Role, permissions: Permission[]): boolean {
  const rolePerms = getRolePermissions(role);
  return permissions.some(perm => rolePerms.includes(perm));
}

/**
 * Check if a role has all of the specified permissions
 */
export function roleHasAllPermissions(role: Role, permissions: Permission[]): boolean {
  const rolePerms = getRolePermissions(role);
  return permissions.every(perm => rolePerms.includes(perm));
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: Role): string {
  const displayNames: Record<Role, string> = {
    // Platform
    superadmin: 'Super Administrateur',

    // Restaurant
    owner: 'Propriétaire',
    admin: 'Administrateur',
    manager: 'Manager',
    kitchen: 'Cuisine',
    cashier: 'Caissier',
    staff: 'Employé',
    delivery_driver: 'Livreur',

    // Hotel
    hotel_owner: 'Propriétaire Hôtel',
    hotel_manager: 'Manager Hôtel',
    reception: 'Réception',
    room_service: 'Room Service',
    hotel_kitchen: 'Cuisine Hôtel',
    concierge: 'Concierge',
  };
  return displayNames[role] || role;
}

/**
 * Get all available roles for restaurant staff assignment (excludes superadmin)
 */
export function getAssignableRoles(): Role[] {
  return [
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.KITCHEN,
    ROLES.CASHIER,
    ROLES.STAFF,
  ];
}

/**
 * Get all available roles for hotel staff assignment
 */
export function getAssignableHotelRoles(): Role[] {
  return [
    ROLES.HOTEL_MANAGER,
    ROLES.RECEPTION,
    ROLES.ROOM_SERVICE,
    ROLES.HOTEL_KITCHEN,
    ROLES.CONCIERGE,
  ];
}

/**
 * Check if a role is a hotel role
 */
export function isHotelRole(role: Role): boolean {
  return ([
    ROLES.HOTEL_OWNER,
    ROLES.HOTEL_MANAGER,
    ROLES.RECEPTION,
    ROLES.ROOM_SERVICE,
    ROLES.HOTEL_KITCHEN,
    ROLES.CONCIERGE,
  ] as Role[]).includes(role);
}

/**
 * Check if a role is a restaurant role
 */
export function isRestaurantRole(role: Role): boolean {
  return ([
    ROLES.OWNER,
    ROLES.ADMIN,
    ROLES.MANAGER,
    ROLES.KITCHEN,
    ROLES.CASHIER,
    ROLES.STAFF,
    ROLES.DELIVERY_DRIVER,
  ] as Role[]).includes(role);
}

/**
 * Validate if a role can be assigned by another role
 * Owners can assign any role except superadmin/owner
 * Admins can assign manager and below
 * Managers cannot assign roles
 * Hotel owners/managers follow similar pattern for hotel roles
 */
export function canAssignRole(assignerRole: Role, targetRole: Role): boolean {
  if (assignerRole === ROLES.SUPERADMIN) {
    return true; // Superadmin can assign any role
  }

  // Restaurant role assignment
  if (assignerRole === ROLES.OWNER) {
    // Owner can assign admin and below (restaurant roles)
    return ([ROLES.ADMIN, ROLES.MANAGER, ROLES.KITCHEN, ROLES.CASHIER, ROLES.STAFF] as Role[]).includes(targetRole);
  }

  if (assignerRole === ROLES.ADMIN) {
    // Admin can assign manager and below
    return ([ROLES.MANAGER, ROLES.KITCHEN, ROLES.CASHIER, ROLES.STAFF] as Role[]).includes(targetRole);
  }

  // Hotel role assignment
  if (assignerRole === ROLES.HOTEL_OWNER) {
    // Hotel owner can assign hotel manager and below
    return ([ROLES.HOTEL_MANAGER, ROLES.RECEPTION, ROLES.ROOM_SERVICE, ROLES.HOTEL_KITCHEN, ROLES.CONCIERGE] as Role[]).includes(targetRole);
  }

  if (assignerRole === ROLES.HOTEL_MANAGER) {
    // Hotel manager can assign reception and below
    return ([ROLES.RECEPTION, ROLES.ROOM_SERVICE, ROLES.HOTEL_KITCHEN, ROLES.CONCIERGE] as Role[]).includes(targetRole);
  }

  // Other roles cannot assign
  return false;
}

// ============================================
// Permission Groups (for UI display)
// ============================================

export const PERMISSION_GROUPS = {
  restaurant: {
    label: 'Restaurant',
    permissions: [
      PERMISSIONS.RESTAURANT_READ,
      PERMISSIONS.RESTAURANT_UPDATE,
      PERMISSIONS.RESTAURANT_SETTINGS,
    ],
  },
  menu: {
    label: 'Menu',
    permissions: [
      PERMISSIONS.DISHES_READ,
      PERMISSIONS.DISHES_CREATE,
      PERMISSIONS.DISHES_UPDATE,
      PERMISSIONS.DISHES_DELETE,
      PERMISSIONS.DISHES_AVAILABILITY,
      PERMISSIONS.CATEGORIES_READ,
      PERMISSIONS.CATEGORIES_CREATE,
      PERMISSIONS.CATEGORIES_UPDATE,
      PERMISSIONS.CATEGORIES_DELETE,
    ],
  },
  orders: {
    label: 'Commandes',
    permissions: [
      PERMISSIONS.ORDERS_READ,
      PERMISSIONS.ORDERS_CREATE,
      PERMISSIONS.ORDERS_UPDATE,
      PERMISSIONS.ORDERS_UPDATE_STATUS,
      PERMISSIONS.ORDERS_DELETE,
      PERMISSIONS.ORDERS_STATS,
      PERMISSIONS.KDS_ACCESS,
    ],
  },
  tables: {
    label: 'Tables',
    permissions: [
      PERMISSIONS.TABLES_READ,
      PERMISSIONS.TABLES_CREATE,
      PERMISSIONS.TABLES_UPDATE,
      PERMISSIONS.TABLES_DELETE,
    ],
  },
  reservations: {
    label: 'Réservations',
    permissions: [
      PERMISSIONS.RESERVATIONS_READ,
      PERMISSIONS.RESERVATIONS_CREATE,
      PERMISSIONS.RESERVATIONS_UPDATE,
      PERMISSIONS.RESERVATIONS_UPDATE_STATUS,
      PERMISSIONS.RESERVATIONS_DELETE,
      PERMISSIONS.RESERVATIONS_STATS,
    ],
  },
  reviews: {
    label: 'Avis',
    permissions: [
      PERMISSIONS.REVIEWS_READ,
      PERMISSIONS.REVIEWS_MODERATE,
      PERMISSIONS.REVIEWS_DELETE,
    ],
  },
  marketing: {
    label: 'Marketing',
    permissions: [
      PERMISSIONS.CAMPAIGNS_READ,
      PERMISSIONS.CAMPAIGNS_CREATE,
      PERMISSIONS.CAMPAIGNS_UPDATE,
      PERMISSIONS.CAMPAIGNS_DELETE,
      PERMISSIONS.CAMPAIGNS_SEND,
      PERMISSIONS.LOYALTY_READ,
      PERMISSIONS.LOYALTY_MANAGE,
    ],
  },
  staff: {
    label: 'Personnel',
    permissions: [
      PERMISSIONS.STAFF_READ,
      PERMISSIONS.STAFF_CREATE,
      PERMISSIONS.STAFF_UPDATE,
      PERMISSIONS.STAFF_DELETE,
    ],
  },
  analytics: {
    label: 'Analyses',
    permissions: [
      PERMISSIONS.DASHBOARD_READ,
      PERMISSIONS.ANALYTICS_READ,
    ],
  },
  billing: {
    label: 'Facturation',
    permissions: [
      PERMISSIONS.BILLING_READ,
      PERMISSIONS.BILLING_MANAGE,
    ],
  },
  delivery: {
    label: 'Livraisons',
    permissions: [
      PERMISSIONS.DELIVERIES_READ,
      PERMISSIONS.DELIVERIES_CREATE,
      PERMISSIONS.DELIVERIES_UPDATE,
      PERMISSIONS.DELIVERIES_ASSIGN,
      PERMISSIONS.DELIVERIES_CANCEL,
      PERMISSIONS.DELIVERIES_STATS,
    ],
  },
  drivers: {
    label: 'Livreurs',
    permissions: [
      PERMISSIONS.DRIVERS_READ,
      PERMISSIONS.DRIVERS_CREATE,
      PERMISSIONS.DRIVERS_UPDATE,
      PERMISSIONS.DRIVERS_VERIFY,
      PERMISSIONS.DRIVERS_SUSPEND,
      PERMISSIONS.DRIVERS_DELETE,
      PERMISSIONS.DRIVERS_PAYOUTS,
    ],
  },
  driverSelf: {
    label: 'Accès Livreur',
    permissions: [
      PERMISSIONS.DRIVER_SELF_READ,
      PERMISSIONS.DRIVER_SELF_UPDATE,
      PERMISSIONS.DRIVER_SELF_LOCATION,
      PERMISSIONS.DRIVER_SELF_SHIFT,
      PERMISSIONS.DRIVER_SELF_DELIVERIES,
      PERMISSIONS.DRIVER_SELF_EARNINGS,
    ],
  },

  // ============================================
  // HOTEL PERMISSION GROUPS
  // ============================================

  hotel: {
    label: 'Hôtel',
    permissions: [
      PERMISSIONS.HOTEL_READ,
      PERMISSIONS.HOTEL_CREATE,
      PERMISSIONS.HOTEL_UPDATE,
      PERMISSIONS.HOTEL_DELETE,
      PERMISSIONS.HOTEL_SETTINGS,
    ],
  },
  rooms: {
    label: 'Chambres',
    permissions: [
      PERMISSIONS.ROOMS_READ,
      PERMISSIONS.ROOMS_CREATE,
      PERMISSIONS.ROOMS_UPDATE,
      PERMISSIONS.ROOMS_DELETE,
      PERMISSIONS.ROOMS_STATUS,
      PERMISSIONS.ROOMS_ASSIGN_GUEST,
      PERMISSIONS.ROOMS_QR_GENERATE,
    ],
  },
  guests: {
    label: 'Clients Hôtel',
    permissions: [
      PERMISSIONS.GUESTS_READ,
      PERMISSIONS.GUESTS_CREATE,
      PERMISSIONS.GUESTS_UPDATE,
      PERMISSIONS.GUESTS_DELETE,
      PERMISSIONS.GUESTS_CHECKOUT,
      PERMISSIONS.GUESTS_TRANSFER,
    ],
  },
  hotelOrders: {
    label: 'Commandes Hôtel',
    permissions: [
      PERMISSIONS.HOTEL_ORDERS_READ,
      PERMISSIONS.HOTEL_ORDERS_CREATE,
      PERMISSIONS.HOTEL_ORDERS_UPDATE,
      PERMISSIONS.HOTEL_ORDERS_UPDATE_STATUS,
      PERMISSIONS.HOTEL_ORDERS_ASSIGN,
      PERMISSIONS.HOTEL_ORDERS_DELIVER,
      PERMISSIONS.HOTEL_ORDERS_CANCEL,
      PERMISSIONS.HOTEL_ORDERS_STATS,
    ],
  },
  hotelMenus: {
    label: 'Menus Hôtel',
    permissions: [
      PERMISSIONS.HOTEL_MENUS_READ,
      PERMISSIONS.HOTEL_MENUS_CREATE,
      PERMISSIONS.HOTEL_MENUS_UPDATE,
      PERMISSIONS.HOTEL_MENUS_DELETE,
      PERMISSIONS.HOTEL_MENUS_AVAILABILITY,
      PERMISSIONS.HOTEL_CATEGORIES_READ,
      PERMISSIONS.HOTEL_CATEGORIES_CREATE,
      PERMISSIONS.HOTEL_CATEGORIES_UPDATE,
      PERMISSIONS.HOTEL_CATEGORIES_DELETE,
      PERMISSIONS.HOTEL_DISHES_READ,
      PERMISSIONS.HOTEL_DISHES_CREATE,
      PERMISSIONS.HOTEL_DISHES_UPDATE,
      PERMISSIONS.HOTEL_DISHES_DELETE,
      PERMISSIONS.HOTEL_DISHES_AVAILABILITY,
    ],
  },
  roomService: {
    label: 'Room Service',
    permissions: [
      PERMISSIONS.ROOM_SERVICE_ACCESS,
      PERMISSIONS.ROOM_SERVICE_DELIVERIES,
      PERMISSIONS.ROOM_SERVICE_DELIVER,
      PERMISSIONS.ROOM_SERVICE_HISTORY,
    ],
  },
  hotelAnalytics: {
    label: 'Analyses Hôtel',
    permissions: [
      PERMISSIONS.HOTEL_DASHBOARD_READ,
      PERMISSIONS.HOTEL_ANALYTICS_READ,
      PERMISSIONS.HOTEL_REPORTS_READ,
      PERMISSIONS.HOTEL_REPORTS_EXPORT,
    ],
  },
};

/**
 * Get permission display name
 */
export function getPermissionDisplayName(permission: Permission): string {
  const displayNames: Record<Permission, string> = {
    [PERMISSIONS.RESTAURANT_READ]: 'Voir les infos du restaurant',
    [PERMISSIONS.RESTAURANT_UPDATE]: 'Modifier les infos du restaurant',
    [PERMISSIONS.RESTAURANT_SETTINGS]: 'Gérer les paramètres',

    [PERMISSIONS.DISHES_READ]: 'Voir les plats',
    [PERMISSIONS.DISHES_CREATE]: 'Créer des plats',
    [PERMISSIONS.DISHES_UPDATE]: 'Modifier les plats',
    [PERMISSIONS.DISHES_DELETE]: 'Supprimer des plats',
    [PERMISSIONS.DISHES_AVAILABILITY]: 'Gérer la disponibilité',

    [PERMISSIONS.CATEGORIES_READ]: 'Voir les catégories',
    [PERMISSIONS.CATEGORIES_CREATE]: 'Créer des catégories',
    [PERMISSIONS.CATEGORIES_UPDATE]: 'Modifier les catégories',
    [PERMISSIONS.CATEGORIES_DELETE]: 'Supprimer des catégories',

    [PERMISSIONS.ORDERS_READ]: 'Voir les commandes',
    [PERMISSIONS.ORDERS_CREATE]: 'Créer des commandes',
    [PERMISSIONS.ORDERS_UPDATE]: 'Modifier les commandes',
    [PERMISSIONS.ORDERS_UPDATE_STATUS]: 'Changer le statut des commandes',
    [PERMISSIONS.ORDERS_DELETE]: 'Supprimer des commandes',
    [PERMISSIONS.ORDERS_STATS]: 'Voir les statistiques des commandes',

    [PERMISSIONS.TABLES_READ]: 'Voir les tables',
    [PERMISSIONS.TABLES_CREATE]: 'Créer des tables',
    [PERMISSIONS.TABLES_UPDATE]: 'Modifier les tables',
    [PERMISSIONS.TABLES_DELETE]: 'Supprimer des tables',

    [PERMISSIONS.RESERVATIONS_READ]: 'Voir les réservations',
    [PERMISSIONS.RESERVATIONS_CREATE]: 'Créer des réservations',
    [PERMISSIONS.RESERVATIONS_UPDATE]: 'Modifier les réservations',
    [PERMISSIONS.RESERVATIONS_UPDATE_STATUS]: 'Changer le statut des réservations',
    [PERMISSIONS.RESERVATIONS_DELETE]: 'Supprimer des réservations',
    [PERMISSIONS.RESERVATIONS_STATS]: 'Voir les statistiques des réservations',

    [PERMISSIONS.REVIEWS_READ]: 'Voir les avis',
    [PERMISSIONS.REVIEWS_MODERATE]: 'Modérer les avis',
    [PERMISSIONS.REVIEWS_DELETE]: 'Supprimer des avis',

    [PERMISSIONS.CAMPAIGNS_READ]: 'Voir les campagnes',
    [PERMISSIONS.CAMPAIGNS_CREATE]: 'Créer des campagnes',
    [PERMISSIONS.CAMPAIGNS_UPDATE]: 'Modifier les campagnes',
    [PERMISSIONS.CAMPAIGNS_DELETE]: 'Supprimer des campagnes',
    [PERMISSIONS.CAMPAIGNS_SEND]: 'Envoyer des campagnes',

    [PERMISSIONS.LOYALTY_READ]: 'Voir le programme fidélité',
    [PERMISSIONS.LOYALTY_MANAGE]: 'Gérer les points fidélité',

    [PERMISSIONS.STAFF_READ]: 'Voir le personnel',
    [PERMISSIONS.STAFF_CREATE]: 'Ajouter du personnel',
    [PERMISSIONS.STAFF_UPDATE]: 'Modifier le personnel',
    [PERMISSIONS.STAFF_DELETE]: 'Supprimer du personnel',

    [PERMISSIONS.DASHBOARD_READ]: 'Voir le tableau de bord',
    [PERMISSIONS.ANALYTICS_READ]: 'Voir les analyses',

    [PERMISSIONS.KDS_ACCESS]: 'Accéder à la cuisine (KDS)',

    [PERMISSIONS.BILLING_READ]: 'Voir la facturation',
    [PERMISSIONS.BILLING_MANAGE]: 'Gérer la facturation',

    // Delivery permissions
    [PERMISSIONS.DELIVERIES_READ]: 'Voir les livraisons',
    [PERMISSIONS.DELIVERIES_CREATE]: 'Créer des livraisons',
    [PERMISSIONS.DELIVERIES_UPDATE]: 'Modifier les livraisons',
    [PERMISSIONS.DELIVERIES_ASSIGN]: 'Assigner des livreurs',
    [PERMISSIONS.DELIVERIES_CANCEL]: 'Annuler des livraisons',
    [PERMISSIONS.DELIVERIES_STATS]: 'Voir les statistiques de livraison',

    // Driver management permissions
    [PERMISSIONS.DRIVERS_READ]: 'Voir les livreurs',
    [PERMISSIONS.DRIVERS_CREATE]: 'Ajouter des livreurs',
    [PERMISSIONS.DRIVERS_UPDATE]: 'Modifier les livreurs',
    [PERMISSIONS.DRIVERS_VERIFY]: 'Vérifier les livreurs',
    [PERMISSIONS.DRIVERS_SUSPEND]: 'Suspendre des livreurs',
    [PERMISSIONS.DRIVERS_DELETE]: 'Supprimer des livreurs',
    [PERMISSIONS.DRIVERS_PAYOUTS]: 'Gérer les paiements livreurs',

    // Driver self-service permissions
    [PERMISSIONS.DRIVER_SELF_READ]: 'Voir son profil livreur',
    [PERMISSIONS.DRIVER_SELF_UPDATE]: 'Modifier son profil livreur',
    [PERMISSIONS.DRIVER_SELF_LOCATION]: 'Mettre à jour sa position',
    [PERMISSIONS.DRIVER_SELF_SHIFT]: 'Gérer ses shifts',
    [PERMISSIONS.DRIVER_SELF_DELIVERIES]: 'Voir ses livraisons',
    [PERMISSIONS.DRIVER_SELF_EARNINGS]: 'Voir ses gains',

    // ============================================
    // HOTEL PERMISSIONS
    // ============================================

    // Hotel management
    [PERMISSIONS.HOTEL_READ]: 'Voir les infos de l\'hôtel',
    [PERMISSIONS.HOTEL_CREATE]: 'Créer un hôtel',
    [PERMISSIONS.HOTEL_UPDATE]: 'Modifier l\'hôtel',
    [PERMISSIONS.HOTEL_DELETE]: 'Supprimer l\'hôtel',
    [PERMISSIONS.HOTEL_SETTINGS]: 'Gérer les paramètres de l\'hôtel',

    // Room management
    [PERMISSIONS.ROOMS_READ]: 'Voir les chambres',
    [PERMISSIONS.ROOMS_CREATE]: 'Créer des chambres',
    [PERMISSIONS.ROOMS_UPDATE]: 'Modifier les chambres',
    [PERMISSIONS.ROOMS_DELETE]: 'Supprimer des chambres',
    [PERMISSIONS.ROOMS_STATUS]: 'Modifier le statut des chambres',
    [PERMISSIONS.ROOMS_ASSIGN_GUEST]: 'Assigner un client à une chambre',
    [PERMISSIONS.ROOMS_QR_GENERATE]: 'Générer les QR codes des chambres',

    // Guest management
    [PERMISSIONS.GUESTS_READ]: 'Voir les clients',
    [PERMISSIONS.GUESTS_CREATE]: 'Enregistrer un client (check-in)',
    [PERMISSIONS.GUESTS_UPDATE]: 'Modifier les infos client',
    [PERMISSIONS.GUESTS_DELETE]: 'Supprimer un client',
    [PERMISSIONS.GUESTS_CHECKOUT]: 'Faire le check-out',
    [PERMISSIONS.GUESTS_TRANSFER]: 'Transférer un client de chambre',

    // Hotel orders
    [PERMISSIONS.HOTEL_ORDERS_READ]: 'Voir les commandes hôtel',
    [PERMISSIONS.HOTEL_ORDERS_CREATE]: 'Créer des commandes hôtel',
    [PERMISSIONS.HOTEL_ORDERS_UPDATE]: 'Modifier les commandes hôtel',
    [PERMISSIONS.HOTEL_ORDERS_UPDATE_STATUS]: 'Changer le statut des commandes',
    [PERMISSIONS.HOTEL_ORDERS_ASSIGN]: 'Assigner au room service',
    [PERMISSIONS.HOTEL_ORDERS_DELIVER]: 'Marquer comme livré',
    [PERMISSIONS.HOTEL_ORDERS_CANCEL]: 'Annuler des commandes',
    [PERMISSIONS.HOTEL_ORDERS_STATS]: 'Voir les statistiques commandes',

    // Hotel menus
    [PERMISSIONS.HOTEL_MENUS_READ]: 'Voir les menus hôtel',
    [PERMISSIONS.HOTEL_MENUS_CREATE]: 'Créer des menus hôtel',
    [PERMISSIONS.HOTEL_MENUS_UPDATE]: 'Modifier les menus hôtel',
    [PERMISSIONS.HOTEL_MENUS_DELETE]: 'Supprimer des menus hôtel',
    [PERMISSIONS.HOTEL_MENUS_AVAILABILITY]: 'Gérer la disponibilité des menus',

    // Hotel categories
    [PERMISSIONS.HOTEL_CATEGORIES_READ]: 'Voir les catégories hôtel',
    [PERMISSIONS.HOTEL_CATEGORIES_CREATE]: 'Créer des catégories hôtel',
    [PERMISSIONS.HOTEL_CATEGORIES_UPDATE]: 'Modifier les catégories hôtel',
    [PERMISSIONS.HOTEL_CATEGORIES_DELETE]: 'Supprimer des catégories hôtel',

    // Hotel dishes
    [PERMISSIONS.HOTEL_DISHES_READ]: 'Voir les plats hôtel',
    [PERMISSIONS.HOTEL_DISHES_CREATE]: 'Créer des plats hôtel',
    [PERMISSIONS.HOTEL_DISHES_UPDATE]: 'Modifier les plats hôtel',
    [PERMISSIONS.HOTEL_DISHES_DELETE]: 'Supprimer des plats hôtel',
    [PERMISSIONS.HOTEL_DISHES_AVAILABILITY]: 'Gérer la disponibilité des plats',

    // Room service
    [PERMISSIONS.ROOM_SERVICE_ACCESS]: 'Accès room service',
    [PERMISSIONS.ROOM_SERVICE_DELIVERIES]: 'Voir ses livraisons room service',
    [PERMISSIONS.ROOM_SERVICE_DELIVER]: 'Effectuer des livraisons',
    [PERMISSIONS.ROOM_SERVICE_HISTORY]: 'Voir l\'historique room service',

    // Hotel analytics
    [PERMISSIONS.HOTEL_DASHBOARD_READ]: 'Voir le tableau de bord hôtel',
    [PERMISSIONS.HOTEL_ANALYTICS_READ]: 'Voir les analyses hôtel',
    [PERMISSIONS.HOTEL_REPORTS_READ]: 'Voir les rapports hôtel',
    [PERMISSIONS.HOTEL_REPORTS_EXPORT]: 'Exporter les rapports hôtel',
  };
  return displayNames[permission] || permission;
}

export default {
  PERMISSIONS,
  ROLES,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  PERMISSION_GROUPS,
  getRolePermissions,
  roleHasPermission,
  roleHasAnyPermission,
  roleHasAllPermissions,
  getRoleDisplayName,
  getPermissionDisplayName,
  getAssignableRoles,
  getAssignableHotelRoles,
  isHotelRole,
  isRestaurantRole,
  canAssignRole,
};
