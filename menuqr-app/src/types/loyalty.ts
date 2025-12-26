// Loyalty Program Types

export type LoyaltyTier = 'bronze' | 'argent' | 'or' | 'platine';
export type TransactionType = 'earn' | 'redeem' | 'expire' | 'adjust' | 'bonus';

export interface CustomerLoyaltyInfo {
  totalPoints: number;
  availablePoints: number;
  lifetimePoints: number;
  currentTier: LoyaltyTier;
  tierName: string;
  tierDiscount: number;
  nextTier: {
    name: string;
    pointsNeeded: number;
  } | null;
  expiringPoints: {
    points: number;
    expiresAt: string;
  } | null;
}

export interface LoyaltyTransaction {
  _id: string;
  customerId: string;
  restaurantId: string;
  orderId?: string;
  type: TransactionType;
  points: number;
  balance: number;
  description: string;
  expiresAt?: string;
  metadata?: {
    orderTotal?: number;
    tierAtTime?: string;
    discountApplied?: number;
    redemptionValue?: number;
    adjustedBy?: string;
    reason?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedTransactions {
  transactions: LoyaltyTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ExpiringPoints {
  points: number;
  expiresAt: string;
}

export interface RedeemResult {
  transaction: LoyaltyTransaction;
  creditValue: number;
  newBalance: number;
}

// Admin types
export interface LoyaltyStats {
  tierDistribution: {
    bronze: number;
    argent: number;
    or: number;
    platine: number;
  };
  totalActiveMembers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  totalPointsExpired: number;
  totalBonusPoints: number;
  topCustomers: {
    _id: string;
    name?: string;
    phone: string;
    loyalty: {
      totalPoints: number;
      currentTier: LoyaltyTier;
    };
  }[];
}

export interface CustomerWithLoyalty {
  _id: string;
  name?: string;
  phone: string;
  email?: string;
  loyalty: {
    totalPoints: number;
    lifetimePoints: number;
    currentTier: LoyaltyTier;
    tierUpdatedAt?: string;
    lastPointsEarnedAt?: string;
  };
  totalOrders: number;
  totalSpent: number;
  lastOrderAt?: string;
  createdAt: string;
}

export interface PaginatedCustomers {
  customers: CustomerWithLoyalty[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Tier configuration for display
export const TIER_CONFIG = {
  bronze: {
    name: 'Bronze',
    color: '#CD7F32',
    bgClass: 'bg-amber-700',
    textClass: 'text-amber-700',
    discount: 0,
    minPoints: 0,
  },
  argent: {
    name: 'Argent',
    color: '#C0C0C0',
    bgClass: 'bg-gray-400',
    textClass: 'text-gray-400',
    discount: 5,
    minPoints: 1000,
  },
  or: {
    name: 'Or',
    color: '#FFD700',
    bgClass: 'bg-yellow-500',
    textClass: 'text-yellow-500',
    discount: 10,
    minPoints: 3000,
  },
  platine: {
    name: 'Platine',
    color: '#E5E4E2',
    bgClass: 'bg-slate-300',
    textClass: 'text-slate-500',
    discount: 15,
    minPoints: 10000,
  },
} as const;
