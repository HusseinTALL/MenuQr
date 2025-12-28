import mongoose, { ClientSession } from 'mongoose';
import { LoyaltyTransaction, type ILoyaltyTransaction } from '../models/LoyaltyTransaction.js';
import { Customer } from '../models/Customer.js';
import { logger } from '../utils/logger.js';

// Cache the transaction support status
let transactionsSupported: boolean | null = null;

// Check if transactions are supported (requires replica set)
const supportsTransactions = async (): Promise<boolean> => {
  // Return cached value if already checked
  if (transactionsSupported !== null) {
    return transactionsSupported;
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    // Actually try to execute a read operation within the transaction
    await Customer.findOne({}).session(session).lean();

    await session.abortTransaction();
    session.endSession();
    transactionsSupported = true;
    logger.info('[Loyalty] MongoDB transactions are supported');
    return true;
  } catch {
    transactionsSupported = false;
    logger.info('[Loyalty] MongoDB transactions not supported (standalone mode), using non-transactional operations');
    return false;
  }
};

// Helper to run with or without transaction based on environment
type TransactionCallback<T> = (session: ClientSession | null) => Promise<T>;

const runWithOptionalTransaction = async <T>(callback: TransactionCallback<T>): Promise<T> => {
  const canUseTransactions = await supportsTransactions();

  if (canUseTransactions) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const result = await callback(session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } else {
    // Run without transaction in development
    return callback(null);
  }
};

// Loyalty Program Configuration
export const LOYALTY_CONFIG = {
  POINTS_PER_FCFA: 1, // 1 FCFA = 1 point
  REDEMPTION_RATE: 2, // 2 points = 1 FCFA (1000 points = 500 FCFA)
  MIN_REDEMPTION: 1000, // Minimum points to redeem
  POINT_EXPIRY_MONTHS: 12, // Points expire after 12 months
  TIERS: {
    bronze: { min: 0, max: 999, discount: 0, name: 'Bronze' },
    argent: { min: 1000, max: 2999, discount: 5, name: 'Argent' },
    or: { min: 3000, max: 9999, discount: 10, name: 'Or' },
    platine: { min: 10000, max: Infinity, discount: 15, name: 'Platine' },
  },
} as const;

export type LoyaltyTier = keyof typeof LOYALTY_CONFIG.TIERS;

export interface CustomerLoyaltyInfo {
  totalPoints: number;
  availablePoints: number; // Excluding expired
  lifetimePoints: number; // Total ever earned
  currentTier: LoyaltyTier;
  tierName: string;
  tierDiscount: number;
  nextTier: { name: string; pointsNeeded: number } | null;
  expiringPoints: { points: number; expiresAt: Date } | null;
}

