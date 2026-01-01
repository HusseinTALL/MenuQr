import { Request, Response } from 'express';
import { DriverPayout, IDriverPayout } from '../models/DriverPayout.js';
import { DeliveryDriver } from '../models/DeliveryDriver.js';
import { DriverShift } from '../models/DriverShift.js';
import { Delivery } from '../models/Delivery.js';
import mongoose from 'mongoose';

// Helper function to cast payout documents to include methods
const asPayoutWithMethods = (payout: IDriverPayout) => payout as unknown as {
  markAsProcessing: (processedBy?: mongoose.Types.ObjectId) => Promise<IDriverPayout>;
  markAsCompleted: (transactionId: string, transactionReference?: string) => Promise<IDriverPayout>;
  markAsFailed: (reason: string) => Promise<IDriverPayout>;
  addAdjustment: (reason: string, amount: number, addedBy: mongoose.Types.ObjectId, notes?: string) => Promise<IDriverPayout>;
  retry: () => Promise<IDriverPayout>;
  cancel: (reason?: string) => Promise<IDriverPayout>;
};

// ============================================
// Driver Self-Service (Earnings & Payouts)
// ============================================

/**
 * Get driver earnings summary
 * GET /api/driver/earnings
 */
export const getDriverEarnings = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user.driverId;
    const { period = 'week' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case 'day':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get delivery earnings for period
    const deliveryEarnings = await Delivery.aggregate([
      {
        $match: {
          driverId: new mongoose.Types.ObjectId(driverId),
          status: 'delivered',
          deliveredAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalDeliveries: { $sum: 1 },
          baseFees: { $sum: '$earnings.baseFee' },
          distanceBonuses: { $sum: '$earnings.distanceBonus' },
          waitTimeBonuses: { $sum: '$earnings.waitTimeBonus' },
          peakHourBonuses: { $sum: '$earnings.peakHourBonus' },
          tips: { $sum: '$earnings.tip' },
          total: { $sum: '$earnings.total' },
        },
      },
    ]);

    // Get pending payout amount
    const pendingPayouts = await DriverPayout.aggregate([
      {
        $match: {
          driverId: new mongoose.Types.ObjectId(driverId),
          status: 'pending',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$netAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get last payout
    const lastPayout = await DriverPayout.findOne({
      driverId,
      status: 'completed',
    })
      .sort({ processedAt: -1 })
      .select('netAmount processedAt payoutNumber');

    // Get driver's total lifetime earnings
    const driver = await DeliveryDriver.findById(driverId).select('currentBalance lifetimeEarnings stats');

    res.json({
      success: true,
      data: {
        period,
        periodEarnings: deliveryEarnings[0] || {
          totalDeliveries: 0,
          baseFees: 0,
          distanceBonuses: 0,
          waitTimeBonuses: 0,
          peakHourBonuses: 0,
          tips: 0,
          total: 0,
        },
        pendingPayout: pendingPayouts[0] || { total: 0, count: 0 },
        lastPayout: lastPayout || null,
        lifetimeEarnings: {
          totalEarned: driver?.lifetimeEarnings || 0,
          pendingAmount: driver?.currentBalance || 0,
          totalTips: driver?.stats?.totalTips || 0,
        },
      },
    });
  } catch (error) {
    console.error('Get driver earnings error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des gains',
    });
  }
};

/**
 * Get driver earnings breakdown by day
 * GET /api/driver/earnings/daily
 */
export const getDailyEarnings = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user.driverId;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));
    startDate.setHours(0, 0, 0, 0);

    const dailyEarnings = await Delivery.aggregate([
      {
        $match: {
          driverId: new mongoose.Types.ObjectId(driverId),
          status: 'delivered',
          deliveredAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$deliveredAt' } },
          deliveries: { $sum: 1 },
          earnings: { $sum: '$earnings.total' },
          tips: { $sum: '$earnings.tip' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: dailyEarnings,
    });
  } catch (error) {
    console.error('Get daily earnings error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des gains journaliers',
    });
  }
};

