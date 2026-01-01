import { Request, Response } from 'express';
import { Restaurant, User, Order, Customer, Subscription } from '../../models/index.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

/**
 * Get dashboard statistics for Super Admin
 */
export const getDashboardStats = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Get counts
  const [
    totalRestaurants,
    activeRestaurants,
    totalUsers,
    totalCustomers,
    totalOrders,
    monthlyOrders,
    lastMonthOrders,
    newRestaurantsThisMonth,
    newCustomersThisMonth,
  ] = await Promise.all([
    Restaurant.countDocuments(),
    Restaurant.countDocuments({ isActive: true }),
    User.countDocuments(),
    Customer.countDocuments(),
    Order.countDocuments(),
    Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Order.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
    Restaurant.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Customer.countDocuments({ createdAt: { $gte: startOfMonth } }),
  ]);

  // Calculate revenue this month
  const revenueAggregation = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfMonth },
        status: { $in: ['completed', 'paid'] },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$total' },
      },
    },
  ]);

  const lastMonthRevenueAggregation = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
        status: { $in: ['completed', 'paid'] },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$total' },
      },
    },
  ]);

  const monthlyRevenue = revenueAggregation[0]?.total || 0;
  const lastMonthRevenue = lastMonthRevenueAggregation[0]?.total || 0;

  // Calculate growth percentages
  const orderGrowth = lastMonthOrders > 0
    ? ((monthlyOrders - lastMonthOrders) / lastMonthOrders) * 100
    : 0;

  const revenueGrowth = lastMonthRevenue > 0
    ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : 0;

  res.json({
    success: true,
    data: {
      overview: {
        totalRestaurants,
        activeRestaurants,
        inactiveRestaurants: totalRestaurants - activeRestaurants,
        totalUsers,
        totalCustomers,
        totalOrders,
      },
      thisMonth: {
        orders: monthlyOrders,
        revenue: monthlyRevenue,
        newRestaurants: newRestaurantsThisMonth,
        newCustomers: newCustomersThisMonth,
      },
      growth: {
        orders: Math.round(orderGrowth * 100) / 100,
        revenue: Math.round(revenueGrowth * 100) / 100,
      },
    },
  });
});

/**
 * Get recent activity for Super Admin dashboard
 */
export const getRecentActivity = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { limit = 20 } = req.query;

  // Get recent restaurants
  const recentRestaurants = await Restaurant.find()
    .select('name slug isActive createdAt')
    .sort({ createdAt: -1 })
    .limit(5);

  // Get recent orders across all restaurants
  const recentOrders = await Order.find()
    .select('orderNumber status total restaurantId createdAt')
    .populate('restaurantId', 'name slug')
    .sort({ createdAt: -1 })
    .limit(Number(limit));

  // Get recent users
  const recentUsers = await User.find()
    .select('name email role createdAt')
    .sort({ createdAt: -1 })
    .limit(5);

  res.json({
    success: true,
    data: {
      recentRestaurants,
      recentOrders,
      recentUsers,
    },
  });
});

/**
 * Get chart data for orders and revenue over time
 */
export const getChartData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { days = 30 } = req.query;
  const daysCount = Number(days);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysCount);
  startDate.setHours(0, 0, 0, 0);

  // Orders and revenue by day
  const ordersByDay = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        },
        orders: { $sum: 1 },
        revenue: {
          $sum: {
            $cond: [{ $in: ['$status', ['completed', 'paid']] }, '$total', 0],
          },
        },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
  ]);

  // Fill in missing days with zeros
  const chartData: { date: string; orders: number; revenue: number }[] = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayData = ordersByDay.find(
      (d) =>
        d._id.year === date.getFullYear() &&
        d._id.month === date.getMonth() + 1 &&
        d._id.day === date.getDate()
    );

    chartData.push({
      date: dateStr,
      orders: dayData?.orders || 0,
      revenue: dayData?.revenue || 0,
    });
  }

  // Order status distribution
  const orderStatusDistribution = await Order.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  // Top restaurants by orders this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const topRestaurants = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfMonth },
      },
    },
    {
      $group: {
        _id: '$restaurantId',
        orders: { $sum: 1 },
        revenue: { $sum: '$total' },
      },
    },
    { $sort: { orders: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'restaurants',
        localField: '_id',
        foreignField: '_id',
        as: 'restaurant',
      },
    },
    { $unwind: '$restaurant' },
    {
      $project: {
        _id: 1,
        name: '$restaurant.name',
        slug: '$restaurant.slug',
        orders: 1,
        revenue: 1,
      },
    },
  ]);

  // Subscription status distribution
  const subscriptionDistribution = await Subscription.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  // New restaurants over time (last 30 days)
  const restaurantsByDay = await Restaurant.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
  ]);

  // Fill restaurant growth data
  const restaurantGrowth: { date: string; count: number; cumulative: number }[] = [];
  let cumulative = 0;

  // Get total restaurants before the period
  const restaurantsBeforePeriod = await Restaurant.countDocuments({
    createdAt: { $lt: startDate },
  });
  cumulative = restaurantsBeforePeriod;

  for (let i = daysCount - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayData = restaurantsByDay.find(
      (d) =>
        d._id.year === date.getFullYear() &&
        d._id.month === date.getMonth() + 1 &&
        d._id.day === date.getDate()
    );

    cumulative += dayData?.count || 0;
    restaurantGrowth.push({
      date: dateStr,
      count: dayData?.count || 0,
      cumulative,
    });
  }

  res.json({
    success: true,
    data: {
      ordersByDay: chartData,
      orderStatusDistribution,
      topRestaurants,
      subscriptionDistribution,
      restaurantGrowth,
    },
  });
});