export interface PaginatedTransactions {
  transactions: ILoyaltyTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Calculate points from order total
export const calculatePointsFromOrder = (orderTotal: number): number => {
  return Math.floor(orderTotal * LOYALTY_CONFIG.POINTS_PER_FCFA);
};

// Determine tier based on total points
export const calculateTier = (totalPoints: number): LoyaltyTier => {
  if (totalPoints >= LOYALTY_CONFIG.TIERS.platine.min) {return 'platine';}
  if (totalPoints >= LOYALTY_CONFIG.TIERS.or.min) {return 'or';}
  if (totalPoints >= LOYALTY_CONFIG.TIERS.argent.min) {return 'argent';}
  return 'bronze';
};

// Get tier discount percentage
export const getTierDiscount = (tier: LoyaltyTier): number => {
  return LOYALTY_CONFIG.TIERS[tier].discount;
};

// Get tier name
export const getTierName = (tier: LoyaltyTier): string => {
  return LOYALTY_CONFIG.TIERS[tier].name;
};

// Get next tier info
export const getNextTierInfo = (
  currentTier: LoyaltyTier,
  currentPoints: number
): { name: string; pointsNeeded: number } | null => {
  const tiers: LoyaltyTier[] = ['bronze', 'argent', 'or', 'platine'];
  const currentIndex = tiers.indexOf(currentTier);

  if (currentIndex >= tiers.length - 1) {
    return null; // Already at highest tier
  }

  const nextTier = tiers[currentIndex + 1];
  const pointsNeeded = LOYALTY_CONFIG.TIERS[nextTier].min - currentPoints;

  return {
    name: LOYALTY_CONFIG.TIERS[nextTier].name,
    pointsNeeded: Math.max(0, pointsNeeded),
  };
};

// Earn points from completed order
export const earnPoints = async (
  customerId: mongoose.Types.ObjectId,
  restaurantId: mongoose.Types.ObjectId | string,
  orderId: mongoose.Types.ObjectId,
  orderTotal: number
): Promise<ILoyaltyTransaction> => {
  return runWithOptionalTransaction(async (session) => {
    const points = calculatePointsFromOrder(orderTotal);

    // Get current customer loyalty data
    const customerQuery = Customer.findById(customerId);
    const customer = session ? await customerQuery.session(session) : await customerQuery;
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Calculate new balance and tier
    const currentPoints = customer.loyalty?.totalPoints || 0;
    const newBalance = currentPoints + points;
    const newTier = calculateTier(newBalance);
    const oldTier = customer.loyalty?.currentTier || 'bronze';

    // Calculate expiration date (12 months from now)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + LOYALTY_CONFIG.POINT_EXPIRY_MONTHS);

    // Create transaction
    const transaction = new LoyaltyTransaction({
      customerId,
      restaurantId,
      orderId,
      type: 'earn',
      points,
      balance: newBalance,
      description: `Points gagnés sur commande`,
      expiresAt,
      metadata: {
        orderTotal,
        tierAtTime: newTier,
      },
    });

    if (session) {
      await transaction.save({ session });
    } else {
      await transaction.save();
    }

    // Update customer loyalty data
    const tierChanged = newTier !== oldTier;
    const updateOptions = session ? { session } : {};
    await Customer.findByIdAndUpdate(
      customerId,
      {
        $set: {
          'loyalty.totalPoints': newBalance,
          'loyalty.currentTier': newTier,
          'loyalty.lastPointsEarnedAt': new Date(),
          ...(tierChanged && { 'loyalty.tierUpdatedAt': new Date() }),
        },
        $inc: {
          'loyalty.lifetimePoints': points,
        },
      },
      updateOptions
    );

    return transaction;
  });
};

// Redeem points for credit (FIFO - oldest points first)
export const redeemPoints = async (
  customerId: mongoose.Types.ObjectId,
  pointsToRedeem: number,
  restaurantId?: mongoose.Types.ObjectId
): Promise<{ transaction: ILoyaltyTransaction; creditValue: number; newBalance: number }> => {
  if (pointsToRedeem < LOYALTY_CONFIG.MIN_REDEMPTION) {
    throw new Error(`Minimum ${LOYALTY_CONFIG.MIN_REDEMPTION} points required for redemption`);
  }

  return runWithOptionalTransaction(async (session) => {
    // Get customer
    const customerQuery = Customer.findById(customerId);
    const customer = session ? await customerQuery.session(session) : await customerQuery;
    if (!customer) {
      throw new Error('Customer not found');
    }

    const availablePoints = customer.loyalty?.totalPoints || 0;
    if (availablePoints < pointsToRedeem) {
      throw new Error('Insufficient points');
    }

    // Calculate credit value
    const creditValue = Math.floor(pointsToRedeem / LOYALTY_CONFIG.REDEMPTION_RATE);
    const newBalance = availablePoints - pointsToRedeem;
    const newTier = calculateTier(newBalance);

    // Create redeem transaction
    const transaction = new LoyaltyTransaction({
      customerId,
      restaurantId: restaurantId || customer.restaurantId,
      type: 'redeem',
      points: -pointsToRedeem,
      balance: newBalance,
      description: `Échange de ${pointsToRedeem} points contre ${creditValue} FCFA`,
      metadata: {
        redemptionValue: creditValue,
        tierAtTime: newTier,
      },
    });

    if (session) {
      await transaction.save({ session });
    } else {
      await transaction.save();
    }

    // Update customer
    const updateOptions = session ? { session } : {};
    await Customer.findByIdAndUpdate(
      customerId,
      {
        $set: {
          'loyalty.totalPoints': newBalance,
          'loyalty.currentTier': newTier,
        },
      },
      updateOptions
    );

    return { transaction, creditValue, newBalance };
  });
};

// Process expired points for a specific restaurant (called by scheduler)
export const processExpiredPoints = async (
  restaurantId?: mongoose.Types.ObjectId | string
): Promise<{ customersProcessed: number; totalPointsExpired: number }> => {
  const now = new Date();
  let totalExpired = 0;
  let customersProcessed = 0;

  // Build match query
  const matchQuery: Record<string, unknown> = {
    type: 'earn',
    expiresAt: { $lte: now },
    points: { $gt: 0 }, // Only positive (not already consumed)
  };
  if (restaurantId) {
    matchQuery.restaurantId = restaurantId;
  }

  // Find all earn transactions that have expired and haven't been processed
  const expiredTransactions = await LoyaltyTransaction.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$customerId',
        transactions: { $push: '$$ROOT' },
        totalExpiring: { $sum: '$points' },
      },
    },
  ]);

  const canUseTransactions = await supportsTransactions();

  for (const group of expiredTransactions) {
    try {
      if (canUseTransactions) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          const customer = await Customer.findById(group._id).session(session);
          if (!customer) {continue;}

          const newBalance = Math.max(0, (customer.loyalty?.totalPoints || 0) - group.totalExpiring);
          const newTier = calculateTier(newBalance);

          const expireTransaction = new LoyaltyTransaction({
            customerId: group._id,
            restaurantId: customer.restaurantId,
            type: 'expire',
            points: -group.totalExpiring,
            balance: newBalance,
            description: `${group.totalExpiring} points expirés`,
            metadata: { tierAtTime: newTier },
          });

          await expireTransaction.save({ session });

          await LoyaltyTransaction.updateMany(
            { _id: { $in: group.transactions.map((t: { _id: mongoose.Types.ObjectId }) => t._id) } },
            { $set: { points: 0 } },
            { session }
          );

          await Customer.findByIdAndUpdate(
            group._id,
            { $set: { 'loyalty.totalPoints': newBalance, 'loyalty.currentTier': newTier } },
            { session }
          );

          await session.commitTransaction();
          totalExpired += group.totalExpiring;
          customersProcessed++;
        } catch (error) {
          await session.abortTransaction();
          throw error;
        } finally {
          session.endSession();
        }
      } else {
        // Non-transactional mode (development)
        const customer = await Customer.findById(group._id);
        if (!customer) {continue;}

        const newBalance = Math.max(0, (customer.loyalty?.totalPoints || 0) - group.totalExpiring);
        const newTier = calculateTier(newBalance);

        const expireTransaction = new LoyaltyTransaction({
          customerId: group._id,
          restaurantId: customer.restaurantId,
          type: 'expire',
          points: -group.totalExpiring,
          balance: newBalance,
          description: `${group.totalExpiring} points expirés`,
          metadata: { tierAtTime: newTier },
        });

        await expireTransaction.save();

        await LoyaltyTransaction.updateMany(
          { _id: { $in: group.transactions.map((t: { _id: mongoose.Types.ObjectId }) => t._id) } },
          { $set: { points: 0 } }
        );

        await Customer.findByIdAndUpdate(group._id, {
          $set: { 'loyalty.totalPoints': newBalance, 'loyalty.currentTier': newTier },
        });

        totalExpired += group.totalExpiring;
        customersProcessed++;
      }
    } catch (error) {
      console.error(`Error processing expired points for customer ${group._id}:`, error);
    }
  }

  return { customersProcessed, totalPointsExpired: totalExpired };
};

