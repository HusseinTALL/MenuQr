/**
 * Permission System Configuration
 *
 * This file defines the comprehensive permission matrix for MenuQR.
 * Permissions follow the format: resource:action
 *
 * Resources: dishes, categories, orders, tables, reservations, reviews, campaigns, loyalty, settings, staff
 * Actions: create, read, update, delete, manage (full CRUD + special actions)
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
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// ============================================
// Role Definitions
// ============================================

export const ROLES = {
  SUPERADMIN: 'superadmin',
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  KITCHEN: 'kitchen',
  CASHIER: 'cashier',
  STAFF: 'staff',
  DELIVERY_DRIVER: 'delivery_driver',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// ============================================
// Role Hierarchy (for inheritance)
// ============================================

// Higher roles inherit permissions from lower roles
export const ROLE_HIERARCHY: Record<Role, Role[]> = {
  superadmin: ['owner', 'admin', 'manager', 'kitchen', 'cashier', 'staff'],
  owner: ['admin', 'manager', 'kitchen', 'cashier', 'staff'],
  admin: ['manager', 'kitchen', 'cashier', 'staff'],
  manager: ['kitchen', 'cashier', 'staff'],
  kitchen: [],
  cashier: [],
  staff: [],
  delivery_driver: [], // Independent role, no hierarchy inheritance
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
    superadmin: 'Super Administrateur',
    owner: 'Propriétaire',
    admin: 'Administrateur',
    manager: 'Manager',
    kitchen: 'Cuisine',
    cashier: 'Caissier',
    staff: 'Employé',
    delivery_driver: 'Livreur',
  };
  return displayNames[role] || role;
}

/**
 * Get all available roles for staff assignment (excludes superadmin)
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
 * Validate if a role can be assigned by another role
 * Owners can assign any role except superadmin/owner
 * Admins can assign manager and below
 * Managers cannot assign roles
 */
export function canAssignRole(assignerRole: Role, targetRole: Role): boolean {
  if (assignerRole === ROLES.SUPERADMIN) {
    return true; // Superadmin can assign any role
  }

  if (assignerRole === ROLES.OWNER) {
    // Owner can assign admin and below
    return ([ROLES.ADMIN, ROLES.MANAGER, ROLES.KITCHEN, ROLES.CASHIER, ROLES.STAFF] as Role[]).includes(targetRole);
  }

  if (assignerRole === ROLES.ADMIN) {
    // Admin can assign manager and below
    return ([ROLES.MANAGER, ROLES.KITCHEN, ROLES.CASHIER, ROLES.STAFF] as Role[]).includes(targetRole);
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
  canAssignRole,
};
