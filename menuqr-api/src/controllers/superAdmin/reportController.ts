import { Request, Response } from 'express';
import { Types } from 'mongoose';
import {
  Restaurant,
  User,
  Order,
  Subscription,
  Invoice,
  AuditLog,
} from '../../models/index.js';

// Helper to wrap async handlers
type AsyncRequestHandler = (req: Request, res: Response, next?: (err?: unknown) => void) => Promise<unknown>;
const asyncHandler = (fn: AsyncRequestHandler) => (req: Request, res: Response, next: (err?: unknown) => void) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Helper to convert data to CSV
const toCSV = (data: Record<string, unknown>[], columns: { key: string; label: string }[]): string => {
  const header = columns.map(c => `"${c.label}"`).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      const value = row[c.key];
      if (value === null || value === undefined) {return '""';}
      if (typeof value === 'object') {return `"${JSON.stringify(value).replace(/"/g, '""')}"`;}
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [header, ...rows].join('\n');
};

// Helper to format date for filenames
const formatDateForFile = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// ==================== REPORT GENERATION ====================

// Get available report types
export const getReportTypes = asyncHandler(async (_req: Request, res: Response) => {
  const reportTypes = [
    {
      id: 'restaurants',
      name: 'Restaurants',
      description: 'Liste complète des restaurants avec leurs informations',
      formats: ['csv', 'pdf'],
      filters: ['status', 'dateRange', 'subscription'],
    },
    {
      id: 'users',
      name: 'Utilisateurs',
      description: 'Liste des utilisateurs de la plateforme',
      formats: ['csv', 'pdf'],
      filters: ['role', 'status', 'dateRange'],
    },
    {
      id: 'orders',
      name: 'Commandes',
      description: 'Historique des commandes',
      formats: ['csv', 'pdf'],
      filters: ['status', 'dateRange', 'restaurant'],
    },
    {
      id: 'financial',
      name: 'Rapport Financier',
      description: 'Revenus, abonnements et factures',
      formats: ['csv', 'pdf'],
      filters: ['dateRange', 'type'],
    },
    {
      id: 'subscriptions',
      name: 'Abonnements',
      description: 'État des abonnements',
      formats: ['csv', 'pdf'],
      filters: ['status', 'plan', 'dateRange'],
    },
    {
      id: 'invoices',
      name: 'Factures',
      description: 'Liste des factures',
      formats: ['csv', 'pdf'],
      filters: ['status', 'dateRange'],
    },
    {
      id: 'usage',
      name: 'Utilisation',
      description: 'Statistiques d\'utilisation de la plateforme',
      formats: ['csv', 'pdf'],
      filters: ['dateRange', 'metric'],
    },
    {
      id: 'audit',
      name: 'Journal d\'audit',
      description: 'Historique des actions sur la plateforme',
      formats: ['csv'],
      filters: ['action', 'category', 'dateRange'],
    },
  ];

  res.json(reportTypes);
});