// Get customer loyalty info
export const getCustomerLoyalty = async (
  customerId: mongoose.Types.ObjectId
): Promise<CustomerLoyaltyInfo> => {
  const customer = await Customer.findById(customerId);
  if (!customer) {
    throw new Error('Customer not found');
  }

  const totalPoints = customer.loyalty?.totalPoints || 0;
  const lifetimePoints = customer.loyalty?.lifetimePoints || 0;
  const currentTier = (customer.loyalty?.currentTier as LoyaltyTier) || 'bronze';

  // Get points expiring in next 30 days
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const expiringResult = await LoyaltyTransaction.aggregate([
    {
      $match: {
        customerId: customer._id,
        type: 'earn',
        points: { $gt: 0 },
        expiresAt: {
          $lte: thirtyDaysFromNow,
          $gt: new Date(),
        },
      },
    },
    {
      $group: {
        _id: null,
        totalPoints: { $sum: '$points' },
        earliestExpiry: { $min: '$expiresAt' },
      },
    },
  ]);

  const expiringPoints =
    expiringResult.length > 0
      ? {
          points: expiringResult[0].totalPoints,
          expiresAt: expiringResult[0].earliestExpiry,
        }
      : null;

  return {
    totalPoints,
    availablePoints: totalPoints, // For now, same as total (expired are already subtracted)
    lifetimePoints,
    currentTier,
    tierName: getTierName(currentTier),
    tierDiscount: getTierDiscount(currentTier),
    nextTier: getNextTierInfo(currentTier, totalPoints),
    expiringPoints,
  };
};