/**
 * Get driver payout history
 * GET /api/driver/payouts
 */
export const getDriverPayouts = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user.driverId;
    const { page = 1, limit = 20, status } = req.query;

    const query: Record<string, unknown> = { driverId };
    if (status) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [payouts, total] = await Promise.all([
      DriverPayout.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('-deliveries'), // Exclude large array for list view
      DriverPayout.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: payouts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get driver payouts error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des paiements',
    });
  }
};

/**
 * Get payout details
 * GET /api/driver/payouts/:id
 */
export const getPayoutById = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user.driverId;
    const { id } = req.params;

    const payout = await DriverPayout.findOne({
      _id: id,
      driverId,
    });

    if (!payout) {
      res.status(404).json({
        success: false,
        message: 'Paiement non trouvé',
      });
    }

    res.json({
      success: true,
      data: payout,
    });
  } catch (error) {
    console.error('Get payout by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du paiement',
    });
  }
};

/**
 * Request instant payout
 * POST /api/driver/payouts/instant
 */
export const requestInstantPayout = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user.driverId;
    const { amount } = req.body;

    // Get driver with bank account info
    const driver = await DeliveryDriver.findById(driverId);
    if (!driver) {
      res.status(404).json({
        success: false,
        message: 'Livreur non trouvé',
      });
      return;
    }

    if (!driver.bankAccount?.iban) {
      res.status(400).json({
        success: false,
        message: 'Veuillez configurer vos coordonnées bancaires',
      });
      return;
    }

    // Check available balance
    const availableBalance = driver.currentBalance;
    if (amount > availableBalance) {
      res.status(400).json({
        success: false,
        message: `Solde insuffisant. Disponible: ${availableBalance.toFixed(2)}€`,
      });
      return;
    }

    // Minimum instant payout
    const minimumPayout = 10;
    if (amount < minimumPayout) {
      res.status(400).json({
        success: false,
        message: `Montant minimum pour un paiement instantané: ${minimumPayout}€`,
      });
      return;
    }

    // Create instant payout
    const instantFee = 0.99; // Fixed fee for instant payout
    const payout = new DriverPayout({
      driverId,
      type: 'instant',
      status: 'pending',
      periodStart: new Date(),
      periodEnd: new Date(),
      grossAmount: amount,
      netAmount: amount - instantFee,
      instantPayoutFee: instantFee,
      breakdown: {
        deliveryFees: amount,
        distanceBonuses: 0,
        waitTimeBonuses: 0,
        peakHourBonuses: 0,
        tips: 0,
        incentiveBonuses: 0,
        referralBonuses: 0,
        adjustments: 0,
        deductions: 0,
      },
      bankAccount: {
        accountHolder: driver.bankAccount!.accountHolder,
        iban: driver.bankAccount!.iban,
        bic: driver.bankAccount!.bic,
        bankName: driver.bankAccount?.bankName,
        isVerified: driver.bankAccount?.isVerified || false,
      },
      paymentMethod: 'instant',
    });

    await payout.save();

    // Update driver's balance
    driver.currentBalance -= amount;
    await driver.save();

    res.status(201).json({
      success: true,
      message: 'Demande de paiement instantané créée',
      data: {
        payoutId: payout._id,
        payoutNumber: payout.payoutNumber,
        amount: payout.grossAmount,
        fee: payout.instantPayoutFee,
        netAmount: payout.netAmount,
        status: payout.status,
      },
    });
  } catch (error) {
    console.error('Request instant payout error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la demande de paiement',
    });
  }
};

/**
 * Update bank account details
 * PUT /api/driver/bank-account
 */