// Generate restaurant report
export const generateRestaurantReport = asyncHandler(async (req: Request, res: Response) => {
  const { format = 'csv', status, startDate, endDate } = req.query;

  const query: Record<string, unknown> = {};
  if (status) {query.isActive = status === 'active';}
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {(query.createdAt as Record<string, Date>).$gte = new Date(startDate as string);}
    if (endDate) {(query.createdAt as Record<string, Date>).$lte = new Date(endDate as string);}
  }

  const restaurants = await Restaurant.find(query)
    .populate('ownerId', 'name email')
    .lean();

  const data = restaurants.map(r => ({
    id: r._id.toString(),
    name: r.name,
    slug: r.slug,
    ownerName: r.ownerId ? (r.ownerId as { name?: string }).name || '-' : '-',
    ownerEmail: r.ownerId ? (r.ownerId as { email?: string }).email || '-' : '-',
    contactEmail: r.email || '-',
    contactPhone: r.phone || '-',
    address: r.address ? `${r.address.street}, ${r.address.city}` : '-',
    isActive: r.isActive ? 'Oui' : 'Non',
    createdAt: new Date(r.createdAt).toLocaleDateString('fr-FR'),
  }));

  if (format === 'csv') {
    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Nom' },
      { key: 'slug', label: 'Slug' },
      { key: 'ownerName', label: 'Propriétaire' },
      { key: 'ownerEmail', label: 'Email propriétaire' },
      { key: 'contactEmail', label: 'Email contact' },
      { key: 'contactPhone', label: 'Téléphone' },
      { key: 'address', label: 'Adresse' },
      { key: 'isActive', label: 'Actif' },
      { key: 'createdAt', label: 'Date création' },
    ];

    const csv = toCSV(data, columns);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=restaurants_${formatDateForFile(new Date())}.csv`);
    res.send('\uFEFF' + csv); // BOM for Excel UTF-8
    return;
  }

  // For PDF, return JSON data that frontend will format
  res.json({
    title: 'Rapport des Restaurants',
    generatedAt: new Date().toISOString(),
    totalCount: data.length,
    data,
    summary: {
      total: data.length,
      active: data.filter(d => d.isActive === 'Oui').length,
      inactive: data.filter(d => d.isActive === 'Non').length,
    },
  });
});

// Generate user report
export const generateUserReport = asyncHandler(async (req: Request, res: Response) => {
  const { format = 'csv', role, status, startDate, endDate } = req.query;

  const query: Record<string, unknown> = { role: { $ne: 'superadmin' } };
  if (role) {query.role = role;}
  if (status) {query.isActive = status === 'active';}
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {(query.createdAt as Record<string, Date>).$gte = new Date(startDate as string);}
    if (endDate) {(query.createdAt as Record<string, Date>).$lte = new Date(endDate as string);}
  }

  const users = await User.find(query).lean();

  const data = users.map(u => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive ? 'Oui' : 'Non',
    lastLogin: u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('fr-FR') : '-',
    createdAt: new Date(u.createdAt).toLocaleDateString('fr-FR'),
  }));

  if (format === 'csv') {
    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Nom' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Rôle' },
      { key: 'isActive', label: 'Actif' },
      { key: 'lastLogin', label: 'Dernière connexion' },
      { key: 'createdAt', label: 'Date création' },
    ];

    const csv = toCSV(data, columns);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=utilisateurs_${formatDateForFile(new Date())}.csv`);
    res.send('\uFEFF' + csv);
    return;
  }

  res.json({
    title: 'Rapport des Utilisateurs',
    generatedAt: new Date().toISOString(),
    totalCount: data.length,
    data,
    summary: {
      total: data.length,
      byRole: users.reduce((acc, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      active: data.filter(d => d.isActive === 'Oui').length,
    },
  });
});