// Get points history with pagination
export const getPointsHistory = async (
  customerId: mongoose.Types.ObjectId,
  page: number = 1,
  limit: number = 20,
  type?: string
): Promise<PaginatedTransactions> => {
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = { customerId };
  if (type) {
    query.type = type;
  }

  const [transactions, total] = await Promise.all([
    LoyaltyTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    LoyaltyTransaction.countDocuments(query),
  ]);

  return {
    transactions: transactions as ILoyaltyTransaction[],
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

// Get points expiring in next N days
export const getExpiringPoints = async (
  customerId: mongoose.Types.ObjectId,
  days: number = 30
): Promise<{ points: number; expiresAt: Date } | null> => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  const result = await LoyaltyTransaction.aggregate([
    {
      $match: {
        customerId: new mongoose.Types.ObjectId(customerId),
        type: 'earn',
        points: { $gt: 0 },
        expiresAt: {
          $lte: futureDate,
          $gt: new Date(),
        },
      },
    },
    {
      $group: {
        _id: null,
        totalPoints: { $sum: '$points' },
        earliestExpiry: { $min: '$expiresAt' },
      },
    },
  ]);

  if (result.length === 0) {
    return null;
  }

  return {
    points: result[0].totalPoints,
    expiresAt: result[0].earliestExpiry,
  };
};

// Admin: Adjust customer points
export const adjustPoints = async (
  customerId: mongoose.Types.ObjectId,
  restaurantId: mongoose.Types.ObjectId | string,
  points: number,
  reason: string,
  adjustedBy: mongoose.Types.ObjectId
): Promise<{ transaction: ILoyaltyTransaction; newBalance: number; newTier: LoyaltyTier }> => {
  return runWithOptionalTransaction(async (session) => {
    const customerQuery = Customer.findById(customerId);
    const customer = session ? await customerQuery.session(session) : await customerQuery;
    if (!customer) {
      throw new Error('Customer not found');
    }

    const currentPoints = customer.loyalty?.totalPoints || 0;
    const newBalance = Math.max(0, currentPoints + points);
    const newTier = calculateTier(newBalance);

    const transaction = new LoyaltyTransaction({
      customerId,
      restaurantId,
      type: 'adjust',
      points,
      balance: newBalance,
      description: `Ajustement: ${reason}`,
      metadata: {
        adjustedBy,
        reason,
        tierAtTime: newTier,
      },
    });

    if (session) {
      await transaction.save({ session });
    } else {
      await transaction.save();
    }

    const updateOptions = session ? { session } : {};
    const updateObj: Record<string, unknown> = {
      $set: {
        'loyalty.totalPoints': newBalance,
        'loyalty.currentTier': newTier,
      },
    };
    if (points > 0) {
      updateObj.$inc = { 'loyalty.lifetimePoints': points };
    }

    await Customer.findByIdAndUpdate(customerId, updateObj, updateOptions);

    return { transaction, newBalance, newTier };
  });
};

// Admin: Add bonus points
export const addBonusPoints = async (
  customerId: mongoose.Types.ObjectId,
  restaurantId: mongoose.Types.ObjectId | string,
  points: number,
  description: string,
  _adjustedBy?: mongoose.Types.ObjectId
): Promise<{ transaction: ILoyaltyTransaction; newBalance: number; newTier: LoyaltyTier }> => {
  if (points <= 0) {
    throw new Error('Bonus points must be positive');
  }

  return runWithOptionalTransaction(async (session) => {
    const customerQuery = Customer.findById(customerId);
    const customer = session ? await customerQuery.session(session) : await customerQuery;
    if (!customer) {
      throw new Error('Customer not found');
    }

    const currentPoints = customer.loyalty?.totalPoints || 0;
    const newBalance = currentPoints + points;
    const newTier = calculateTier(newBalance);

    // Bonus points also expire after 12 months
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + LOYALTY_CONFIG.POINT_EXPIRY_MONTHS);

    const transaction = new LoyaltyTransaction({
      customerId,
      restaurantId,
      type: 'bonus',
      points,
      balance: newBalance,
      description: `Bonus: ${description}`,
      expiresAt,
      metadata: {
        tierAtTime: newTier,
      },
    });

    if (session) {
      await transaction.save({ session });
    } else {
      await transaction.save();
    }

    const updateOptions = session ? { session } : {};
    await Customer.findByIdAndUpdate(
      customerId,
      {
        $set: {
          'loyalty.totalPoints': newBalance,
          'loyalty.currentTier': newTier,
          'loyalty.lastPointsEarnedAt': new Date(),
        },
        $inc: {
          'loyalty.lifetimePoints': points,
        },
      },
      updateOptions
    );

    return { transaction, newBalance, newTier };
  });
};