export const updateBankAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const driverId = (req as any).user.driverId;
    const { accountHolder, iban, bic, bankName } = req.body;

    const driver = await DeliveryDriver.findById(driverId);
    if (!driver) {
      res.status(404).json({
        success: false,
        message: 'Livreur non trouvé',
      });
      return;
    }

    driver.bankAccount = {
      accountHolder,
      iban,
      bic,
      bankName,
      isVerified: false, // New bank account needs verification
    };

    await driver.save();

    res.json({
      success: true,
      message: 'Coordonnées bancaires mises à jour',
      data: {
        accountHolder: driver.bankAccount.accountHolder,
        iban: `****${driver.bankAccount.iban.slice(-4)}`, // Masked
        bankName: driver.bankAccount.bankName,
      },
    });
  } catch (error) {
    console.error('Update bank account error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des coordonnées bancaires',
    });
  }
};

// ============================================
// Admin Payout Management
// ============================================

/**
 * Get all payouts (admin)
 * GET /api/admin/payouts
 */
export const getAllPayouts = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      driverId,
      status,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const query: Record<string, unknown> = {};

    if (driverId) {
      query.driverId = driverId;
    }
    if (status) {
      query.status = status;
    }
    if (type) {
      query.type = type;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        (query.createdAt as Record<string, Date>).$gte = new Date(startDate as string);
      }
      if (endDate) {
        (query.createdAt as Record<string, Date>).$lte = new Date(endDate as string);
      }
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [payouts, total] = await Promise.all([
      DriverPayout.find(query)
        .populate('driverId', 'firstName lastName email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('-deliveries'),
      DriverPayout.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: payouts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get all payouts error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des paiements',
    });
  }
};

/**
 * Get pending payouts (admin)
 * GET /api/admin/payouts/pending
 */
export const getPendingPayouts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const payouts = await DriverPayout.find({ status: 'pending' })
      .populate('driverId', 'firstName lastName email phone bankAccount')
      .sort({ createdAt: 1 });

    const totalAmount = payouts.reduce((sum, p) => sum + p.netAmount, 0);

    res.json({
      success: true,
      data: payouts,
      summary: {
        count: payouts.length,
        totalAmount,
      },
    });
  } catch (error) {
    console.error('Get pending payouts error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des paiements en attente',
    });
  }
};

/**
 * Process a payout (mark as processing)
 * POST /api/admin/payouts/:id/process
 */
export const processPayout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    const payout = await DriverPayout.findById(id);
    if (!payout) {
      res.status(404).json({
        success: false,
        message: 'Paiement non trouvé',
      });
      return;
    }

    if (payout.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: `Ce paiement ne peut pas être traité (statut: ${payout.status})`,
      });
      return;
    }

    await asPayoutWithMethods(payout).markAsProcessing(userId);

    res.json({
      success: true,
      message: 'Paiement en cours de traitement',
      data: {
        payoutId: payout._id,
        status: payout.status,
      },
    });
  } catch (error) {
    console.error('Process payout error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du traitement du paiement',
    });
  }
};

/**
 * Complete a payout
 * POST /api/admin/payouts/:id/complete
 */
export const completePayout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { transactionId, transactionReference } = req.body;

    const payout = await DriverPayout.findById(id);
    if (!payout) {
      res.status(404).json({
        success: false,
        message: 'Paiement non trouvé',
      });
      return;
    }

    if (!['pending', 'processing'].includes(payout.status)) {
      res.status(400).json({
        success: false,
        message: `Ce paiement ne peut pas être complété (statut: ${payout.status})`,
      });
      return;
    }

    await asPayoutWithMethods(payout).markAsCompleted(transactionId, transactionReference);

    // Update driver's balance (subtract the paid amount)
    const driver = await DeliveryDriver.findById(payout.driverId);
    if (driver) {
      driver.currentBalance = Math.max(0, driver.currentBalance - payout.netAmount);
      await driver.save();
    }

    res.json({
      success: true,
      message: 'Paiement effectué',
      data: {
        payoutId: payout._id,
        status: payout.status,
        processedAt: payout.processedAt,
        transactionId: payout.transactionId,
      },
    });
  } catch (error) {
    console.error('Complete payout error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la finalisation du paiement',
    });
  }
};