// Generate order report
export const generateOrderReport = asyncHandler(async (req: Request, res: Response) => {
  const { format = 'csv', status, startDate, endDate, restaurantId } = req.query;

  const query: Record<string, unknown> = {};
  if (status) {query.status = status;}
  if (restaurantId) {query.restaurantId = new Types.ObjectId(restaurantId as string);}
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {(query.createdAt as Record<string, Date>).$gte = new Date(startDate as string);}
    if (endDate) {(query.createdAt as Record<string, Date>).$lte = new Date(endDate as string);}
  }

  const orders = await Order.find(query)
    .populate('restaurantId', 'name')
    .sort({ createdAt: -1 })
    .limit(10000)
    .lean();

  const data = orders.map(o => ({
    id: o._id.toString(),
    orderNumber: o.orderNumber,
    restaurant: (o.restaurantId as { name?: string })?.name || '-',
    customerName: o.customerName || '-',
    customerPhone: o.customerPhone || '-',
    status: o.status,
    itemCount: o.items?.length || 0,
    subtotal: o.subtotal?.toFixed(2) || '0.00',
    total: o.total?.toFixed(2) || '0.00',
    paymentStatus: o.paymentStatus || '-',
    createdAt: new Date(o.createdAt).toLocaleDateString('fr-FR'),
  }));

  if (format === 'csv') {
    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'orderNumber', label: 'N° Commande' },
      { key: 'restaurant', label: 'Restaurant' },
      { key: 'customerName', label: 'Client' },
      { key: 'customerPhone', label: 'Téléphone' },
      { key: 'status', label: 'Statut' },
      { key: 'itemCount', label: 'Nb articles' },
      { key: 'subtotal', label: 'Sous-total' },
      { key: 'total', label: 'Total' },
      { key: 'paymentStatus', label: 'Paiement' },
      { key: 'createdAt', label: 'Date' },
    ];

    const csv = toCSV(data, columns);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=commandes_${formatDateForFile(new Date())}.csv`);
    res.send('\uFEFF' + csv);
    return;
  }

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

  res.json({
    title: 'Rapport des Commandes',
    generatedAt: new Date().toISOString(),
    totalCount: data.length,
    data,
    summary: {
      total: data.length,
      totalRevenue: totalRevenue.toFixed(2),
      byStatus: orders.reduce((acc, o) => {
        acc[o.status] = (acc[o.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    },
  });
});

// Generate financial report
export const generateFinancialReport = asyncHandler(async (req: Request, res: Response) => {
  const { format = 'csv', startDate, endDate } = req.query;

  const dateQuery: Record<string, Date> = {};
  if (startDate) {dateQuery.$gte = new Date(startDate as string);}
  if (endDate) {dateQuery.$lte = new Date(endDate as string);}

  // Get invoices
  const invoiceQuery: Record<string, unknown> = {};
  if (Object.keys(dateQuery).length) {invoiceQuery.createdAt = dateQuery;}

  const invoices = await Invoice.find(invoiceQuery)
    .populate('restaurantId', 'name')
    .populate('subscriptionId')
    .sort({ createdAt: -1 })
    .lean();

  // Get subscriptions for MRR calculation
  const activeSubscriptions = await Subscription.find({ status: 'active' })
    .populate('planId', 'name pricing')
    .lean();

  // Calculate metrics
  const totalRevenue = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.total, 0);

  const pendingRevenue = invoices
    .filter(i => i.status === 'pending')
    .reduce((sum, i) => sum + i.total, 0);

  const mrr = activeSubscriptions.reduce((sum, s) => {
    const plan = s.planId as { pricing?: { yearly?: number; monthly?: number } };
    if (!plan?.pricing) {return sum;}
    const monthlyPrice = s.billingCycle === 'yearly'
      ? (plan.pricing.yearly || 0) / 12
      : (plan.pricing.monthly || 0);
    return sum + monthlyPrice;
  }, 0);

  if (format === 'csv') {
    const data = invoices.map(i => ({
      id: i._id.toString(),
      invoiceNumber: i.invoiceNumber,
      restaurant: (i.restaurantId as { name?: string })?.name || '-',
      status: i.status,
      subtotal: i.subtotal?.toFixed(2) || '0.00',
      tax: i.taxAmount?.toFixed(2) || '0.00',
      total: i.total?.toFixed(2) || '0.00',
      paidAt: i.paidAt ? new Date(i.paidAt).toLocaleDateString('fr-FR') : '-',
      dueDate: i.dueDate ? new Date(i.dueDate).toLocaleDateString('fr-FR') : '-',
      createdAt: new Date(i.createdAt).toLocaleDateString('fr-FR'),
    }));

    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'invoiceNumber', label: 'N° Facture' },
      { key: 'restaurant', label: 'Restaurant' },
      { key: 'status', label: 'Statut' },
      { key: 'subtotal', label: 'HT' },
      { key: 'tax', label: 'TVA' },
      { key: 'total', label: 'TTC' },
      { key: 'paidAt', label: 'Payé le' },
      { key: 'dueDate', label: 'Échéance' },
      { key: 'createdAt', label: 'Date création' },
    ];

    const csv = toCSV(data, columns);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=rapport_financier_${formatDateForFile(new Date())}.csv`);
    res.send('\uFEFF' + csv);
    return;
  }

  // Monthly revenue breakdown
  const monthlyRevenue = invoices
    .filter(i => i.status === 'paid')
    .reduce((acc, i) => {
      const month = new Date(i.paidAt || i.createdAt).toISOString().slice(0, 7);
      acc[month] = (acc[month] || 0) + i.total;
      return acc;
    }, {} as Record<string, number>);

  res.json({
    title: 'Rapport Financier',
    generatedAt: new Date().toISOString(),
    summary: {
      totalRevenue: totalRevenue.toFixed(2),
      pendingRevenue: pendingRevenue.toFixed(2),
      mrr: mrr.toFixed(2),
      arr: (mrr * 12).toFixed(2),
      totalInvoices: invoices.length,
      paidInvoices: invoices.filter(i => i.status === 'paid').length,
      pendingInvoices: invoices.filter(i => i.status === 'pending').length,
      overdueInvoices: invoices.filter(i => i.status === 'pending' && new Date(i.dueDate) < new Date()).length,
    },
    monthlyRevenue: Object.entries(monthlyRevenue)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, amount]) => ({ month, amount: amount.toFixed(2) })),
    invoices: invoices.slice(0, 100).map(i => ({
      id: i._id.toString(),
      invoiceNumber: i.invoiceNumber,
      restaurant: (i.restaurantId as { name?: string })?.name || '-',
      status: i.status,
      total: i.total?.toFixed(2) || '0.00',
      createdAt: new Date(i.createdAt).toLocaleDateString('fr-FR'),
    })),
  });
});