// Get restaurant-wide loyalty statistics
export const getLoyaltyStats = async (restaurantId: mongoose.Types.ObjectId | string) => {
  const [tierDistribution, transactionStats, topCustomers] = await Promise.all([
    // Tier distribution
    Customer.aggregate([
      { $match: { restaurantId } },
      {
        $group: {
          _id: '$loyalty.currentTier',
          count: { $sum: 1 },
        },
      },
    ]),

    // Transaction stats
    LoyaltyTransaction.aggregate([
      { $match: { restaurantId } },
      {
        $group: {
          _id: '$type',
          totalPoints: { $sum: { $abs: '$points' } },
          count: { $sum: 1 },
        },
      },
    ]),

    // Top 10 customers by points
    Customer.find({ restaurantId, 'loyalty.totalPoints': { $gt: 0 } })
      .select('name phone loyalty')
      .sort({ 'loyalty.totalPoints': -1 })
      .limit(10)
      .lean(),
  ]);

  // Format tier distribution
  const tiers = { bronze: 0, argent: 0, or: 0, platine: 0 };
  tierDistribution.forEach((t) => {
    if (t._id && t._id in tiers) {
      tiers[t._id as keyof typeof tiers] = t.count;
    }
  });

  // Format transaction stats
  const stats = {
    totalPointsIssued: 0,
    totalPointsRedeemed: 0,
    totalPointsExpired: 0,
    totalBonusPoints: 0,
  };

  transactionStats.forEach((s) => {
    switch (s._id) {
      case 'earn':
        stats.totalPointsIssued = s.totalPoints;
        break;
      case 'redeem':
        stats.totalPointsRedeemed = s.totalPoints;
        break;
      case 'expire':
        stats.totalPointsExpired = s.totalPoints;
        break;
      case 'bonus':
        stats.totalBonusPoints = s.totalPoints;
        break;
    }
  });

  return {
    tierDistribution: tiers,
    totalActiveMembers: Object.values(tiers).reduce((a, b) => a + b, 0),
    ...stats,
    topCustomers,
  };
};

// Get all customers with loyalty info for admin
export const getCustomersLoyalty = async (
  restaurantId: mongoose.Types.ObjectId | string,
  options: {
    tier?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
) => {
  const { tier, search, page = 1, limit = 20, sortBy = 'totalPoints', sortOrder = 'desc' } = options;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = { restaurantId };

  if (tier) {
    query['loyalty.currentTier'] = tier;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  // Build sort field
  const sortFieldMap: Record<string, string> = {
    totalPoints: 'loyalty.totalPoints',
    lifetimePoints: 'loyalty.lifetimePoints',
    lastOrderAt: 'lastOrderAt',
    createdAt: 'createdAt',
  };
  const sortField = sortFieldMap[sortBy] || 'loyalty.totalPoints';
  const sortDirection = sortOrder === 'asc' ? 1 : -1;

  const [customers, total] = await Promise.all([
    Customer.find(query)
      .select('name phone email loyalty totalOrders totalSpent createdAt lastOrderAt')
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(limit)
      .lean(),
    Customer.countDocuments(query),
  ]);

  return {
    customers,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};