/**
 * Mark payout as failed
 * POST /api/admin/payouts/:id/fail
 */
export const failPayout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const payout = await DriverPayout.findById(id);
    if (!payout) {
      res.status(404).json({
        success: false,
        message: 'Paiement non trouvé',
      });
      return;
    }

    await asPayoutWithMethods(payout).markAsFailed(reason);

    // Restore driver's balance if it was an instant payout
    if (payout.type === 'instant') {
      const driver = await DeliveryDriver.findById(payout.driverId);
      if (driver) {
        driver.currentBalance += payout.grossAmount;
        await driver.save();
      }
    }

    res.json({
      success: true,
      message: 'Paiement marqué comme échoué',
      data: {
        payoutId: payout._id,
        status: payout.status,
        failureReason: payout.failureReason,
        retryCount: payout.retryCount,
      },
    });
  } catch (error) {
    console.error('Fail payout error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors du marquage du paiement',
    });
  }
};

/**
 * Retry a failed payout
 * POST /api/admin/payouts/:id/retry
 */
export const retryPayout = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const payout = await DriverPayout.findById(id);
    if (!payout) {
      res.status(404).json({
        success: false,
        message: 'Paiement non trouvé',
      });
      return;
    }

    try {
      await asPayoutWithMethods(payout).retry();
    } catch (err: unknown) {
      res.status(400).json({
        success: false,
        message: err instanceof Error ? err.message : 'Erreur inconnue',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Paiement remis en file d\'attente',
      data: {
        payoutId: payout._id,
        status: payout.status,
      },
    });
  } catch (error) {
    console.error('Retry payout error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la réessai du paiement',
    });
  }
};

/**
 * Add adjustment to a payout
 * POST /api/admin/payouts/:id/adjustment
 */
export const addPayoutAdjustment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason, amount, notes } = req.body;
    const userId = (req as any).user.userId;

    const payout = await DriverPayout.findById(id);
    if (!payout) {
      res.status(404).json({
        success: false,
        message: 'Paiement non trouvé',
      });
      return;
    }

    if (payout.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: 'Seuls les paiements en attente peuvent être ajustés',
      });
      return;
    }

    await asPayoutWithMethods(payout).addAdjustment(reason, amount, userId, notes);

    res.json({
      success: true,
      message: 'Ajustement ajouté',
      data: {
        payoutId: payout._id,
        newGrossAmount: payout.grossAmount,
        newNetAmount: payout.netAmount,
        adjustments: payout.adjustments,
      },
    });
  } catch (error) {
    console.error('Add adjustment error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout de l\'ajustement',
    });
  }
};

/**
 * Generate weekly payouts for all drivers
 * POST /api/admin/payouts/generate-weekly
 */