// Generate subscription report
export const generateSubscriptionReport = asyncHandler(async (req: Request, res: Response) => {
  const { format = 'csv', status, planId, startDate, endDate } = req.query;

  const query: Record<string, unknown> = {};
  if (status) {query.status = status;}
  if (planId) {query.planId = new Types.ObjectId(planId as string);}
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {(query.createdAt as Record<string, Date>).$gte = new Date(startDate as string);}
    if (endDate) {(query.createdAt as Record<string, Date>).$lte = new Date(endDate as string);}
  }

  const subscriptions = await Subscription.find(query)
    .populate('restaurantId', 'name')
    .populate('planId', 'name')
    .sort({ createdAt: -1 })
    .lean();

  const data = subscriptions.map(s => ({
    id: s._id.toString(),
    restaurant: (s.restaurantId as { name?: string })?.name || '-',
    plan: (s.planId as { name?: string })?.name || '-',
    status: s.status,
    billingCycle: s.billingCycle,
    currentPeriodStart: s.currentPeriodStart ? new Date(s.currentPeriodStart).toLocaleDateString('fr-FR') : '-',
    currentPeriodEnd: s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString('fr-FR') : '-',
    createdAt: new Date(s.createdAt).toLocaleDateString('fr-FR'),
  }));

  if (format === 'csv') {
    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'restaurant', label: 'Restaurant' },
      { key: 'plan', label: 'Plan' },
      { key: 'status', label: 'Statut' },
      { key: 'billingCycle', label: 'Cycle' },
      { key: 'currentPeriodStart', label: 'Début période' },
      { key: 'currentPeriodEnd', label: 'Fin période' },
      { key: 'createdAt', label: 'Date création' },
    ];

    const csv = toCSV(data, columns);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=abonnements_${formatDateForFile(new Date())}.csv`);
    res.send('\uFEFF' + csv);
    return;
  }

  res.json({
    title: 'Rapport des Abonnements',
    generatedAt: new Date().toISOString(),
    totalCount: data.length,
    data,
    summary: {
      total: data.length,
      byStatus: subscriptions.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byPlan: subscriptions.reduce((acc, s) => {
        const planName = (s.planId as { name?: string })?.name || 'Unknown';
        acc[planName] = (acc[planName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    },
  });
});

// Generate invoice report
export const generateInvoiceReport = asyncHandler(async (req: Request, res: Response) => {
  const { format = 'csv', status, startDate, endDate } = req.query;

  const query: Record<string, unknown> = {};
  if (status) {query.status = status;}
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {(query.createdAt as Record<string, Date>).$gte = new Date(startDate as string);}
    if (endDate) {(query.createdAt as Record<string, Date>).$lte = new Date(endDate as string);}
  }

  const invoices = await Invoice.find(query)
    .populate('restaurantId', 'name')
    .sort({ createdAt: -1 })
    .lean();

  const data = invoices.map(i => ({
    id: i._id.toString(),
    invoiceNumber: i.invoiceNumber,
    restaurant: (i.restaurantId as { name?: string })?.name || '-',
    status: i.status,
    subtotal: i.subtotal?.toFixed(2) || '0.00',
    tax: i.taxAmount?.toFixed(2) || '0.00',
    total: i.total?.toFixed(2) || '0.00',
    currency: i.currency || 'EUR',
    paidAt: i.paidAt ? new Date(i.paidAt).toLocaleDateString('fr-FR') : '-',
    dueDate: i.dueDate ? new Date(i.dueDate).toLocaleDateString('fr-FR') : '-',
    createdAt: new Date(i.createdAt).toLocaleDateString('fr-FR'),
  }));

  if (format === 'csv') {
    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'invoiceNumber', label: 'N° Facture' },
      { key: 'restaurant', label: 'Restaurant' },
      { key: 'status', label: 'Statut' },
      { key: 'subtotal', label: 'HT' },
      { key: 'tax', label: 'TVA' },
      { key: 'total', label: 'TTC' },
      { key: 'currency', label: 'Devise' },
      { key: 'paidAt', label: 'Payé le' },
      { key: 'dueDate', label: 'Échéance' },
      { key: 'createdAt', label: 'Date création' },
    ];

    const csv = toCSV(data, columns);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=factures_${formatDateForFile(new Date())}.csv`);
    res.send('\uFEFF' + csv);
    return;
  }

  res.json({
    title: 'Rapport des Factures',
    generatedAt: new Date().toISOString(),
    totalCount: data.length,
    data,
    summary: {
      total: data.length,
      totalAmount: invoices.reduce((sum, i) => sum + (i.total || 0), 0).toFixed(2),
      byStatus: invoices.reduce((acc, i) => {
        acc[i.status] = (acc[i.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    },
  });
});

// Generate usage report
export const generateUsageReport = asyncHandler(async (req: Request, res: Response) => {
  const { format = 'csv', startDate, endDate } = req.query;

  const dateQuery: Record<string, Date> = {};
  if (startDate) {dateQuery.$gte = new Date(startDate as string);}
  if (endDate) {dateQuery.$lte = new Date(endDate as string);}

  // Get various usage metrics
  const [
    totalRestaurants,
    activeRestaurants,
    totalUsers,
    totalOrders,
    recentOrders,
    ordersByDay,
  ] = await Promise.all([
    Restaurant.countDocuments(),
    Restaurant.countDocuments({ isActive: true }),
    User.countDocuments({ role: { $ne: 'superadmin' } }),
    Order.countDocuments(Object.keys(dateQuery).length ? { createdAt: dateQuery } : {}),
    Order.find(Object.keys(dateQuery).length ? { createdAt: dateQuery } : {})
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean(),
    Order.aggregate([
      ...(Object.keys(dateQuery).length ? [{ $match: { createdAt: dateQuery } }] : []),
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const totalRevenue = recentOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  if (format === 'csv') {
    const data = ordersByDay.map(d => ({
      date: d._id,
      orders: d.count,
      revenue: d.revenue?.toFixed(2) || '0.00',
    }));

    const columns = [
      { key: 'date', label: 'Date' },
      { key: 'orders', label: 'Commandes' },
      { key: 'revenue', label: 'Revenus' },
    ];

    const csv = toCSV(data, columns);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=utilisation_${formatDateForFile(new Date())}.csv`);
    res.send('\uFEFF' + csv);
    return;
  }

  res.json({
    title: 'Rapport d\'Utilisation',
    generatedAt: new Date().toISOString(),
    summary: {
      totalRestaurants,
      activeRestaurants,
      totalUsers,
      totalOrders,
      totalRevenue: totalRevenue.toFixed(2),
      avgOrderValue: avgOrderValue.toFixed(2),
    },
    dailyStats: ordersByDay.map(d => ({
      date: d._id,
      orders: d.count,
      revenue: d.revenue?.toFixed(2) || '0.00',
    })),
  });
});

// Generate audit log report
export const generateAuditReport = asyncHandler(async (req: Request, res: Response) => {
  const { format = 'csv', action, category, startDate, endDate } = req.query;

  const query: Record<string, unknown> = {};
  if (action) {query.action = action;}
  if (category) {query.category = category;}
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) {(query.createdAt as Record<string, Date>).$gte = new Date(startDate as string);}
    if (endDate) {(query.createdAt as Record<string, Date>).$lte = new Date(endDate as string);}
  }

  const logs = await AuditLog.find(query)
    .populate('userId', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(10000)
    .lean();

  const data = logs.map(l => ({
    id: l._id.toString(),
    user: l.userId ? `${(l.userId as any).firstName} ${(l.userId as any).lastName}` : '-',
    userEmail: l.userId ? (l.userId as any).email : '-',
    action: l.action,
    category: l.category,
    resource: l.targetName || l.targetType || '-',
    ipAddress: l.ipAddress || '-',
    createdAt: new Date(l.createdAt).toLocaleString('fr-FR'),
  }));

  if (format === 'csv') {
    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'user', label: 'Utilisateur' },
      { key: 'userEmail', label: 'Email' },
      { key: 'action', label: 'Action' },
      { key: 'category', label: 'Catégorie' },
      { key: 'resource', label: 'Ressource' },
      { key: 'ipAddress', label: 'IP' },
      { key: 'createdAt', label: 'Date' },
    ];

    const csv = toCSV(data, columns);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=audit_${formatDateForFile(new Date())}.csv`);
    res.send('\uFEFF' + csv);
    return;
  }

  res.json({
    title: 'Journal d\'Audit',
    generatedAt: new Date().toISOString(),
    totalCount: data.length,
    data: data.slice(0, 500),
    summary: {
      total: data.length,
      byAction: logs.reduce((acc, l) => {
        acc[l.action] = (acc[l.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byCategory: logs.reduce((acc, l) => {
        acc[l.category] = (acc[l.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    },
  });
});

// Get dashboard stats for reports section
export const getReportStats = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    totalRestaurants,
    totalUsers,
    monthlyOrders,
    lastMonthOrders,
    monthlyRevenue,
    lastMonthRevenue,
  ] = await Promise.all([
    Restaurant.countDocuments(),
    User.countDocuments({ role: { $ne: 'superadmin' } }),
    Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Order.countDocuments({ createdAt: { $gte: startOfLastMonth, $lt: startOfMonth } }),
    Order.aggregate([
      { $match: { createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
    Order.aggregate([
      { $match: { createdAt: { $gte: startOfLastMonth, $lt: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]),
  ]);

  const currentRevenue = monthlyRevenue[0]?.total || 0;
  const previousRevenue = lastMonthRevenue[0]?.total || 0;
  const revenueGrowth = previousRevenue > 0
    ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
    : '0';
  const orderGrowth = lastMonthOrders > 0
    ? ((monthlyOrders - lastMonthOrders) / lastMonthOrders * 100).toFixed(1)
    : '0';

  res.json({
    totalRestaurants,
    totalUsers,
    monthlyOrders,
    monthlyRevenue: currentRevenue.toFixed(2),
    revenueGrowth: parseFloat(revenueGrowth),
    orderGrowth: parseFloat(orderGrowth),
  });
});