export const generateWeeklyPayouts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { weekStartDate, weekEndDate } = req.body;

    const periodStart = new Date(weekStartDate);
    const periodEnd = new Date(weekEndDate);

    // Get all verified drivers with completed deliveries in the period
    const driversWithDeliveries = await Delivery.aggregate([
      {
        $match: {
          status: 'delivered',
          deliveredAt: { $gte: periodStart, $lte: periodEnd },
        },
      },
      {
        $group: {
          _id: '$driverId',
          deliveries: {
            $push: {
              deliveryId: '$_id',
              deliveryNumber: '$deliveryNumber',
              completedAt: '$deliveredAt',
              earnings: '$earnings.total',
              tip: '$earnings.tip',
            },
          },
          totalEarnings: { $sum: '$earnings.total' },
        },
      },
    ]);

    const payoutsCreated = [];

    for (const driverData of driversWithDeliveries) {
      // Check if payout already exists for this period
      const existingPayout = await DriverPayout.findOne({
        driverId: driverData._id,
        type: 'weekly',
        periodStart,
        periodEnd,
      });

      if (existingPayout) {
        continue; // Skip if already processed
      }

      // Get driver's bank account
      const driver = await DeliveryDriver.findById(driverData._id);
      if (!driver?.bankAccount?.iban) {
        continue; // Skip if no bank account
      }

      // Get shift IDs for the period
      const shifts = await DriverShift.find({
        driverId: driverData._id,
        startedAt: { $gte: periodStart, $lte: periodEnd },
      }).select('_id');

      // Create weekly payout
      const payout = new DriverPayout({
        driverId: driverData._id,
        type: 'weekly',
        status: 'pending',
        periodStart,
        periodEnd,
        grossAmount: driverData.totalEarnings,
        netAmount: driverData.totalEarnings, // Will be recalculated in pre-save
        breakdown: {
          deliveryFees: driverData.totalEarnings,
          tips: driverData.deliveries.reduce((sum: number, d: any) => sum + (d.tip || 0), 0),
          distanceBonuses: 0,
          waitTimeBonuses: 0,
          peakHourBonuses: 0,
          incentiveBonuses: 0,
          referralBonuses: 0,
          adjustments: 0,
          deductions: 0,
        },
        deliveryCount: driverData.deliveries.length,
        deliveries: driverData.deliveries,
        shiftIds: shifts.map(s => s._id),
        bankAccount: {
          accountHolder: driver.bankAccount.accountHolder,
          iban: driver.bankAccount.iban,
          bic: driver.bankAccount.bic,
          bankName: driver.bankAccount.bankName,
        },
        paymentMethod: 'bank_transfer',
      });

      await payout.save();
      payoutsCreated.push({
        payoutId: payout._id,
        driverId: driver._id,
        driverName: `${driver.firstName} ${driver.lastName}`,
        amount: payout.netAmount,
      });
    }

    res.json({
      success: true,
      message: `${payoutsCreated.length} paiements hebdomadaires générés`,
      data: {
        period: { start: periodStart, end: periodEnd },
        payoutsCreated,
      },
    });
  } catch (error) {
    console.error('Generate weekly payouts error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la génération des paiements',
    });
  }
};

/**
 * Get payout statistics (admin)
 * GET /api/admin/payouts/stats
 */
export const getPayoutStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter: Record<string, unknown> = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        (dateFilter.createdAt as Record<string, Date>).$gte = new Date(startDate as string);
      }
      if (endDate) {
        (dateFilter.createdAt as Record<string, Date>).$lte = new Date(endDate as string);
      }
    }

    const [statusStats, typeStats, monthlyStats] = await Promise.all([
      // By status
      DriverPayout.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$netAmount' },
          },
        },
      ]),

      // By type
      DriverPayout.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            totalAmount: { $sum: '$netAmount' },
          },
        },
      ]),

      // Monthly (last 12 months)
      DriverPayout.aggregate([
        {
          $match: {
            status: 'completed',
            processedAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$processedAt' } },
            count: { $sum: 1 },
            totalPaid: { $sum: '$netAmount' },
            avgPayout: { $avg: '$netAmount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Calculate totals
    const pendingTotal = statusStats.find(s => s._id === 'pending')?.totalAmount || 0;
    const completedTotal = statusStats.find(s => s._id === 'completed')?.totalAmount || 0;

    res.json({
      success: true,
      data: {
        summary: {
          pendingAmount: pendingTotal,
          completedAmount: completedTotal,
          pendingCount: statusStats.find(s => s._id === 'pending')?.count || 0,
        },
        byStatus: statusStats,
        byType: typeStats,
        monthly: monthlyStats,
      },
    });
  } catch (error) {
    console.error('Get payout stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
    });
  }
};

export default {
  // Driver self-service
  getDriverEarnings,
  getDailyEarnings,
  getDriverPayouts,
  getPayoutById,
  requestInstantPayout,
  updateBankAccount,
  // Admin
  getAllPayouts,
  getPendingPayouts,
  processPayout,
  completePayout,
  failPayout,
  retryPayout,
  addPayoutAdjustment,
  generateWeeklyPayouts,
  getPayoutStats,
};
